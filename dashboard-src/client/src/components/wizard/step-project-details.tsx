import { Globe, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries, type ProjectFormData } from "@shared/schema";

interface StepProjectDetailsProps {
  formData: ProjectFormData;
  updateFormData: (data: Partial<ProjectFormData>) => void;
  errors: Record<string, string>;
}

export function StepProjectDetails({
  formData,
  updateFormData,
  errors,
}: StepProjectDetailsProps) {
  return (
    <div className="space-y-8" data-testid="step-project-details">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Project Details</h2>
        <p className="mt-2 text-muted-foreground">
          Enter the basic information about your SEO tracking project
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-sm font-medium">
            Project Name
          </Label>
          <Input
            id="project-name"
            placeholder="My Website Project"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            className={errors.name ? "border-destructive" : ""}
            data-testid="input-project-name"
          />
          {errors.name && (
            <p className="text-sm text-destructive" data-testid="error-project-name">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website-url" className="text-sm font-medium">
            Website URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="website-url"
              type="url"
              placeholder="https://example.com"
              value={formData.websiteUrl}
              onChange={(e) => updateFormData({ websiteUrl: e.target.value })}
              className={`pl-10 font-mono text-sm ${errors.websiteUrl ? "border-destructive" : ""}`}
              data-testid="input-website-url"
            />
          </div>
          {errors.websiteUrl && (
            <p className="text-sm text-destructive" data-testid="error-website-url">
              {errors.websiteUrl}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium">
            Country
          </Label>
          <Select
            value={formData.country}
            onValueChange={(value) => updateFormData({ country: value })}
          >
            <SelectTrigger
              id="country"
              className={errors.country ? "border-destructive" : ""}
              data-testid="select-country"
            >
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="font-mono text-xs text-muted-foreground mr-2">{country.code}</span>
                  {country.name} ({country.code.toLowerCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.country && (
            <p className="text-sm text-destructive" data-testid="error-country">
              {errors.country}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
