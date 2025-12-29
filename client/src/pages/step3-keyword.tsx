import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowRight, Search, ArrowLeft, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Step3Keyword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [isValid, setIsValid] = useState(false);

  const businessWebsite = sessionStorage.getItem("businessWebsite");
  const selectedLocationStr = sessionStorage.getItem("selectedLocation");
  
  let selectedLocation = null;
  if (selectedLocationStr) {
    try {
      selectedLocation = JSON.parse(selectedLocationStr);
    } catch {
      selectedLocation = null;
    }
  }

  // Redirect if missing previous steps
  useEffect(() => {
    if (!businessWebsite || !selectedLocation) {
      setLocation("/");
    }
  }, [businessWebsite, selectedLocation, setLocation]);

  const handleChange = (value: string) => {
    setKeyword(value);
    setIsValid(value.trim().length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      sessionStorage.setItem("searchKeyword", keyword);
      setLocation("/grid");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Search className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold">Map Navigator</h1>
              <p className="text-muted-foreground">Step 3 of 5: Enter Keyword</p>
            </div>

            {/* Summary Cards */}
            <div className="space-y-3">
              {/* Business Website */}
              <div className="p-3 bg-secondary/50 rounded-lg flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Business Website</p>
                  <p className="font-semibold text-sm break-all">{businessWebsite}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLocation("/")}
                  data-testid="button-edit-step1"
                  className="flex-shrink-0 h-6 w-6 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Location */}
              {selectedLocation && (
                <div className="p-3 bg-secondary/50 rounded-lg flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Location</p>
                    {selectedLocation.address ? (
                      <p className="font-semibold text-sm break-all">{selectedLocation.address}</p>
                    ) : (
                      <p className="font-semibold text-sm">
                        {selectedLocation.lat.toFixed(4)}°, {selectedLocation.lng.toFixed(4)}°
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocation("/location")}
                    data-testid="button-edit-step2"
                    className="flex-shrink-0 h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Keyword Input */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keyword" className="text-base font-semibold">
                    Search Keyword
                  </Label>
                  {keyword && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setKeyword("")}
                      data-testid="button-clear-keyword"
                      className="text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                <Input
                  id="keyword"
                  type="text"
                  placeholder="e.g., plumber near me, estate agents"
                  value={keyword}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-step3-keyword"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Enter the search term you want to track rankings for
                </p>
              </div>

              <Button
                type="submit"
                disabled={!isValid}
                className="w-full h-12 text-base font-semibold"
                data-testid="button-step3-start"
              >
                Start Tracking
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Info */}
            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">What happens next?</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Search for competitor rankings at your location</li>
                <li>• Configure grid settings for multi-point searches</li>
                <li>• Generate detailed ranking reports</li>
                <li>• Track your business position vs competitors</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
