import { type Server } from "node:http";
import crypto from "crypto";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";
import session from "express-session";

declare module 'express-session' {
  interface SessionData {
    user: any;
  }
}

import { registerRoutes } from "./routes";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

const magicTokens = new Map<
  string,
  { email: string; expiresAt: number }
>();

const loginAttempts = new Map<
  string,
  { count: number; resetAt: number }
>();

const BLOCKED_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com"
];

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_TTL = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: "magic_session",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Add route guard for unauthenticated users
  if (path === "/" && !req.session.user) {
    return res.redirect("/login");
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  // Login routes
  app.get("/login", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Login</title>
      </head>
      <body>
        <h2>Email Login</h2>
        <form method="POST" action="/login">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
          />
          <button type="submit">Send login link</button>
        </form>
      </body>
    </html>
  `);
  });

  app.post("/login", (req, res) => {
    const email = String(req.body.email || "").toLowerCase();
    const ip = req.ip || "unknown";

    if (!checkRateLimit(ip)) {
      return res.send("Too many login attempts. Try again later.");
    }

    if (!email || !email.includes("@")) {
      return res.send("Invalid email address");
    }

    const domain = email.split("@")[1];
    if (BLOCKED_DOMAINS.includes(domain)) {
      return res.send("Disposable email addresses are not allowed");
    }

    const token = crypto.randomBytes(32).toString("hex");

    magicTokens.set(token, {
      email,
      expiresAt: Date.now() + TOKEN_TTL
    });

    const baseUrl =
      process.env.REPLIT_URL || "http://localhost:5000";

    console.log(
      `Magic login link for ${email}: ${baseUrl}/auth/magic?token=${token}`
    );

    res.send(
      "Login link generated. Check server console for the magic link."
    );
  });

  app.get("/auth/magic", (req, res) => {
    const token = String(req.query.token || "");
    const record = magicTokens.get(token);

    if (!record) {
      return res.send("Invalid or already used login link");
    }

    if (record.expiresAt < Date.now()) {
      magicTokens.delete(token);
      return res.send("Login link has expired");
    }

    const userId = crypto
      .createHash("sha256")
      .update(record.email)
      .digest("hex");

    req.session.user = {
      userId,
      email: record.email
    };

    magicTokens.delete(token);

    res.redirect("/");
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}
