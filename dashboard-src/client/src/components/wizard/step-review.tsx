import { Pencil, Globe, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ProjectFormData, countries } from "@shared/schema";

interface StepReviewProps {
  formData: ProjectFormData;
  goToStep: (step: number) => void;
}

export function StepReview({ formData, goToStep }: StepReviewProps) {
  const countryName = countries.find((c) => c.code === formData.country)?.name || formData.country;

  return (
    <div className="space-y-8" data-testid="step-review">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Review Your Project</h2>
        <p className="mt-2 text-muted-foreground">
          Please review your project settings before creating
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <Card data-testid="review-project-details">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(1)}
              data-testid="button-edit-project-details"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Project Name</span>
                <p className="font-medium" data-testid="text-review-name">{formData.name || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Website URL</span>
                <p className="font-mono text-sm" data-testid="text-review-url">
                  {formData.websiteUrl || "—"}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Country</span>
                <p className="font-medium" data-testid="text-review-country">{countryName || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="review-keywords">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Tag className="h-5 w-5 text-chart-2" />
              </div>
              <CardTitle className="text-lg">
                Keywords
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({formData.keywords.length})
                </span>
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(2)}
              data-testid="button-edit-keywords"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {formData.keywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No keywords added</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.keywords.slice(0, 20).map((keyword) => (
                  <Badge key={keyword.id} variant="secondary">
                    {keyword.text}
                  </Badge>
                ))}
                {formData.keywords.length > 20 && (
                  <Badge variant="outline">
                    +{formData.keywords.length - 20} more
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
