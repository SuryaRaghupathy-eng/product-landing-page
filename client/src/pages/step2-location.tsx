import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowRight, Search, Loader2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function Step2Location() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"search" | "coordinates">("search");
  
  // Location search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Coordinates
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const businessWebsite = sessionStorage.getItem("businessWebsite");

  // Redirect if no business website
  useEffect(() => {
    if (!businessWebsite) {
      setLocation("/");
    }
  }, [businessWebsite, setLocation]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: suggestions = [], isLoading: isSuggestionsLoading } = useQuery<any[]>({
    queryKey: ["/api/geocode/autocomplete", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch autocomplete suggestions");
      }
      return response.json();
    },
    enabled: debouncedQuery.length >= 3 && showSuggestions,
  });

  const handleLocationSelect = async (suggestion: any) => {
    sessionStorage.setItem("selectedLocation", JSON.stringify({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      address: suggestion.display_name,
    }));
    setLocation("/keyword");
  };

  const handleCoordinatesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        variant: "destructive",
        title: "Invalid Coordinates",
        description: "Please enter valid latitude and longitude",
      });
      return;
    }

    if (lat < -90 || lat > 90) {
      toast({
        variant: "destructive",
        title: "Invalid Latitude",
        description: "Latitude must be between -90 and 90",
      });
      return;
    }

    if (lng < -180 || lng > 180) {
      toast({
        variant: "destructive",
        title: "Invalid Longitude",
        description: "Longitude must be between -180 and 180",
      });
      return;
    }

    sessionStorage.setItem("selectedLocation", JSON.stringify({
      lat,
      lng,
      address: undefined,
    }));
    setLocation("/keyword");
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
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold">Map Navigator</h1>
              <p className="text-muted-foreground">Step 2 of 2: Enter Location</p>
            </div>

            {/* Business Website Summary */}
            <div className="p-3 bg-secondary/50 rounded-lg flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Business Website</p>
                <p className="font-semibold text-sm break-all">{businessWebsite}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLocation("/")}
                data-testid="button-edit-step1-from-step2"
                className="flex-shrink-0 h-6 w-6 p-0"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setActiveTab("search")}
                className={`pb-2 px-3 font-medium text-sm transition-colors ${
                  activeTab === "search"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Search Location
              </button>
              <button
                onClick={() => setActiveTab("coordinates")}
                className={`pb-2 px-3 font-medium text-sm transition-colors ${
                  activeTab === "coordinates"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Coordinates
              </button>
            </div>

            {/* Search Location Tab */}
            {activeTab === "search" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location-search" className="text-sm font-medium">
                    Location
                  </Label>
                  <div className="relative">
                    <Input
                      id="location-search"
                      ref={searchInputRef}
                      type="text"
                      placeholder="e.g., Empire State Building, New York"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      className="h-11"
                      data-testid="input-step2-location-search"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Suggestions */}
                {showSuggestions && debouncedQuery.length >= 3 && (
                  <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {isSuggestionsLoading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                        Searching...
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="divide-y">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              handleLocationSelect(suggestion);
                            }}
                            className="w-full text-left p-3 hover:bg-secondary transition-colors"
                            data-testid={`suggestion-${idx}`}
                          >
                            <p className="font-medium text-sm line-clamp-1">
                              {suggestion.name || suggestion.display_name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {suggestion.display_name}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No results found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Coordinates Tab */}
            {activeTab === "coordinates" && (
              <form onSubmit={handleCoordinatesSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-sm font-medium">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    placeholder="e.g., 40.7128"
                    step="0.0001"
                    min="-90"
                    max="90"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="h-11"
                    data-testid="input-step2-latitude"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-sm font-medium">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    placeholder="e.g., -74.0060"
                    step="0.0001"
                    min="-180"
                    max="180"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="h-11"
                    data-testid="input-step2-longitude"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!latitude || !longitude}
                  className="w-full h-11 text-base font-semibold"
                  data-testid="button-step2-navigate"
                >
                  Navigate to Location
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}

            {/* Info */}
            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Next Steps</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Review your location on the map</li>
                <li>• Configure grid settings if needed</li>
                <li>• Enter a keyword to search rankings</li>
                <li>• Generate your report</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
