import express, { type Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { coordinateSchema, insertFavoriteSchema } from "@shared/schema";
import path from "path";

const geocodeCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000;
const GLOBAL_RATE_LIMIT_DELAY = 1000;
let lastGeocodingRequest = 0;

interface RateLimitInfo {
  tokens: number;
  lastRefill: number;
}

const clientRateLimits = new Map<string, RateLimitInfo>();
const MAX_TOKENS = 10;
const REFILL_RATE = 2;
const REFILL_INTERVAL = 1000;

function getClientIdentifier(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  let limitInfo = clientRateLimits.get(clientId);

  if (!limitInfo) {
    limitInfo = { tokens: MAX_TOKENS, lastRefill: now };
    clientRateLimits.set(clientId, limitInfo);
  }

  const timePassed = now - limitInfo.lastRefill;
  const refillAmount = Math.floor(timePassed / REFILL_INTERVAL) * REFILL_RATE;
  
  if (refillAmount > 0) {
    limitInfo.tokens = Math.min(MAX_TOKENS, limitInfo.tokens + refillAmount);
    limitInfo.lastRefill = now;
  }

  if (limitInfo.tokens >= 1) {
    limitInfo.tokens -= 1;
    
    if (clientRateLimits.size > 10000) {
      const oldestKey = clientRateLimits.keys().next().value;
      if (oldestKey) {
        clientRateLimits.delete(oldestKey);
      }
    }
    
    return true;
  }

  return false;
}

async function rateLimitedGeocode(url: string): Promise<any> {
  const cacheKey = url;
  const cached = geocodeCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodingRequest;
  
  if (timeSinceLastRequest < GLOBAL_RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, GLOBAL_RATE_LIMIT_DELAY - timeSinceLastRequest));
  }

  lastGeocodingRequest = Date.now();

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MapNavigator/1.0 (Replit)',
      'Referer': 'https://replit.com',
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    throw new Error("Geocoding service unavailable");
  }

  const data = await response.json();
  geocodeCache.set(cacheKey, { data, timestamp: Date.now() });

  if (geocodeCache.size > 1000) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) {
      geocodeCache.delete(firstKey);
    }
  }

  return data;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const requireCreditsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requireCredits = (app as any).requireCredits;
    if (requireCredits) {
      return requireCredits(req, res, next);
    }
    next();
  };

  // Serve dashboard static files
  app.use("/dashboard", express.static(path.resolve(process.cwd(), "dashboard")));
  
  // Handle dashboard client-side routing (SPA fallback)
  app.get("/dashboard/*", (req, res) => {
    res.sendFile(path.resolve(process.cwd(), "dashboard", "index.html"));
  });

  app.post("/api/validate-coordinates", async (req, res) => {
    try {
      const result = coordinateSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid coordinates",
          details: result.error.errors,
        });
      }

      return res.json({
        valid: true,
        coordinates: result.data,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  app.get("/api/favorites", async (req, res) => {
    try {
      const allFavorites = await storage.getFavorites();
      return res.json(allFavorites);
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
      return res.status(500).json({
        error: "Failed to fetch favorites",
        details: error?.message,
      });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const result = insertFavoriteSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid favorite data",
          details: result.error.errors,
        });
      }

      const newFavorite = await storage.createFavorite(result.data);
      return res.json(newFavorite);
    } catch (error) {
      return res.status(500).json({
        error: "Failed to save favorite",
      });
    }
  });

  app.delete("/api/favorites/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFavorite(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Favorite not found",
        });
      }
      
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to delete favorite",
      });
    }
  });

  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const clientId = getClientIdentifier(req);
      
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait before making more requests.",
        });
      }

      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({
          error: "Missing latitude or longitude",
        });
      }

      const latNum = parseFloat(lat as string);
      const lonNum = parseFloat(lon as string);

      if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
        return res.status(400).json({
          error: "Invalid coordinates",
        });
      }

      const data = await rateLimitedGeocode(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lonNum}&addressdetails=1`
      );

      return res.json(data);
    } catch (error: any) {
      return res.status(error.message.includes("Rate limit") ? 429 : 500).json({
        error: error.message || "Failed to reverse geocode",
      });
    }
  });

  app.get("/api/geocode/search", async (req, res) => {
    try {
      const clientId = getClientIdentifier(req);
      
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait before making more requests.",
        });
      }

      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: "Missing search query",
        });
      }

      if (q.length > 200) {
        return res.status(400).json({
          error: "Search query too long",
        });
      }

      const ukPostcodePattern = /[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i;
      const isUKAddress = q.toLowerCase().includes('uk') || 
                          q.toLowerCase().includes('united kingdom') ||
                          q.toLowerCase().includes('england') ||
                          q.toLowerCase().includes('scotland') ||
                          q.toLowerCase().includes('wales') ||
                          ukPostcodePattern.test(q);

      let baseUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5`;
      
      if (isUKAddress) {
        baseUrl += `&countrycodes=gb`;
      }

      let data = await rateLimitedGeocode(
        `${baseUrl}&q=${encodeURIComponent(q)}`
      );

      if ((!data || data.length === 0) && q.includes(',')) {
        const parts = q.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const simplifiedQuery = parts.slice(-3).join(', ');
          data = await rateLimitedGeocode(
            `${baseUrl}&q=${encodeURIComponent(simplifiedQuery)}`
          );
        }
      }

      if ((!data || data.length === 0) && ukPostcodePattern.test(q)) {
        const postcodeMatch = q.match(ukPostcodePattern);
        if (postcodeMatch) {
          data = await rateLimitedGeocode(
            `${baseUrl}&postalcode=${encodeURIComponent(postcodeMatch[0])}&countrycodes=gb`
          );
        }
      }

      return res.json(data || []);
    } catch (error: any) {
      return res.status(error.message.includes("Rate limit") ? 429 : 500).json({
        error: error.message || "Failed to search address",
      });
    }
  });

  app.get("/api/geocode/autocomplete", async (req, res) => {
    try {
      const clientId = getClientIdentifier(req);
      
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait before making more requests.",
        });
      }

      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      if (q.length < 3) {
        return res.json([]);
      }

      if (q.length > 200) {
        return res.status(400).json({
          error: "Search query too long",
        });
      }

      const ukPostcodePattern = /[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i;
      const isUKAddress = q.toLowerCase().includes('uk') || 
                          q.toLowerCase().includes('united kingdom') ||
                          q.toLowerCase().includes('england') ||
                          q.toLowerCase().includes('scotland') ||
                          q.toLowerCase().includes('wales') ||
                          ukPostcodePattern.test(q);

      let baseUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&dedupe=0`;
      
      if (isUKAddress) {
        baseUrl += `&countrycodes=gb`;
      }

      let data = await rateLimitedGeocode(
        `${baseUrl}&q=${encodeURIComponent(q)}`
      );

      if ((!data || data.length === 0) && q.includes(',')) {
        const parts = q.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const simplifiedQuery = parts.slice(-3).join(', ');
          data = await rateLimitedGeocode(
            `${baseUrl}&q=${encodeURIComponent(simplifiedQuery)}`
          );
        }
      }

      if ((!data || data.length === 0) && ukPostcodePattern.test(q)) {
        const postcodeMatch = q.match(ukPostcodePattern);
        if (postcodeMatch) {
          data = await rateLimitedGeocode(
            `${baseUrl}&postalcode=${encodeURIComponent(postcodeMatch[0])}&countrycodes=gb`
          );
        }
      }

      return res.json(data || []);
    } catch (error: any) {
      return res.status(error.message.includes("Rate limit") ? 429 : 500).json({
        error: error.message || "Failed to autocomplete",
      });
    }
  });

  app.post("/api/places/search", async (req, res) => {
    try {
      const { q, lat, lng, num = 20 } = req.body;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: "Missing search query",
        });
      }

      const SERPER_API_KEY = process.env.SERPER_API_KEY;
      
      if (!SERPER_API_KEY) {
        return res.status(500).json({
          error: "Serper API key not configured",
        });
      }

      const payload: any = {
        q,
        num: Math.min(num, 100),
      };

      if (lat && lng) {
        payload.ll = `@${lat},${lng},14z`;
      }

      const response = await fetch("https://google.serper.dev/places", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Serper API error:", errorText);
        return res.status(response.status).json({
          error: "Failed to search places",
          details: errorText,
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Places search error:", error);
      return res.status(500).json({
        error: "Failed to search places",
        details: error?.message,
      });
    }
  });

  app.post("/api/grid-search", requireCreditsMiddleware, async (req: Request, res: Response) => {
    try {
      const userCredits = (app as any).userCredits;
      
      const user = (req as any).session.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { gridPoints, keyword, targetWebsite } = req.body;
      
      if (!gridPoints || !Array.isArray(gridPoints) || gridPoints.length === 0) {
        return res.status(400).json({
          error: "Missing or invalid grid points",
        });
      }

      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({
          error: "Missing search keyword",
        });
      }

      const SERPER_API_KEY = process.env.SERPER_API_KEY;
      
      if (!SERPER_API_KEY) {
        return res.status(500).json({
          error: "Serper API key not configured",
        });
      }

      const normalizeWebsite = (url: string | undefined): string => {
        if (!url) return '';
        return url
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/$/, '')
          .split('/')[0]
          .split('?')[0];
      };

      const targetDomain = normalizeWebsite(targetWebsite);

      const searchGridPoint = async (point: { id: string; lat: number; lng: number; row: number; col: number }) => {
        try {
          // Use simple lat, lng format without @ prefix and zoom suffix for better results
          const payload = {
            q: keyword,
            ll: `${point.lat}, ${point.lng}`,
            type: "maps",
            num: 20,
          };

          console.log(`Searching point ${point.id}: ${JSON.stringify(payload)}`);

          const response = await fetch("https://google.serper.dev/maps", {
            method: "POST",
            headers: {
              "X-API-KEY": SERPER_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Serper API error for point ${point.id}:`, errorText);
            return {
              pointId: point.id,
              lat: point.lat,
              lng: point.lng,
              row: point.row,
              col: point.col,
              rank: null,
              matchedPlace: null,
              places: [],
              error: `API error: ${response.status}`,
            };
          }

          const data = await response.json();
          const places = data.places || [];

          console.log(`Point ${point.id}: Found ${places.length} places`);
          
          // Log the first few places and their websites for debugging
          if (places.length > 0) {
            const websitesFound = places.slice(0, 5).map((p: any, idx: number) => 
              `${idx + 1}. ${normalizeWebsite(p.website) || 'no-website'} (${p.title?.substring(0, 30)})`
            ).join(', ');
            console.log(`Point ${point.id} top websites: ${websitesFound}`);
          }

          let rank: number | null = null;
          let matchedPlace: any = null;

          if (targetDomain && places.length > 0) {
            console.log(`Point ${point.id}: Looking for target domain: "${targetDomain}"`);
            for (let i = 0; i < places.length; i++) {
              const placeDomain = normalizeWebsite(places[i].website);
              if (placeDomain && (placeDomain.includes(targetDomain) || targetDomain.includes(placeDomain))) {
                rank = places[i].position || (i + 1);
                matchedPlace = {
                  position: places[i].position,
                  title: places[i].title,
                  address: places[i].address,
                  rating: places[i].rating,
                  ratingCount: places[i].ratingCount,
                  type: places[i].type,
                  website: places[i].website,
                  phoneNumber: places[i].phoneNumber,
                  latitude: places[i].latitude,
                  longitude: places[i].longitude,
                };
                console.log(`Point ${point.id}: Found target at rank ${rank}`);
                break;
              }
            }
          }

          return {
            pointId: point.id,
            lat: point.lat,
            lng: point.lng,
            row: point.row,
            col: point.col,
            rank,
            matchedPlace,
            places: places.slice(0, 20).map((p: any) => ({
              position: p.position || 0,
              title: p.title || "",
              address: p.address || "",
              rating: p.rating,
              ratingCount: p.ratingCount,
              type: p.type || "",
              website: p.website || "",
              phoneNumber: p.phoneNumber || "",
              latitude: p.latitude,
              longitude: p.longitude,
            })),
          };
        } catch (error: any) {
          console.error(`Error searching point ${point.id}:`, error);
          return {
            pointId: point.id,
            lat: point.lat,
            lng: point.lng,
            row: point.row,
            col: point.col,
            rank: null,
            matchedPlace: null,
            places: [],
            error: error?.message || "Unknown error",
          };
        }
      };

      const batchSize = 5;
      const results: any[] = [];
      
      for (let i = 0; i < gridPoints.length; i += batchSize) {
        const batch = gridPoints.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(searchGridPoint));
        results.push(...batchResults);
        
        if (i + batchSize < gridPoints.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const rankedResults = results.filter(r => r.rank !== null);
      const avgRank = rankedResults.length > 0
        ? rankedResults.reduce((sum, r) => sum + r.rank, 0) / rankedResults.length
        : null;
      
      const top3Count = rankedResults.filter(r => r.rank <= 3).length;
      const top10Count = rankedResults.filter(r => r.rank <= 10).length;
      const top20Count = rankedResults.filter(r => r.rank <= 20).length;

      // Deduct credit only on successful tool usage
      if (userCredits) {
        const userId = user.userId;
        const remaining = userCredits.get(userId) || 0;
        userCredits.set(userId, remaining - 1);
        console.log(`User ${userId} used 1 credit. Remaining: ${remaining - 1}`);
      }

      return res.json({
        keyword,
        targetWebsite,
        totalPoints: gridPoints.length,
        summary: {
          avgRank: avgRank ? Math.round(avgRank * 10) / 10 : null,
          foundCount: rankedResults.length,
          notFoundCount: gridPoints.length - rankedResults.length,
          top3Count,
          top3Percent: Math.round((top3Count / gridPoints.length) * 100),
          top10Count,
          top10Percent: Math.round((top10Count / gridPoints.length) * 100),
          top20Count,
          top20Percent: Math.round((top20Count / gridPoints.length) * 100),
        },
        results,
      });
    } catch (error: any) {
      console.error("Grid search error:", error);
      return res.status(500).json({
        error: "Failed to perform grid search",
        details: error?.message,
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
