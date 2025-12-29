import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type RankingResult,
  type LocalRankingResult,
  type Settings,
  type ScheduleInterval,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  getRankings(projectId: string): Promise<RankingResult[]>;
  getLatestRanking(projectId: string): Promise<RankingResult | undefined>;
  saveRanking(ranking: Omit<RankingResult, "id">): Promise<RankingResult>;

  getLocalRankings(projectId: string): Promise<LocalRankingResult[]>;
  getLatestLocalRanking(projectId: string): Promise<LocalRankingResult | undefined>;
  saveLocalRanking(ranking: Omit<LocalRankingResult, "id">): Promise<LocalRankingResult>;

  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<Settings>): Promise<Settings>;
  setOnSettingsChange(callback: (settings: Settings) => void): void;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private rankings: Map<string, RankingResult[]>;
  private localRankings: Map<string, LocalRankingResult[]>;
  private settings: Settings;
  private onSettingsChange?: (settings: Settings) => void;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.rankings = new Map();
    this.localRankings = new Map();
    this.settings = { scheduleInterval: 5 };
  }

  setOnSettingsChange(callback: (settings: Settings) => void): void {
    this.onSettingsChange = callback;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      keywords: insertProject.keywords || [],
      competitors: insertProject.competitors || [],
      status: insertProject.status || "draft",
      scheduleInterval: insertProject.scheduleInterval || "5",
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(
    id: string,
    updates: Partial<InsertProject>
  ): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject: Project = {
      ...project,
      ...updates,
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  async getRankings(projectId: string): Promise<RankingResult[]> {
    return this.rankings.get(projectId) || [];
  }

  async getLatestRanking(projectId: string): Promise<RankingResult | undefined> {
    const projectRankings = this.rankings.get(projectId) || [];
    if (projectRankings.length === 0) return undefined;
    return projectRankings[projectRankings.length - 1];
  }

  async saveRanking(ranking: Omit<RankingResult, "id">): Promise<RankingResult> {
    const id = randomUUID();
    const newRanking: RankingResult = { ...ranking, id };
    
    const projectRankings = this.rankings.get(ranking.projectId) || [];
    projectRankings.push(newRanking);
    this.rankings.set(ranking.projectId, projectRankings);
    
    return newRanking;
  }

  async getLocalRankings(projectId: string): Promise<LocalRankingResult[]> {
    return this.localRankings.get(projectId) || [];
  }

  async getLatestLocalRanking(projectId: string): Promise<LocalRankingResult | undefined> {
    const projectRankings = this.localRankings.get(projectId) || [];
    if (projectRankings.length === 0) return undefined;
    return projectRankings[projectRankings.length - 1];
  }

  async saveLocalRanking(ranking: Omit<LocalRankingResult, "id">): Promise<LocalRankingResult> {
    const id = randomUUID();
    const newRanking: LocalRankingResult = { ...ranking, id };
    
    const projectRankings = this.localRankings.get(ranking.projectId) || [];
    projectRankings.push(newRanking);
    this.localRankings.set(ranking.projectId, projectRankings);
    
    return newRanking;
  }

  async getSettings(): Promise<Settings> {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    this.settings = { ...this.settings, ...updates };
    if (this.onSettingsChange) {
      this.onSettingsChange({ ...this.settings });
    }
    return { ...this.settings };
  }
}

export const storage = new MemStorage();
