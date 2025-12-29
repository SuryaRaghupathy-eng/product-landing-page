import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, settingsSchema, type KeywordRanking, type LocalKeywordRanking, SCHEDULE_INTERVALS } from "@shared/schema";
import { z } from "zod";
import { trackKeywordRanking, trackLocalRanking } from "./serper";
import { getSchedulerStatus, getProjectSchedulerStatus, updateProjectScheduler, removeProjectScheduler } from "./scheduler";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const parseResult = insertProjectSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      const project = await storage.createProject(parseResult.data);
      await updateProjectScheduler(project.id);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      const partialSchema = insertProjectSchema.partial();
      const parseResult = partialSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      if (parseResult.data.scheduleInterval) {
        const intervalNum = parseInt(parseResult.data.scheduleInterval, 10);
        if (!SCHEDULE_INTERVALS.includes(intervalNum as any)) {
          return res.status(400).json({ 
            error: "Invalid schedule interval. Must be one of: " + SCHEDULE_INTERVALS.join(", ") 
          });
        }
      }

      const updatedProject = await storage.updateProject(id, parseResult.data);
      if (parseResult.data.scheduleInterval) {
        await updateProjectScheduler(id);
      }
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      const partialSchema = insertProjectSchema.partial();
      const parseResult = partialSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      if (parseResult.data.scheduleInterval) {
        const intervalNum = parseInt(parseResult.data.scheduleInterval, 10);
        if (!SCHEDULE_INTERVALS.includes(intervalNum as any)) {
          return res.status(400).json({ 
            error: "Invalid schedule interval. Must be one of: " + SCHEDULE_INTERVALS.join(", ") 
          });
        }
      }

      const updatedProject = await storage.updateProject(id, parseResult.data);
      if (parseResult.data.scheduleInterval) {
        await updateProjectScheduler(id);
      }
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      await removeProjectScheduler(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/rankings", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      const rankings = await storage.getRankings(id);
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rankings" });
    }
  });

  app.get("/api/projects/:id/rankings/latest", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      const latestRanking = await storage.getLatestRanking(id);
      res.json(latestRanking || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest ranking" });
    }
  });

  app.post("/api/projects/:id/rankings/check", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!project.keywords || project.keywords.length === 0) {
        return res.status(400).json({ error: "No keywords to check" });
      }

      const rankings: KeywordRanking[] = [];
      const checkedAt = new Date().toISOString();

      for (const keyword of project.keywords) {
        try {
          const result = await trackKeywordRanking(keyword.text, project.websiteUrl, project.country);
          
          rankings.push({
            keywordId: keyword.id,
            keyword: keyword.text,
            found: result.found,
            position: result.overallPosition,
            page: result.page,
            positionOnPage: result.positionOnPage,
            url: result.url,
            title: result.title,
            checkedAt,
            error: result.error,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Error checking ranking for keyword "${keyword.text}":`, errorMessage);
          rankings.push({
            keywordId: keyword.id,
            keyword: keyword.text,
            found: false,
            position: null,
            page: null,
            positionOnPage: null,
            url: null,
            title: null,
            checkedAt,
            error: errorMessage,
          });
        }
      }

      const savedRanking = await storage.saveRanking({
        projectId: id,
        rankings,
        checkedAt,
      });

      res.json(savedRanking);
    } catch (error) {
      console.error("Error checking rankings:", error);
      res.status(500).json({ error: "Failed to check rankings" });
    }
  });

  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const parseResult = settingsSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      const updatedSettings = await storage.updateSettings(parseResult.data);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/scheduler/status", (_req, res) => {
    try {
      const status = getSchedulerStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduler status" });
    }
  });

  app.get("/api/projects/:id/scheduler/status", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      const status = getProjectSchedulerStatus(id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project scheduler status" });
    }
  });

  app.get("/api/projects/:id/local-rankings", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      const rankings = await storage.getLocalRankings(id);
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch local rankings" });
    }
  });

  app.get("/api/projects/:id/local-rankings/latest", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      const latestRanking = await storage.getLatestLocalRanking(id);
      res.json(latestRanking || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest local ranking" });
    }
  });

  app.post("/api/projects/:id/local-rankings/check", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!project.keywords || project.keywords.length === 0) {
        return res.status(400).json({ error: "No keywords to check" });
      }

      const rankings: LocalKeywordRanking[] = [];
      const checkedAt = new Date().toISOString();

      for (const keyword of project.keywords) {
        try {
          const result = await trackLocalRanking(keyword.text, project.websiteUrl, project.country);
          
          rankings.push({
            keywordId: keyword.id,
            keyword: keyword.text,
            found: result.found,
            totalPlaces: result.totalPlaces,
            matchingPlaces: result.matchingPlaces,
            checkedAt,
            error: result.error,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Error checking local ranking for keyword "${keyword.text}":`, errorMessage);
          rankings.push({
            keywordId: keyword.id,
            keyword: keyword.text,
            found: false,
            totalPlaces: 0,
            matchingPlaces: [],
            checkedAt,
            error: errorMessage,
          });
        }
      }

      const savedRanking = await storage.saveLocalRanking({
        projectId: id,
        rankings,
        checkedAt,
      });

      res.json(savedRanking);
    } catch (error) {
      console.error("Error checking local rankings:", error);
      res.status(500).json({ error: "Failed to check local rankings" });
    }
  });

  return httpServer;
}
