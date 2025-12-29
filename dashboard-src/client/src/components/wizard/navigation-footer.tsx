import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationFooterProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  isSubmitting?: boolean;
  isLastStep?: boolean;
}

export function NavigationFooter({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSaveDraft,
  isSubmitting = false,
  isLastStep = false,
}: NavigationFooterProps) {
  return (
    <div
      className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      data-testid="navigation-footer"
    >
      <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-6">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={currentStep === 1 || isSubmitting}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          {onSaveDraft && (
            <Button
              variant="ghost"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="text-muted-foreground"
              data-testid="button-save-draft"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          )}
          <span className="text-sm text-muted-foreground" data-testid="text-step-progress">
            Step {currentStep} of {totalSteps}
          </span>
        </div>

        <Button
          onClick={onNext}
          disabled={isSubmitting}
          data-testid={isLastStep ? "button-create-project" : "button-next"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : isLastStep ? (
            <>
              Create Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
