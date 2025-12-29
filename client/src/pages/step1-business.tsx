import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowRight, Edit2, ChevronLeft } from "lucide-react";

export default function Step1Business() {
  const [, setLocation] = useLocation();
  const [businessWebsite, setBusinessWebsite] = useState(
    sessionStorage.getItem("businessWebsite") || ""
  );
  const [isValid, setIsValid] = useState(false);

  const handleChange = (value: string) => {
    setBusinessWebsite(value);
    setIsValid(value.trim().length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessWebsite.trim()) {
      sessionStorage.setItem("businessWebsite", businessWebsite);
      setLocation("/location");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <Link href="/">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute -top-12 left-0 text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 p-0 h-auto font-medium"
            data-testid="link-back-to-landing"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold">Map Navigator</h1>
              <p className="text-muted-foreground">Step 1 of 2: Enter Business Website</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="business-website" className="text-base font-semibold">
                    Business Website
                  </Label>
                  {businessWebsite && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setBusinessWebsite("")}
                      data-testid="button-clear-website"
                      className="text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                <Input
                  id="business-website"
                  type="text"
                  placeholder="e.g., example.com"
                  value={businessWebsite}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-step1-website"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Enter your website URL to track its ranking position
                </p>
              </div>

              <Button
                type="submit"
                disabled={!isValid}
                className="w-full h-12 text-base font-semibold"
                data-testid="button-step1-continue"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Info */}
            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">What's next?</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Search locations by address or coordinates</li>
                <li>• Configure grid settings for multi-location search</li>
                <li>• Generate reports with ranking data</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
