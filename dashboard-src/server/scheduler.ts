import { storage } from "./storage";
import { trackKeywordRanking } from "./serper";
import type { KeywordRanking, Project } from "@shared/schema";

interface ProjectScheduler {
  intervalId: NodeJS.Timeout | null;
  intervalDays: number;
  lastCheckTime: Date | null;
  startTime: Date | null;
}

const projectSchedulers: Map<string, ProjectScheduler> = new Map();
let isRunning = false;

function logScheduler(message: string): void {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [scheduler] ${message}`);
}

async function checkProjectRankings(project: Project): Promise<void> {
  if (!project.keywords || project.keywords.length === 0) {
    logScheduler(`Skipping project "${project.name}" - no keywords`);
    return;
  }

  try {
    const rankings: KeywordRanking[] = [];
    const checkedAt = new Date().toISOString();

    logScheduler(`Checking ${project.keywords.length} keyword(s) for project "${project.name}"`);

    for (const keyword of project.keywords) {
      try {
        const result = await trackKeywordRanking(
          keyword.text,
          project.websiteUrl,
          project.country
        );

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
        logScheduler(`Error checking keyword "${keyword.text}": ${errorMessage}`);
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

    await storage.saveRanking({
      projectId: project.id,
      rankings,
      checkedAt,
    });

    const scheduler = projectSchedulers.get(project.id);
    if (scheduler) {
      scheduler.lastCheckTime = new Date();
    }

    logScheduler(`Completed ranking check for project "${project.name}" - ${rankings.length} keywords checked`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logScheduler(`Error processing project "${project.name}": ${errorMessage}`);
  }
}

function startProjectScheduler(project: Project): void {
  const projectId = project.id;
  const intervalDays = parseInt(project.scheduleInterval || "5", 10);
  
  const existingScheduler = projectSchedulers.get(projectId);
  if (existingScheduler?.intervalId) {
    clearInterval(existingScheduler.intervalId);
  }

  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const intervalLabel = intervalDays === 1 ? "1 day" : `${intervalDays} days`;
  
  logScheduler(`Setting up scheduler for project "${project.name}" (every ${intervalLabel})`);

  const intervalId = setInterval(async () => {
    const currentProject = await storage.getProject(projectId);
    if (currentProject) {
      await checkProjectRankings(currentProject);
    }
  }, intervalMs);

  projectSchedulers.set(projectId, {
    intervalId,
    intervalDays,
    lastCheckTime: null,
    startTime: new Date(),
  });
}

function stopProjectScheduler(projectId: string): void {
  const scheduler = projectSchedulers.get(projectId);
  if (scheduler?.intervalId) {
    clearInterval(scheduler.intervalId);
    projectSchedulers.delete(projectId);
    logScheduler(`Stopped scheduler for project ${projectId}`);
  }
}

export async function startScheduler(): Promise<void> {
  const projects = await storage.getProjects();
  
  if (projects.length === 0) {
    logScheduler("No projects found - scheduler will start when projects are created");
    return;
  }

  for (const project of projects) {
    startProjectScheduler(project);
  }
  
  logScheduler(`Scheduler started for ${projects.length} project(s)`);
}

export function stopScheduler(): void {
  Array.from(projectSchedulers.keys()).forEach(projectId => {
    stopProjectScheduler(projectId);
  });
  logScheduler("All project schedulers stopped");
}

export async function updateProjectScheduler(projectId: string): Promise<void> {
  const project = await storage.getProject(projectId);
  if (project) {
    startProjectScheduler(project);
  }
}

export async function removeProjectScheduler(projectId: string): Promise<void> {
  stopProjectScheduler(projectId);
}

export async function runImmediateCheck(): Promise<void> {
  if (isRunning) {
    logScheduler("Previous ranking check still in progress, skipping");
    return;
  }

  isRunning = true;
  try {
    const projects = await storage.getProjects();
    
    if (projects.length === 0) {
      logScheduler("No projects to check rankings for");
      return;
    }

    logScheduler(`Starting immediate ranking check for ${projects.length} project(s)`);

    for (const project of projects) {
      await checkProjectRankings(project);
    }

    logScheduler("Immediate ranking check completed");
  } finally {
    isRunning = false;
  }
}

export function getSchedulerStatus(): {
  isRunning: boolean;
  intervalMinutes: number;
  lastCheckTime: string | null;
  nextCheckTime: string | null;
} {
  let lastCheckTime: Date | null = null;
  let totalIntervalMinutes = 0;
  let projectCount = 0;

  const schedulers = Array.from(projectSchedulers.values());
  
  for (const scheduler of schedulers) {
    projectCount++;
    totalIntervalMinutes += scheduler.intervalDays * 24 * 60;
    if (scheduler.lastCheckTime && (!lastCheckTime || scheduler.lastCheckTime > lastCheckTime)) {
      lastCheckTime = scheduler.lastCheckTime;
    }
  }

  const avgIntervalMinutes = projectCount > 0 ? totalIntervalMinutes / projectCount : 5 * 24 * 60;

  let nextCheckTime: string | null = null;
  for (const scheduler of schedulers) {
    if (scheduler.startTime && scheduler.intervalId) {
      const intervalMs = scheduler.intervalDays * 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const startTime = scheduler.startTime.getTime();
      const elapsed = now - startTime;
      const intervalsPassed = Math.floor(elapsed / intervalMs);
      const nextMs = startTime + ((intervalsPassed + 1) * intervalMs);
      const projectNextCheck = new Date(nextMs).toISOString();
      
      if (!nextCheckTime || projectNextCheck < nextCheckTime) {
        nextCheckTime = projectNextCheck;
      }
    }
  }

  return {
    isRunning: projectSchedulers.size > 0,
    intervalMinutes: avgIntervalMinutes,
    lastCheckTime: lastCheckTime?.toISOString() || null,
    nextCheckTime,
  };
}

export function getProjectSchedulerStatus(projectId: string): {
  isRunning: boolean;
  intervalMinutes: number;
  lastCheckTime: string | null;
  nextCheckTime: string | null;
} {
  const scheduler = projectSchedulers.get(projectId);
  
  if (!scheduler) {
    return {
      isRunning: false,
      intervalMinutes: 5 * 24 * 60,
      lastCheckTime: null,
      nextCheckTime: null,
    };
  }

  const intervalMinutes = scheduler.intervalDays * 24 * 60;
  let nextCheckTime: string | null = null;

  if (scheduler.startTime && scheduler.intervalId) {
    const intervalMs = scheduler.intervalDays * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const startTime = scheduler.startTime.getTime();
    const elapsed = now - startTime;
    const intervalsPassed = Math.floor(elapsed / intervalMs);
    const nextMs = startTime + ((intervalsPassed + 1) * intervalMs);
    nextCheckTime = new Date(nextMs).toISOString();
  }

  return {
    isRunning: !!scheduler.intervalId,
    intervalMinutes,
    lastCheckTime: scheduler.lastCheckTime?.toISOString() || null,
    nextCheckTime,
  };
}
