import { type Server } from "node:http";
import crypto from "crypto";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

declare module 'express-session' {
  interface SessionData {
    user: {
      userId: string;
      email: string;
    };
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

app.set('trust proxy', true);
app.use(cookieParser());

const magicTokens = new Map<
  string,
  { email: string; expiresAt: number }
>();

const loginAttempts = new Map<
  string,
  { count: number; resetAt: number }
>();

const userCredits = new Map<string, number>();
const FREE_CREDITS = 50;

const BLOCKED_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com"
];

const MAX_ATTEMPTS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_TTL = 10 * 60 * 1000; // 10 minutes

const BASE_URL =
  process.env.REPLIT_URL ||
  "https://aefcb2d2-f841-4d8c-a1d7-463bdfce8cf5-00-152qx0nryu6ax.riker.replit.dev";

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + DAY_MS
    });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS_PER_DAY) {
    return false;
  }

  record.count += 1;
  return true;
}

function ensureCredits(userId: string) {
  if (!userCredits.has(userId)) {
    userCredits.set(userId, FREE_CREDITS);
  }
}

async function sendMagicLinkEmail(email: string, link: string) {
  try {
    await resend.emails.send({
      from: "Login <onboarding@resend.dev>",
      to: email,
      subject: "Your secure login link",
      html: `
        <p>Click the link below to log in:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 10 minutes.</p>
      `
    });
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    // Fallback to console log in dev if sending fails
    if (process.env.NODE_ENV !== "production") {
      console.log("Magic login link (fallback):", link);
    }
  }
}

function requireCredits(req: Request, res: Response, next: NextFunction) {
  const user = req.session.user;
  if (!user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login");
  }

  ensureCredits(user.userId);

  const remaining = userCredits.get(user.userId) || 0;
  if (remaining <= 0) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: "Free credits exhausted. Please upgrade." });
    }
    return res.status(403).send("Free credits exhausted. Please upgrade.");
  }

  next();
}

(app as any).requireCredits = requireCredits;
(app as any).userCredits = userCredits;

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
    if (!req.cookies?.deviceId) {
      const deviceId = crypto.randomUUID();
      res.cookie("deviceId", deviceId, {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
    }

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

  app.post("/login", async (req, res) => {
    const email = String(req.body.email || "").toLowerCase();
    const deviceId = req.cookies?.deviceId || "unknown-device";

    if (!checkRateLimit(deviceId)) {
      return res.send(
        "You have reached the maximum of 3 login attempts for today. Please try again tomorrow."
      );
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

    const baseUrl = BASE_URL;
    const magicLink = `${baseUrl}/auth/magic?token=${token}`;

    if (process.env.NODE_ENV === "production" || process.env.RESEND_API_KEY) {
      await sendMagicLinkEmail(email, magicLink);
    } else {
      console.log("Magic login link:", magicLink);
    }

    res.send(
      "Login link generated. Check your email (or server console in dev) for the magic link."
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

    ensureCredits(userId);

    magicTokens.delete(token);

    res.redirect("/");
  });

  app.get("/api/credits", (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    ensureCredits(user.userId);
    res.send({ credits: userCredits.get(user.userId) });
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
