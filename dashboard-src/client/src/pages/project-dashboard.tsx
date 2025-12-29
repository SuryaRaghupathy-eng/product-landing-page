import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Globe,
  MapPin,
  Search,
  Settings,
  TrendingUp,
  ArrowLeft,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, RankingResult, LocalRankingResult } from "@shared/schema";
import { countries, SCHEDULE_INTERVALS, SCHEDULE_INTERVAL_LABELS, ScheduleInterval } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function getCountryName(code: string): string {
  return countries.find((c) => c.code === code)?.name || code;
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-9" />
        </div>
      </header>
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl space-y-8 px-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: latestRanking, isLoading: isLoadingRanking } = useQuery<RankingResult | null>({
    queryKey: ["/api/projects", id, "rankings", "latest"],
    enabled: !!id,
    refetchInterval: 30000, // Poll every 30 seconds to pick up scheduler updates
  });

  const { data: allRankings } = useQuery<RankingResult[]>({
    queryKey: ["/api/projects", id, "rankings"],
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: latestLocalRanking, isLoading: isLoadingLocalRanking } = useQuery<LocalRankingResult | null>({
    queryKey: ["/api/projects", id, "local-rankings", "latest"],
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: allLocalRankings } = useQuery<LocalRankingResult[]>({
    queryKey: ["/api/projects", id, "local-rankings"],
    enabled: !!id,
    refetchInterval: 30000,
  });

  // Filter rankings by date range for comparison
  const filteredRankings = allRankings?.filter((ranking) => {
    if (!dateRange?.from) return true;
    const rankingDate = parseISO(ranking.checkedAt);
    return isWithinInterval(rankingDate, {
      start: dateRange.from,
      end: dateRange.to || new Date(),
    });
  }) || [];

  // Get the oldest ranking within the date range for comparison (start of range)
  const comparisonRanking = filteredRankings.length >= 2 
    ? filteredRankings[0] 
    : null;
  
  // Get the newest ranking within the date range for displaying current position
  const currentRankingInRange = filteredRankings.length >= 1
    ? filteredRankings[filteredRankings.length - 1]
    : null;

  // Use the filtered current ranking for display if we have a date range set, otherwise use latest
  const displayRanking = dateRange?.from && currentRankingInRange ? currentRankingInRange : latestRanking;

  // Get the previous ranking (second most recent) for showing change from last check
  const previousRanking = allRankings && allRankings.length >= 2 
    ? allRankings[allRankings.length - 2] 
    : null;

  // Helper function to get position change comparing current to previous check (or date range comparison)
  const getPositionChange = (keywordId: string, currentPosition: number | null): { change: number | null; direction: 'up' | 'down' | 'same' | null } => {
    // Use comparisonRanking if date range is set, otherwise use previousRanking for last check comparison
    const rankingToCompare = comparisonRanking || previousRanking;
    
    if (!rankingToCompare || currentPosition === null) {
      return { change: null, direction: null };
    }
    
    const prevRanking = rankingToCompare.rankings.find(r => r.keywordId === keywordId);
    if (!prevRanking || prevRanking.position === null) {
      return { change: null, direction: null };
    }
    
    const change = prevRanking.position - currentPosition; // Positive = improved (went up in rank)
    if (change > 0) return { change, direction: 'up' };
    if (change < 0) return { change: Math.abs(change), direction: 'down' };
    return { change: 0, direction: 'same' };
  };

  const checkRankingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${id}/rankings/check`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "rankings", "latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "rankings"] });
      toast({
        title: "Rankings checked",
        description: "Your keyword rankings have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to check rankings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkLocalRankingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${id}/local-rankings/check`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "local-rankings", "latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "local-rankings"] });
      toast({
        title: "Local rankings checked",
        description: "Your local pack rankings have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to check local rankings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  interface SchedulerStatus {
    isRunning: boolean;
    intervalMinutes: number;
    lastCheckTime: string | null;
    nextCheckTime: string | null;
  }

  const { data: schedulerStatus } = useQuery<SchedulerStatus>({
    queryKey: ["/api/projects", id, "scheduler", "status"],
    enabled: !!id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const updateProjectIntervalMutation = useMutation({
    mutationFn: async (scheduleInterval: string) => {
      const response = await apiRequest("PUT", `/api/projects/${id}`, { scheduleInterval });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "scheduler", "status"] });
      const intervalLabel = SCHEDULE_INTERVAL_LABELS[parseInt(data.scheduleInterval) as ScheduleInterval] || `every ${data.scheduleInterval} days`;
      toast({
        title: "Settings updated",
        description: `Rankings for this project will now be checked ${intervalLabel.toLowerCase()}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportOrganicRankings = () => {
    if (!project || !displayRanking) return;
    
    const headers = ['Keyword', 'Position', 'Page', 'Position on Page', 'URL', 'Found', 'Checked At'];
    const rows = project.keywords?.map((keyword) => {
      const ranking = displayRanking.rankings.find(r => r.keywordId === keyword.id);
      return [
        `"${keyword.text}"`,
        ranking?.position ?? 'N/A',
        ranking?.page ?? 'N/A',
        ranking?.positionOnPage ?? 'N/A',
        ranking?.url ? `"${ranking.url}"` : 'N/A',
        ranking?.found ? 'Yes' : 'No',
        new Date(displayRanking.checkedAt).toLocaleString()
      ].join(',');
    }) || [];
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `organic-rankings-${project.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCSV(filename, csvContent);
    
    toast({
      title: "Export complete",
      description: "Organic rankings have been exported to CSV.",
    });
  };

  const exportLocalRankings = () => {
    if (!project || !latestLocalRanking) return;
    
    const headers = ['Keyword', 'Found in Local Pack', 'Position', 'Business Name', 'Address', 'Rating', 'Reviews', 'Website', 'Checked At'];
    const rows: string[] = [];
    
    project.keywords?.forEach((keyword) => {
      const ranking = latestLocalRanking.rankings.find(r => r.keywordId === keyword.id);
      if (ranking?.found && ranking.matchingPlaces.length > 0) {
        ranking.matchingPlaces.forEach((place) => {
          rows.push([
            `"${keyword.text}"`,
            'Yes',
            place.position,
            `"${place.title}"`,
            place.address ? `"${place.address}"` : 'N/A',
            place.rating ?? 'N/A',
            place.reviews ?? 'N/A',
            place.website ? `"${place.website}"` : 'N/A',
            new Date(latestLocalRanking.checkedAt).toLocaleString()
          ].join(','));
        });
      } else {
        rows.push([
          `"${keyword.text}"`,
          'No',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          ranking ? new Date(latestLocalRanking.checkedAt).toLocaleString() : 'Not checked'
        ].join(','));
      }
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `local-rankings-${project.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCSV(filename, csvContent);
    
    toast({
      title: "Export complete",
      description: "Local rankings have been exported to CSV.",
    });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/">
          <Button variant="ghost" className="mt-4">
            Go back
          </Button>
        </Link>
      </div>
    );
  }

  const keywordCount = project.keywords?.length || 0;

  // Calculate ranking statistics
  const rankingStats = (() => {
    if (!latestRanking?.rankings) {
      return { avgPosition: null, top3: 0, top10: 0, top20: 0 };
    }
    
    const rankedKeywords = latestRanking.rankings.filter(r => r.found && r.position !== null);
    if (rankedKeywords.length === 0) {
      return { avgPosition: null, top3: 0, top10: 0, top20: 0 };
    }
    
    const positions = rankedKeywords.map(r => r.position as number);
    const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
    const top3 = positions.filter(p => p <= 3).length;
    const top10 = positions.filter(p => p <= 10).length;
    const top20 = positions.filter(p => p <= 20).length;
    
    return { avgPosition: Math.round(avgPosition * 10) / 10, top3, top10, top20 };
  })();

  return (
    <div className="flex min-h-screen flex-col bg-background" data-testid="page-project-dashboard">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">R</span>
            </div>
            <span className="text-xl font-semibold">RankTracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-projects">
                <ArrowLeft className="h-4 w-4" />
                Projects
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl space-y-8 px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                <SiteFavicon url={project.websiteUrl} size={28} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-project-name">
                    {project.name}
                  </h1>
                  <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                    Active
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground hover:underline"
                    data-testid="link-website-url"
                  >
                    {getDomainFromUrl(project.websiteUrl)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-settings">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Scheduler Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure how often rankings are automatically checked.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-interval" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Check Interval
                      </Label>
                      <Select
                        value={project?.scheduleInterval || "5"}
                        onValueChange={(value) => {
                          updateProjectIntervalMutation.mutate(value);
                        }}
                        disabled={updateProjectIntervalMutation.isPending}
                      >
                        <SelectTrigger id="schedule-interval" data-testid="select-schedule-interval">
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_INTERVALS.map((interval) => (
                            <SelectItem key={interval} value={interval.toString()} data-testid={`option-interval-${interval}`}>
                              {SCHEDULE_INTERVAL_LABELS[interval]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Schedule Status</h4>
                      <div className="space-y-1 text-sm">
                        {schedulerStatus?.lastCheckTime && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Last check:</span>
                            <span data-testid="text-last-check-time">
                              {new Date(schedulerStatus.lastCheckTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {schedulerStatus?.nextCheckTime && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Next check:</span>
                            <span className="font-medium text-primary" data-testid="text-next-check-time">
                              {new Date(schedulerStatus.nextCheckTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {!schedulerStatus?.isRunning && (
                          <p className="text-xs text-muted-foreground">
                            Scheduler not running. Restart the server to enable automatic checks.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                size="sm" 
                className="gap-2" 
                data-testid="button-check-rankings"
                onClick={() => checkRankingsMutation.mutate()}
                disabled={checkRankingsMutation.isPending || (project.keywords?.length || 0) === 0}
              >
                {checkRankingsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {checkRankingsMutation.isPending ? "Checking..." : "Check Rankings"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card data-testid="card-keywords">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Keywords</p>
                    <p className="text-xl font-semibold" data-testid="text-keyword-count">
                      {keywordCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-position">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
                    <TrendingUp className="h-5 w-5 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Position</p>
                    <p className="text-xl font-semibold" data-testid="text-avg-position">
                      {rankingStats.avgPosition !== null ? `#${rankingStats.avgPosition}` : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-top3">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">T3</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Top 3</p>
                    <p className="text-xl font-semibold" data-testid="text-top3">
                      {rankingStats.top3}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-top10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">T10</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Top 10</p>
                    <p className="text-xl font-semibold" data-testid="text-top10">
                      {rankingStats.top10}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-top20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">T20</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Top 20</p>
                    <p className="text-xl font-semibold" data-testid="text-top20">
                      {rankingStats.top20}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-location">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                    <MapPin className="h-5 w-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-semibold truncate" data-testid="text-country">
                      {getCountryName(project.country)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="organic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="organic" className="gap-2" data-testid="tab-organic">
                <Globe className="h-4 w-4" />
                Organic Rankings
              </TabsTrigger>
              <TabsTrigger value="local" className="gap-2" data-testid="tab-local">
                <MapPin className="h-4 w-4" />
                Local Rankings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organic" className="mt-4">
              <Card data-testid="card-keywords-rankings">
                <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-lg font-medium">Organic Rankings</CardTitle>
                    {displayRanking && (
                      <span className="text-xs text-muted-foreground">
                        {comparisonRanking 
                          ? "Comparing: " 
                          : previousRanking 
                            ? "vs previous: " 
                            : "Last checked: "}
                        {new Date(displayRanking.checkedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-date-range">
                          <CalendarIcon className="h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                              </>
                            ) : (
                              format(dateRange.from, "MMM d, yyyy")
                            )
                          ) : (
                            "Compare dates"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <div className="p-3 border-b">
                          <p className="text-sm font-medium">Compare Rankings</p>
                          <p className="text-xs text-muted-foreground">Select a date range to compare ranking changes</p>
                        </div>
                        <Calendar
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={1}
                          disabled={{ after: new Date() }}
                        />
                        <div className="flex gap-2 p-3 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                            data-testid="button-last-7-days"
                          >
                            Last 7 days
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                            data-testid="button-last-30-days"
                          >
                            Last 30 days
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1" 
                      data-testid="button-export-organic"
                      onClick={exportOrganicRankings}
                      disabled={!displayRanking || keywordCount === 0}
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Link href={`/projects/${id}/keywords`}>
                      <Button variant="ghost" size="sm" className="gap-1" data-testid="button-add-keyword">
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingRanking ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : keywordCount > 0 ? (
                    <div className="space-y-2">
                      {project.keywords?.map((keyword, index) => {
                        const ranking = displayRanking?.rankings.find(r => r.keywordId === keyword.id);
                        return (
                          <div
                            key={keyword.id || index}
                            className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2"
                            data-testid={`row-keyword-${index}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate flex-1 mr-2">{keyword.text}</span>
                              <div className="flex items-center gap-2">
                                {ranking ? (
                                  ranking.error ? (
                                    <Badge variant="destructive" className="gap-1" title={ranking.error}>
                                      <XCircle className="h-3 w-3" />
                                      Error
                                    </Badge>
                                  ) : ranking.found && ranking.position !== null ? (
                                    <>
                                      {(() => {
                                        const posChange = getPositionChange(keyword.id, ranking.position);
                                        if (posChange.direction === 'up' && posChange.change !== null && posChange.change > 0) {
                                          return (
                                            <Badge variant="outline" className="gap-1 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700" data-testid={`badge-change-${index}`}>
                                              <ArrowUp className="h-3 w-3" />
                                              {posChange.change}
                                            </Badge>
                                          );
                                        }
                                        if (posChange.direction === 'down' && posChange.change !== null && posChange.change > 0) {
                                          return (
                                            <Badge variant="outline" className="gap-1 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700" data-testid={`badge-change-${index}`}>
                                              <ArrowDown className="h-3 w-3" />
                                              {posChange.change}
                                            </Badge>
                                          );
                                        }
                                        if (posChange.direction === 'same') {
                                          return (
                                            <Badge variant="outline" className="gap-1 text-muted-foreground" data-testid={`badge-change-${index}`}>
                                              <Minus className="h-3 w-3" />
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}
                                      <Badge variant="default" className="gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        #{ranking.position}
                                      </Badge>
                                    </>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1">
                                      <XCircle className="h-3 w-3" />
                                      Not in top 50
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Not checked
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {ranking?.found && ranking.page !== null && ranking.positionOnPage !== null && (
                              <div className="text-xs text-muted-foreground">
                                Page {ranking.page}, position {ranking.positionOnPage}
                                {ranking.url && (
                                  <span> - <a href={ranking.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{getDomainFromUrl(ranking.url)}</a></span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">No keywords added yet</p>
                      <Link href={`/projects/${id}/keywords`}>
                        <Button variant="outline" size="sm" className="mt-4 gap-1" data-testid="button-add-keywords-empty">
                          <Plus className="h-4 w-4" />
                          Add Keywords
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="local" className="mt-4">
              <Card data-testid="card-local-rankings">
                <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-lg font-medium">Local Pack Rankings</CardTitle>
                    {latestLocalRanking && (
                      <span className="text-xs text-muted-foreground">
                        Last checked: {new Date(latestLocalRanking.checkedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1" 
                      data-testid="button-export-local"
                      onClick={exportLocalRankings}
                      disabled={!latestLocalRanking || keywordCount === 0}
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button 
                      size="sm" 
                      className="gap-2" 
                      data-testid="button-check-local-rankings"
                      onClick={() => checkLocalRankingsMutation.mutate()}
                      disabled={checkLocalRankingsMutation.isPending || (project.keywords?.length || 0) === 0}
                    >
                      {checkLocalRankingsMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      {checkLocalRankingsMutation.isPending ? "Checking..." : "Check Local"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingLocalRanking ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : keywordCount > 0 ? (
                    <div className="space-y-2">
                      {project.keywords?.map((keyword, index) => {
                        const localRanking = latestLocalRanking?.rankings.find(r => r.keywordId === keyword.id);
                        return (
                          <div
                            key={keyword.id || index}
                            className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2"
                            data-testid={`row-local-keyword-${index}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate flex-1 mr-2">{keyword.text}</span>
                              <div className="flex items-center gap-2">
                                {localRanking ? (
                                  localRanking.error ? (
                                    <Badge variant="destructive" className="gap-1" title={localRanking.error}>
                                      <XCircle className="h-3 w-3" />
                                      Error
                                    </Badge>
                                  ) : localRanking.found && localRanking.matchingPlaces.length > 0 ? (
                                    <Badge variant="default" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      #{localRanking.matchingPlaces[0].position} in Local Pack
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1">
                                      <XCircle className="h-3 w-3" />
                                      Not in Local Pack
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Not checked
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {localRanking?.found && localRanking.matchingPlaces.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {localRanking.matchingPlaces.map((place, placeIndex) => (
                                  <div key={placeIndex} className="text-xs text-muted-foreground bg-background/50 rounded p-2">
                                    <div className="font-medium text-foreground">{place.title}</div>
                                    {place.address && <div>{place.address}</div>}
                                    <div className="flex items-center gap-2 mt-1">
                                      {place.rating && (
                                        <span className="text-yellow-600 dark:text-yellow-400">
                                          Rating: {place.rating}
                                        </span>
                                      )}
                                      {place.reviews && (
                                        <span>({place.reviews} reviews)</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {localRanking && !localRanking.error && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {localRanking.totalPlaces} places found in local results
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">No keywords added yet</p>
                      <Link href={`/projects/${id}/keywords`}>
                        <Button variant="outline" size="sm" className="mt-4 gap-1" data-testid="button-add-keywords-local-empty">
                          <Plus className="h-4 w-4" />
                          Add Keywords
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card data-testid="card-project-info" className="max-w-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium">Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    {project.websiteUrl}
                  </a>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Country / Location</p>
                  <p className="text-sm font-medium" data-testid="text-country-full">
                    {getCountryName(project.country)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
