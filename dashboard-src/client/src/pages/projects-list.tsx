import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  MapPin,
  Search,
  Plus,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Project } from "@shared/schema";
import { countries } from "@shared/schema";

function getCountryName(code: string): string {
  return countries.find((c) => c.code === code)?.name || code;
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function SiteFavicon({ url, size = 24 }: { url: string; size?: number }) {
  const domain = getDomainFromUrl(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`;
  
  return (
    <img
      src={faviconUrl}
      alt=""
      width={size}
      height={size}
      className="rounded-sm"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-9" />
        </div>
      </header>
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-5xl space-y-6 px-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProjectsList() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background" data-testid="page-projects-list">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">R</span>
            </div>
            <span className="text-xl font-semibold">RankTracker</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-5xl space-y-6 px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground">
                Manage your SEO tracking projects
              </p>
            </div>
            <Link href="/new">
              <Button className="gap-2" data-testid="button-new-project">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>

          {hasProjects ? (
            <div className="space-y-3">
              {projects.map((project) => {
                const keywordCount = project.keywords?.length || 0;

                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <Card className="hover-elevate cursor-pointer transition-colors" data-testid={`card-project-${project.id}`}>
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <SiteFavicon url={project.websiteUrl} size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" data-testid={`text-project-name-${project.id}`}>
                              {project.name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {getDomainFromUrl(project.websiteUrl)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Search className="h-4 w-4" />
                              <span>{keywordCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{getCountryName(project.country)}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                            Active
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first SEO tracking project to get started
                </p>
                <Link href="/new">
                  <Button className="mt-6 gap-2" data-testid="button-create-first-project">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
