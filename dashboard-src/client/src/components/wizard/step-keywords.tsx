import { useState } from "react";
import { Plus, X, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ProjectFormData, type Keyword } from "@shared/schema";

interface StepKeywordsProps {
  formData: ProjectFormData;
  updateFormData: (data: Partial<ProjectFormData>) => void;
}

export function StepKeywords({ formData, updateFormData }: StepKeywordsProps) {
  const [singleKeyword, setSingleKeyword] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");

  const addSingleKeyword = () => {
    if (!singleKeyword.trim()) return;
    const newKeyword: Keyword = {
      id: crypto.randomUUID(),
      text: singleKeyword.trim(),
    };
    updateFormData({
      keywords: [...formData.keywords, newKeyword],
    });
    setSingleKeyword("");
  };

  const addBulkKeywords = () => {
    if (!bulkKeywords.trim()) return;
    const lines = bulkKeywords
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const newKeywords: Keyword[] = lines.map((text) => ({
      id: crypto.randomUUID(),
      text,
    }));

    updateFormData({
      keywords: [...formData.keywords, ...newKeywords],
    });
    setBulkKeywords("");
  };

  const removeKeyword = (id: string) => {
    updateFormData({
      keywords: formData.keywords.filter((k) => k.id !== id),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSingleKeyword();
    }
  };

  return (
    <div className="space-y-8" data-testid="step-keywords">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Keywords</h2>
        <p className="mt-2 text-muted-foreground">
          Add the keywords you want to track for your website
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" data-testid="tab-single-keyword">
              Single Keyword
            </TabsTrigger>
            <TabsTrigger value="bulk" data-testid="tab-bulk-keywords">
              Bulk Add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="single-keyword" className="text-sm font-medium">
                Add Keyword
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="single-keyword"
                    placeholder="Enter a keyword..."
                    value={singleKeyword}
                    onChange={(e) => setSingleKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                    data-testid="input-single-keyword"
                  />
                </div>
                <Button
                  onClick={addSingleKeyword}
                  disabled={!singleKeyword.trim()}
                  data-testid="button-add-keyword"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-keywords" className="text-sm font-medium">
                Add Multiple Keywords
              </Label>
              <Textarea
                id="bulk-keywords"
                placeholder="Enter one keyword per line..."
                value={bulkKeywords}
                onChange={(e) => setBulkKeywords(e.target.value)}
                className="min-h-32 resize-none"
                data-testid="textarea-bulk-keywords"
              />
              <Button
                onClick={addBulkKeywords}
                disabled={!bulkKeywords.trim()}
                className="w-full"
                data-testid="button-add-bulk-keywords"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Keywords
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Added Keywords
            </Label>
            <span className="text-sm text-muted-foreground" data-testid="text-keyword-count">
              {formData.keywords.length} keyword{formData.keywords.length !== 1 ? "s" : ""}
            </span>
          </div>

          {formData.keywords.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center" data-testid="empty-keywords">
              <Tag className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No keywords added yet. Add your first keyword above.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 rounded-lg border p-4" data-testid="keyword-list">
              {formData.keywords.map((keyword) => (
                <Badge
                  key={keyword.id}
                  variant="secondary"
                  className="gap-1 py-1.5 pl-3 pr-1.5"
                  data-testid={`badge-keyword-${keyword.id}`}
                >
                  {keyword.text}
                  <button
                    onClick={() => removeKeyword(keyword.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    data-testid={`button-remove-keyword-${keyword.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
