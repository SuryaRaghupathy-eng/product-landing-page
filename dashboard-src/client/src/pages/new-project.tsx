import { useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { HelpCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProgressIndicator } from "@/components/wizard/progress-indicator";
import { StepProjectDetails } from "@/components/wizard/step-project-details";
import { StepKeywords } from "@/components/wizard/step-keywords";
import { StepReview } from "@/components/wizard/step-review";
import { NavigationFooter } from "@/components/wizard/navigation-footer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type ProjectFormData,
  projectFormSchema,
} from "@shared/schema";

const TOTAL_STEPS = 3;

const initialFormData: ProjectFormData = {
  name: "",
  websiteUrl: "",
  country: "",
  keywords: [],
  competitors: [],
};

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = useCallback((data: Partial<ProjectFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setErrors({});
  }, []);

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest("POST", "/api/projects", {
        ...data,
        status: "active",
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created successfully!",
        description: `Your project "${data.name}" is now ready to track rankings.`,
      });
      setLocation(`/projects/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = "Project name is required";
      }
      if (!formData.websiteUrl.trim()) {
        newErrors.websiteUrl = "Website URL is required";
      } else {
        try {
          new URL(formData.websiteUrl);
        } catch {
          newErrors.websiteUrl = "Please enter a valid URL";
        }
      }
      if (!formData.country) {
        newErrors.country = "Country is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Please fix the errors",
        description: "Some fields require your attention.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep === TOTAL_STEPS) {
      const result = projectFormSchema.safeParse(formData);
      if (!result.success) {
        toast({
          title: "Validation error",
          description: "Please review your project settings.",
          variant: "destructive",
        });
        return;
      }
      createProjectMutation.mutate(formData);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft saved",
      description: "Your project draft has been saved.",
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepProjectDetails
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 2:
        return (
          <StepKeywords formData={formData} updateFormData={updateFormData} />
        );
      case 3:
        return <StepReview formData={formData} goToStep={goToStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background" data-testid="page-new-project">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
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
            <Button variant="ghost" size="icon" data-testid="button-help">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6">
          <ProgressIndicator currentStep={currentStep} />
          <div className="pb-28 pt-4">{renderStep()}</div>
        </div>
      </main>

      <NavigationFooter
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
        isSubmitting={createProjectMutation.isPending}
        isLastStep={currentStep === TOTAL_STEPS}
      />
    </div>
  );
}
