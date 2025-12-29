import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Grid3X3, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRID_SIZES = [
  { value: 3, label: "3x3" },
  { value: 5, label: "5x5" },
  { value: 7, label: "7x7" },
  { value: 9, label: "9x9" },
];

const SPACING_OPTIONS_MILES = [
  { value: 1, label: "1 mile" },
  { value: 2, label: "2 miles" },
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
];

const SPACING_OPTIONS_METERS = [
  { value: 500, label: "500 meters" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
];

export default function Step4Grid() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [distanceUnit, setDistanceUnit] = useState<"meters" | "miles">("miles");
  const [gridSize, setGridSize] = useState("7");
  const [spacing, setSpacing] = useState("5");

  const businessWebsite = sessionStorage.getItem("businessWebsite");
  const selectedLocationStr = sessionStorage.getItem("selectedLocation");
  const searchKeyword = sessionStorage.getItem("searchKeyword");

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
    if (!businessWebsite || !selectedLocation || !searchKeyword) {
      setLocation("/");
    }
  }, [businessWebsite, selectedLocation, searchKeyword, setLocation]);

  const spacingOptions = distanceUnit === "miles" ? SPACING_OPTIONS_MILES : SPACING_OPTIONS_METERS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const gridConfig = {
      enabled: true,
      distanceUnit,
      gridSize: parseInt(gridSize),
      spacing: parseInt(spacing),
    };

    sessionStorage.setItem("gridConfig", JSON.stringify(gridConfig));
    setLocation("/review");
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
                  <Grid3X3 className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold">Map Navigator</h1>
              <p className="text-muted-foreground">Step 4 of 5: Grid Settings</p>
            </div>

            {/* Summary Cards */}
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-secondary/50 rounded flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Keyword</p>
                  <p className="font-semibold line-clamp-1">{searchKeyword}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLocation("/keyword")}
                  data-testid="button-edit-step3-from-step4"
                  className="flex-shrink-0 h-5 w-5 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
              {selectedLocation && (
                <div className="p-2 bg-secondary/50 rounded flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-semibold line-clamp-1">
                      {selectedLocation.address || `${selectedLocation.lat.toFixed(4)}°, ${selectedLocation.lng.toFixed(4)}°`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocation("/location")}
                    data-testid="button-edit-step2-from-step4"
                    className="flex-shrink-0 h-5 w-5 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Distance Unit */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Distance between Grid Points</Label>
                <RadioGroup value={distanceUnit} onValueChange={(value: any) => setDistanceUnit(value)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="meters" id="meters" />
                    <Label htmlFor="meters" className="font-normal cursor-pointer">
                      Meters
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="miles" id="miles" />
                    <Label htmlFor="miles" className="font-normal cursor-pointer">
                      Miles
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Grid Point Spacing and Grid Size Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Grid Point Spacing */}
                <div className="space-y-2">
                  <Label htmlFor="spacing" className="text-sm font-medium">
                    Grid point spacing
                  </Label>
                  <Select value={spacing} onValueChange={setSpacing}>
                    <SelectTrigger id="spacing" data-testid="select-spacing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid Size */}
                <div className="space-y-2">
                  <Label htmlFor="gridSize" className="text-sm font-medium">
                    Grid size template
                  </Label>
                  <Select value={gridSize} onValueChange={setGridSize}>
                    <SelectTrigger id="gridSize" data-testid="select-grid-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRID_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value.toString()}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                data-testid="button-step4-continue"
              >
                Continue to Map
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Info */}
            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Grid Search</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Search rankings across multiple locations</li>
                <li>• Show grid on map and visualize results</li>
                <li>• Generate comprehensive grid reports</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
