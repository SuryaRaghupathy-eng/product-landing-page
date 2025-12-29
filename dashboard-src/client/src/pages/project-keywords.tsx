import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Keyword } from "@shared/schema";

export default function ProjectKeywords() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [singleKeyword, setSingleKeyword] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!id,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (keywords: Keyword[]) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, {
        keywords,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Keywords updated",
        description: "Your keywords have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update keywords",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addSingleKeyword = () => {
    if (!singleKeyword.trim() || !project) return;
    const newKeyword: Keyword = {
      id: crypto.randomUUID(),
      text: singleKeyword.trim(),
    };
    updateProjectMutation.mutate([...project.keywords, newKeyword]);
    setSingleKeyword("");
  };

  const addBulkKeywords = () => {
    if (!bulkKeywords.trim() || !project) return;
    const lines = bulkKeywords
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const newKeywords: Keyword[] = lines.map((text) => ({
      id: crypto.randomUUID(),
      text,
    }));

    updateProjectMutation.mutate([...project.keywords, ...newKeywords]);
    setBulkKeywords("");
  };

  const removeKeyword = (keywordId: string) => {
    if (!project) return;
    updateProjectMutation.mutate(
      project.keywords.filter((k) => k.id !== keywordId)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSingleKeyword();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-6">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-9" />
          </div>
        </header>
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-2xl space-y-6 px-6">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-6">
          <Link href={`/projects/${id}`}>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-2xl space-y-8 px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Keywords</h2>
            <p className="mt-2 text-muted-foreground">
              Add the keywords you want to track for your website
            </p>
          </div>

          <div className="space-y-6">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" data-testid="tab-single-keyword">
                  Single Keyword
                </TabsTrigger>
                <TabsTrigger value="bulk" data-testid="tab-bulk-keywords">
                  Bulk Add
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyword">Add Keyword</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="keyword"
                        placeholder="Enter a keyword..."
                        value={singleKeyword}
                        onChange={(e) => setSingleKeyword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pl-10"
                        data-testid="input-keyword"
                      />
                    </div>
                    <Button
                      onClick={addSingleKeyword}
                      disabled={!singleKeyword.trim() || updateProjectMutation.isPending}
                      className="gap-1"
                      data-testid="button-add-keyword"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-keywords">Add Multiple Keywords</Label>
                  <Textarea
                    id="bulk-keywords"
                    placeholder="Enter keywords (one per line)..."
                    value={bulkKeywords}
                    onChange={(e) => setBulkKeywords(e.target.value)}
                    rows={6}
                    data-testid="textarea-bulk-keywords"
                  />
                  <Button
                    onClick={addBulkKeywords}
                    disabled={!bulkKeywords.trim() || updateProjectMutation.isPending}
                    className="gap-1"
                    data-testid="button-add-bulk-keywords"
                  >
                    <Plus className="h-4 w-4" />
                    Add All Keywords
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Added Keywords</Label>
                <span className="text-sm text-muted-foreground">
                  {project.keywords.length} keywords
                </span>
              </div>

              {project.keywords.length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-wrap gap-2">
                    {project.keywords.map((keyword) => (
                      <Badge
                        key={keyword.id}
                        variant="secondary"
                        className="gap-1 pr-1"
                        data-testid={`badge-keyword-${keyword.id}`}
                      >
                        {keyword.text}
                        <button
                          onClick={() => removeKeyword(keyword.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          aria-label={`Remove ${keyword.text}`}
                          data-testid={`button-remove-keyword-${keyword.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
                  <Tag className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No keywords added yet. Add your first keyword above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
