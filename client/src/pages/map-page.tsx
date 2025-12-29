import { useState, useRef, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from "react-leaflet";
import { LatLngExpression, Icon } from "leaflet";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { coordinateInputSchema, type CoordinateInput, type Favorite } from "@shared/schema";
import { MapPin, Navigation, Plus, Minus, RotateCcw, Star, Trash2, Locate, Search, Map as MapIcon, Loader2, Grid3X3, ChevronDown, ChevronUp, X, Building2, ExternalLink, Phone, Globe, Trophy, Filter, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import "leaflet/dist/leaflet.css";

interface PlaceResult {
  position: number;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  ratingCount?: number;
  type?: string;
  types?: string[];
  website?: string;
  phoneNumber?: string;
  cid?: string;
  placeId?: string;
  thumbnailUrl?: string;
}

const DEFAULT_CENTER: LatLngExpression = [40.7128, -74.0060];
const DEFAULT_ZOOM = 13;

const customMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const favoriteMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MAP_STYLES = {
  street: {
    name: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  topo: {
    name: "Topographic",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  row: number;
  col: number;
  isSelected: boolean;
  isCenter: boolean;
}

interface GridConfig {
  enabled: boolean;
  distanceUnit: "meters" | "miles";
  spacing: number;
  gridSize: number;
}

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

function calculateGridPoints(
  centerLat: number,
  centerLng: number,
  spacing: number,
  gridSize: number,
  distanceUnit: "meters" | "miles"
): GridPoint[] {
  const points: GridPoint[] = [];
  const half = Math.floor(gridSize / 2);
  
  const spacingInMeters = distanceUnit === "miles" ? spacing * 1609.34 : spacing;
  
  const latOffset = spacingInMeters / 111320;
  const lngOffset = spacingInMeters / (111320 * Math.cos(centerLat * Math.PI / 180));

  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      const lat = centerLat + (row * latOffset);
      const lng = centerLng + (col * lngOffset);
      const isCenter = row === 0 && col === 0;
      
      points.push({
        id: `${row}_${col}`,
        lat,
        lng,
        row,
        col,
        isSelected: true,
        isCenter,
      });
    }
  }

  return points;
}

function MapController({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [center, zoom, map]);
  
  return null;
}

function MapClickHandler({ 
  onMapClick 
}: { 
  onMapClick: (lat: number, lng: number) => void 
}) {
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useMapEvents({
    click: (e) => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      
      const timeout = setTimeout(() => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }, 300);
      
      setClickTimeout(timeout);
    },
  });
  
  return null;
}

function SaveFavoriteDialog({
  open,
  onOpenChange,
  position,
  address,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { lat: number; lng: number } | null;
  address?: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
    }
  }, [open]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Favorite Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="favorite-name">Location Name</Label>
            <Input
              id="favorite-name"
              placeholder="e.g., Home, Office, Favorite Restaurant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
          {position && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Coordinates: {position.lat.toFixed(6)}°, {position.lng.toFixed(6)}°</p>
              {address && <p>Address: {address}</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BusinessRankingPanel({
  currentPosition,
  onNavigateToPlace,
  onShowPlacesOnMap,
}: {
  currentPosition: { lat: number; lng: number; address?: string } | null;
  onNavigateToPlace: (lat: number, lng: number) => void;
  onShowPlacesOnMap: (places: PlaceResult[]) => void;
}) {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trackedBusiness, setTrackedBusiness] = useState<PlaceResult | null>(null);

  const extractDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      return domain.toLowerCase();
    } catch {
      return url.toLowerCase().replace(/^www\./, '');
    }
  };

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Keyword",
        description: "Please enter a search keyword",
      });
      return;
    }

    setIsSearching(true);
    try {
      const payload: any = { q: keyword, num: 20 };
      
      if (currentPosition) {
        payload.lat = currentPosition.lat;
        payload.lng = currentPosition.lng;
      }

      const response = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to search places");
      }

      const data = await response.json();
      const results = data.places || [];
      setPlaces(results);
      
      if (websiteFilter.trim()) {
        filterByWebsite(results, websiteFilter);
      } else {
        setFilteredPlaces(results);
      }

      onShowPlacesOnMap(results);

      toast({
        title: "Search Complete",
        description: `Found ${results.length} businesses`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const filterByWebsite = (placesToFilter: PlaceResult[], filter: string) => {
    if (!filter.trim()) {
      setFilteredPlaces(placesToFilter);
      setTrackedBusiness(null);
      return;
    }

    const filterDomain = extractDomain(filter);
    const matched = placesToFilter.filter(place => {
      if (!place.website) return false;
      const placeDomain = extractDomain(place.website);
      return placeDomain.includes(filterDomain) || filterDomain.includes(placeDomain);
    });

    setFilteredPlaces(placesToFilter);
    
    if (matched.length > 0) {
      setTrackedBusiness(matched[0]);
      toast({
        title: "Business Found",
        description: `${matched[0].title} is ranked #${matched[0].position}`,
      });
    } else {
      setTrackedBusiness(null);
      toast({
        variant: "destructive", 
        title: "Not Found",
        description: "No business found with that website in the results",
      });
    }
  };

  const handleWebsiteFilterChange = (value: string) => {
    setWebsiteFilter(value);
    if (places.length > 0) {
      filterByWebsite(places, value);
    }
  };

  const openGoogleMaps = (place: PlaceResult) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`;
    window.open(url, '_blank');
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <span className="text-yellow-500 dark:text-yellow-400">
        {'★'.repeat(fullStars)}
        {hasHalf && '½'}
        {'☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0))}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Search Keyword</Label>
          <Input
            placeholder="e.g., estate agents in luton"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            data-testid="input-ranking-keyword"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Track by Website
          </Label>
          <Input
            placeholder="e.g., example.com"
            value={websiteFilter}
            onChange={(e) => handleWebsiteFilterChange(e.target.value)}
            data-testid="input-website-filter"
          />
          <p className="text-xs text-muted-foreground">
            Enter your website to find your ranking position
          </p>
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full"
          data-testid="button-search-ranking"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Rankings
            </>
          )}
        </Button>

        {currentPosition && (
          <p className="text-xs text-muted-foreground text-center">
            Searching near: {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
          </p>
        )}
      </div>

      {trackedBusiness && (
        <Card className="p-4 border-primary bg-primary/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-semibold">Your Business Ranking</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-lg px-3 py-1">
                #{trackedBusiness.position}
              </Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">{trackedBusiness.title}</p>
                {trackedBusiness.rating && (
                  <div className="flex items-center gap-1 text-xs">
                    {renderStars(trackedBusiness.rating)}
                    <span className="text-muted-foreground">
                      ({trackedBusiness.ratingCount} reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateToPlace(trackedBusiness.latitude, trackedBusiness.longitude)}
                data-testid="button-navigate-tracked"
              >
                <MapPin className="w-3 h-3 mr-1" />
                View on Map
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openGoogleMaps(trackedBusiness)}
                data-testid="button-google-maps-tracked"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Google Maps
              </Button>
            </div>
          </div>
        </Card>
      )}

      {filteredPlaces.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Results ({filteredPlaces.length})
            </Label>
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
              {filteredPlaces.map((place) => (
                <Card
                  key={place.cid || place.position}
                  className={`p-3 hover-elevate cursor-pointer ${
                    trackedBusiness?.cid === place.cid ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => onNavigateToPlace(place.latitude, place.longitude)}
                  data-testid={`place-result-${place.position}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          #{place.position}
                        </Badge>
                        <span className="font-medium text-sm line-clamp-1">{place.title}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {place.address}
                    </p>
                    
                    {place.rating && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderStars(place.rating)}
                        <span className="text-muted-foreground">
                          {place.rating} ({place.ratingCount})
                        </span>
                      </div>
                    )}
                    
                    {place.type && (
                      <Badge variant="outline" className="text-xs">
                        {place.type}
                      </Badge>
                    )}
                    
                    <div className="flex gap-1 pt-1 flex-wrap">
                      {place.website && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(place.website, '_blank');
                          }}
                          data-testid={`button-website-${place.position}`}
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          Website
                        </Button>
                      )}
                      {place.phoneNumber && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${place.phoneNumber}`, '_blank');
                          }}
                          data-testid={`button-phone-${place.position}`}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGoogleMaps(place);
                        }}
                        data-testid={`button-gmaps-${place.position}`}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Google Maps
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function CoordinateInputPanel({
  onNavigate,
  currentPosition,
  onSaveFavorite,
  onGetCurrentLocation,
  onShowGrid,
  onCreateReport,
  businessWebsite,
  onBusinessWebsiteChange,
  gridConfig,
  onGridConfigChange,
  gridPoints,
  gridKeyword,
  onGridKeywordChange,
  activeTab,
  onActiveTabChange,
}: {
  onNavigate: (lat: number, lng: number) => void;
  currentPosition: { lat: number; lng: number; address?: string } | null;
  onSaveFavorite: () => void;
  onGetCurrentLocation: () => void;
  onShowGrid: () => void;
  onCreateReport: () => void;
  businessWebsite: string;
  onBusinessWebsiteChange: (value: string) => void;
  gridConfig: GridConfig;
  onGridConfigChange: (config: Partial<GridConfig>) => void;
  gridPoints: GridPoint[];
  gridKeyword: string;
  onGridKeywordChange: (value: string) => void;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
}) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CoordinateInput>({
    resolver: zodResolver(coordinateInputSchema),
    defaultValues: {
      latitude: "",
      longitude: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to search address");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const result = data[0];
        onNavigate(parseFloat(result.lat), parseFloat(result.lon));
        toast({
          title: "Location Found",
          description: result.display_name,
        });
        setSearchQuery("");
        onActiveTabChange("favorites");
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Could not find that address",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Search Error",
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: any) => {
    try {
      onNavigate(data.latitude, data.longitude);
      toast({
        title: "Navigation Successful",
        description: `Navigated to ${data.latitude.toFixed(6)}°, ${data.longitude.toFixed(6)}°`,
      });
      onActiveTabChange("favorites");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid Coordinates",
        description: "Please check your input and try again.",
      });
    }
  };

  const handleClear = () => {
    reset();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    onNavigate(lat, lon);
    setSearchQuery("");
    setShowSuggestions(false);
    toast({
      title: "Location Found",
      description: suggestion.display_name,
    });
    onActiveTabChange("favorites");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Card className="w-full lg:w-96 h-full lg:h-screen flex flex-col overflow-hidden">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Map Navigator</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Navigate by coordinates, address, or click on the map
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={onActiveTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="coordinates">Coordinates</TabsTrigger>
            <TabsTrigger value="favorites">
              <Grid3X3 className="w-3 h-3 mr-1" />
              Grid Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="coordinates" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="business-website" className="text-sm font-medium">
                Business Website
              </Label>
              <Input
                id="business-website"
                type="text"
                placeholder="e.g., example.com"
                value={businessWebsite}
                onChange={(e) => onBusinessWebsiteChange(e.target.value)}
                data-testid="input-business-website"
              />
              <p className="text-xs text-muted-foreground">
                Enter your website to track ranking position
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                Location Search
              </Label>
              <div className="flex gap-2 relative" ref={searchInputRef}>
                <div className="flex-1 relative">
                  <Input
                    id="search"
                    type="text"
                    placeholder="e.g., Empire State Building"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={searchMutation.isPending}
                    data-testid="input-address-search"
                    autoComplete="off"
                  />
                  {showSuggestions && searchQuery.length >= 3 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {isSuggestionsLoading ? (
                        <div className="p-3 text-center text-sm text-muted-foreground" data-testid="text-loading-suggestions">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                          Loading suggestions...
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="py-1">
                          {suggestions.map((suggestion: any, index: number) => (
                            <button
                              key={`${suggestion.place_id}-${index}`}
                              type="button"
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="w-full px-3 py-2 text-left text-sm hover-elevate active-elevate-2 flex items-start gap-2 border-b last:border-b-0"
                              data-testid={`suggestion-${index}`}
                            >
                              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="flex-1 text-foreground">{suggestion.display_name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground" data-testid="text-no-suggestions">
                          No suggestions found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button type="submit" size="icon" disabled={searchMutation.isPending} data-testid="button-search">
                  {searchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-sm font-medium">
                  Latitude (°)
                </Label>
                <Input
                  id="latitude"
                  type="text"
                  placeholder="e.g., 40.7128"
                  data-testid="input-latitude"
                  {...register("latitude")}
                  className={errors.latitude ? "border-destructive" : ""}
                />
                {errors.latitude && (
                  <p className="text-sm text-destructive" data-testid="text-latitude-error">
                    {errors.latitude.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-sm font-medium">
                  Longitude (°)
                </Label>
                <Input
                  id="longitude"
                  type="text"
                  placeholder="e.g., -74.0060"
                  data-testid="input-longitude"
                  {...register("longitude")}
                  className={errors.longitude ? "border-destructive" : ""}
                />
                {errors.longitude && (
                  <p className="text-sm text-destructive" data-testid="text-longitude-error">
                    {errors.longitude.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-navigate"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Navigate to Location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleClear}
                  data-testid="button-clear"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </form>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onGetCurrentLocation}
            >
              <Locate className="w-4 h-4 mr-2" />
              Use My Location
            </Button>

            {currentPosition && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-foreground">Current Location</h2>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={onSaveFavorite}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={onShowGrid}
                      data-testid="button-show-grid"
                    >
                      <Grid3X3 className="w-4 h-4 mr-1" />
                      Grid
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Latitude:</span>
                    <code className="font-mono text-foreground" data-testid="text-current-latitude">
                      {currentPosition.lat.toFixed(6)}°
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Longitude:</span>
                    <code className="font-mono text-foreground" data-testid="text-current-longitude">
                      {currentPosition.lng.toFixed(6)}°
                    </code>
                  </div>
                  {currentPosition.address && (
                    <div className="text-sm pt-2">
                      <span className="text-muted-foreground">Address:</span>
                      <p className="text-foreground mt-1">{currentPosition.address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <h2 className="text-sm font-medium text-foreground">Quick Examples</h2>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onNavigate(40.7128, -74.0060)}
                  className="w-full text-left text-sm p-2 rounded-md hover-elevate active-elevate-2 bg-muted/50"
                  data-testid="button-example-nyc"
                >
                  <div className="font-medium">New York City</div>
                  <div className="text-muted-foreground font-mono text-xs">40.7128, -74.0060</div>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(51.5074, -0.1278)}
                  className="w-full text-left text-sm p-2 rounded-md hover-elevate active-elevate-2 bg-muted/50"
                  data-testid="button-example-london"
                >
                  <div className="font-medium">London</div>
                  <div className="text-muted-foreground font-mono text-xs">51.5074, -0.1278</div>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(35.6762, 139.6503)}
                  className="w-full text-left text-sm p-2 rounded-md hover-elevate active-elevate-2 bg-muted/50"
                  data-testid="button-example-tokyo"
                >
                  <div className="font-medium">Tokyo</div>
                  <div className="text-muted-foreground font-mono text-xs">35.6762, 139.6503</div>
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 mt-4">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-b">
                <span>Map Criteria</span>
                <ChevronDown className="w-4 h-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Distance between Grid Points:</Label>
                    <span className="text-xs text-primary font-medium">
                      Grid points selected: {gridPoints.filter(p => p.isSelected).length}/{gridPoints.length}
                    </span>
                  </div>
                  <RadioGroup
                    value={gridConfig.distanceUnit}
                    onValueChange={(value) => onGridConfigChange({ 
                      distanceUnit: value as "meters" | "miles",
                      spacing: value === "miles" ? 5 : 1000
                    })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="meters" id="meters-panel" />
                      <Label htmlFor="meters-panel" className="text-sm">Meters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="miles" id="miles-panel" />
                      <Label htmlFor="miles-panel" className="text-sm">Miles</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Grid point spacing:</Label>
                    <Select
                      value={String(gridConfig.spacing)}
                      onValueChange={(value) => onGridConfigChange({ spacing: Number(value) })}
                    >
                      <SelectTrigger data-testid="select-grid-spacing-panel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(gridConfig.distanceUnit === "miles" ? SPACING_OPTIONS_MILES : SPACING_OPTIONS_METERS).map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Grid size template:</Label>
                    <Select
                      value={String(gridConfig.gridSize)}
                      onValueChange={(value) => onGridConfigChange({ gridSize: Number(value) })}
                    >
                      <SelectTrigger data-testid="select-grid-size-panel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRID_SIZES.map((size) => (
                          <SelectItem key={size.value} value={String(size.value)}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-b">
                <span>Keywords</span>
                <ChevronDown className="w-4 h-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Search Keyword</Label>
                  <Input
                    placeholder="e.g., estate agents in luton"
                    value={gridKeyword}
                    onChange={(e) => onGridKeywordChange(e.target.value)}
                    data-testid="input-keyword-panel"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button 
              onClick={onShowGrid}
              className="w-full"
              data-testid="button-show-grid"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Show Grid on Map
            </Button>

            <Button 
              onClick={onCreateReport}
              variant="secondary"
              className="w-full"
              data-testid="button-generate-report"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}

function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  mapStyle,
  onMapStyleChange,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  mapStyle: keyof typeof MAP_STYLES;
  onMapStyleChange: (style: keyof typeof MAP_STYLES) => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Select value={mapStyle} onValueChange={(value) => onMapStyleChange(value as keyof typeof MAP_STYLES)}>
        <SelectTrigger className="w-[180px] bg-secondary shadow-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MAP_STYLES).map(([key, style]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4" />
                {style.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        size="icon"
        variant="secondary"
        onClick={onZoomIn}
        className="shadow-lg"
        data-testid="button-zoom-in"
      >
        <Plus className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={onZoomOut}
        className="shadow-lg"
        data-testid="button-zoom-out"
      >
        <Minus className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={onReset}
        className="shadow-lg"
        data-testid="button-reset"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function MapPage() {
  const [, navigate] = useLocation();
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(() => {
    const selectedLocation = sessionStorage.getItem("selectedLocation");
    if (selectedLocation) {
      try {
        const location = JSON.parse(selectedLocation);
        return [location.lat, location.lng];
      } catch {
        return DEFAULT_CENTER;
      }
    }
    return DEFAULT_CENTER;
  });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(() => {
    const selectedLocation = sessionStorage.getItem("selectedLocation");
    if (selectedLocation) {
      try {
        const location = JSON.parse(selectedLocation);
        return [location.lat, location.lng];
      } catch {
        return DEFAULT_CENTER;
      }
    }
    return DEFAULT_CENTER;
  });
  const [currentAddress, setCurrentAddress] = useState<string | undefined>(() => {
    const selectedLocation = sessionStorage.getItem("selectedLocation");
    if (selectedLocation) {
      try {
        const location = JSON.parse(selectedLocation);
        return location.address;
      } catch {
        return undefined;
      }
    }
    return undefined;
  });
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>("street");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("coordinates");
  const [gridConfig, setGridConfig] = useState<GridConfig>(() => {
    const gridConfigStr = sessionStorage.getItem("gridConfig");
    if (gridConfigStr) {
      try {
        return JSON.parse(gridConfigStr);
      } catch {
        return {
          enabled: false,
          distanceUnit: "miles",
          spacing: 5,
          gridSize: 7,
        };
      }
    }
    return {
      enabled: false,
      distanceUnit: "miles",
      spacing: 5,
      gridSize: 7,
    };
  });
  const [gridPoints, setGridPoints] = useState<GridPoint[]>([]);
  const [businessPlaces, setBusinessPlaces] = useState<PlaceResult[]>([]);
  const [gridKeyword, setGridKeyword] = useState(
    () => sessionStorage.getItem("searchKeyword") || ""
  );
  const [businessWebsite, setBusinessWebsite] = useState(
    () => sessionStorage.getItem("businessWebsite") || ""
  );
  const mapRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Clear selected location after use
  useEffect(() => {
    const selectedLocation = sessionStorage.getItem("selectedLocation");
    if (selectedLocation && markerPosition) {
      sessionStorage.removeItem("selectedLocation");
    }
  }, [markerPosition]);

  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery<Favorite[]>({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
  });

  const reverseGeocodeMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reverse geocode");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.display_name) {
        setCurrentAddress(data.display_name);
      }
    },
    onError: () => {
      setCurrentAddress(undefined);
    },
  });

  const saveFavoriteMutation = useMutation({
    mutationFn: async (favorite: { name: string; latitude: number; longitude: number; address?: string }) => {
      const existingFavorite = favorites.find(
        (f) => Math.abs(f.latitude - favorite.latitude) < 0.0001 && Math.abs(f.longitude - favorite.longitude) < 0.0001
      );
      
      if (existingFavorite) {
        throw new Error("This location is already in your favorites");
      }

      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(favorite),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save favorite");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Favorite Saved",
        description: "Location added to favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message,
      });
    },
  });

  const deleteFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/favorites/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete favorite");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Favorite Deleted",
        description: "Location removed from favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message,
      });
    },
  });

  const handleNavigate = useCallback((lat: number, lng: number) => {
    const newPosition: LatLngExpression = [lat, lng];
    setMapCenter(newPosition);
    setMarkerPosition(newPosition);
    setZoom(13);
    reverseGeocodeMutation.mutate({ lat, lng });
  }, [reverseGeocodeMutation]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    handleNavigate(lat, lng);
    toast({
      title: "Location Selected",
      description: `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`,
    });
  }, [handleNavigate, toast]);

  const handleSaveFavorite = () => {
    setSaveDialogOpen(true);
  };

  const handleSaveFavoriteConfirm = (name: string) => {
    if (!markerPosition) return;
    
    const [lat, lng] = Array.isArray(markerPosition) 
      ? markerPosition 
      : [markerPosition.lat, markerPosition.lng];
    
    saveFavoriteMutation.mutate({
      name,
      latitude: lat,
      longitude: lng,
      address: currentAddress,
    });
  };

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleNavigate(position.coords.latitude, position.coords.longitude);
          toast({
            title: "Location Found",
            description: "Navigated to your current location",
          });
        },
        (error) => {
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Could not get your location. Please enable location services.",
          });
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
      });
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleReset = () => {
    setMapCenter(DEFAULT_CENTER);
    setMarkerPosition(DEFAULT_CENTER);
    setZoom(DEFAULT_ZOOM);
    setCurrentAddress(undefined);
  };

  const getCurrentPosition = () => {
    if (!markerPosition) return null;
    const [lat, lng] = Array.isArray(markerPosition) 
      ? markerPosition 
      : [markerPosition.lat, markerPosition.lng];
    return { lat, lng, address: currentAddress };
  };

  useEffect(() => {
    if (gridConfig.enabled && markerPosition) {
      const [lat, lng] = Array.isArray(markerPosition) 
        ? markerPosition 
        : [markerPosition.lat, markerPosition.lng];
      
      const points = calculateGridPoints(
        lat,
        lng,
        gridConfig.spacing,
        gridConfig.gridSize,
        gridConfig.distanceUnit
      );
      setGridPoints(points);
    }
  }, [markerPosition, gridConfig.enabled, gridConfig.spacing, gridConfig.gridSize, gridConfig.distanceUnit]);

  const handleShowGrid = useCallback(() => {
    if (!markerPosition) {
      toast({
        variant: "destructive",
        title: "No Location Selected",
        description: "Please select a location first before creating a grid",
      });
      return;
    }

    const [lat, lng] = Array.isArray(markerPosition) 
      ? markerPosition 
      : [markerPosition.lat, markerPosition.lng];

    const points = calculateGridPoints(
      lat,
      lng,
      gridConfig.spacing,
      gridConfig.gridSize,
      gridConfig.distanceUnit
    );
    
    setGridPoints(points);
    setGridConfig(prev => ({ ...prev, enabled: true }));
    
    if (mapRef.current && points.length > 0) {
      const lats = points.map(p => p.lat);
      const lngs = points.map(p => p.lng);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ];
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
    
    toast({
      title: "Grid Created",
      description: `${gridConfig.gridSize}x${gridConfig.gridSize} grid with ${gridConfig.spacing} ${gridConfig.distanceUnit} spacing`,
    });
  }, [markerPosition, gridConfig, toast]);

  const handleGridConfigChange = useCallback((updates: Partial<GridConfig>) => {
    setGridConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      if (prev.enabled) {
        const currentPos = getCurrentPosition();
        if (currentPos) {
          const points = calculateGridPoints(
            currentPos.lat,
            currentPos.lng,
            newConfig.spacing,
            newConfig.gridSize,
            newConfig.distanceUnit
          );
          setGridPoints(points);
        }
      }
      
      return newConfig;
    });
  }, []);

  const handleToggleGridPoint = useCallback((pointId: string) => {
    setGridPoints(prev => 
      prev.map(point => 
        point.id === pointId 
          ? { ...point, isSelected: !point.isSelected }
          : point
      )
    );
  }, []);

  const handleCreateReport = useCallback(() => {
    const selectedPoints = gridPoints.filter(p => p.isSelected);
    
    if (selectedPoints.length === 0) {
      toast({
        variant: "destructive",
        title: "No Grid Points",
        description: "Please select at least one grid point",
      });
      return;
    }

    if (!businessWebsite.trim()) {
      toast({
        variant: "destructive",
        title: "Business Website Required",
        description: "Please enter your business website to track rankings",
      });
      setActiveTab("coordinates");
      return;
    }

    if (!gridKeyword.trim()) {
      toast({
        variant: "destructive",
        title: "Keyword Required",
        description: "Please enter a keyword to search for",
      });
      setActiveTab("grid");
      return;
    }

    const currentPos = getCurrentPosition();
    
    const reportData = {
      keyword: gridKeyword,
      websiteFilter: businessWebsite,
      gridPoints: gridPoints,
      centerLocation: currentPos,
      gridConfig: {
        distanceUnit: gridConfig.distanceUnit,
        spacing: gridConfig.spacing,
        gridSize: gridConfig.gridSize,
      },
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem("reportData", JSON.stringify(reportData));
    
    setGridConfig(prev => ({ ...prev, enabled: false }));
    setGridPoints([]);
    
    navigate("/report");
  }, [gridPoints, gridKeyword, businessWebsite, gridConfig, navigate, toast, setActiveTab]);

  const handleCancelGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, enabled: false }));
    setGridPoints([]);
  }, []);

  const handleShowPlacesOnMap = useCallback((places: PlaceResult[]) => {
    setBusinessPlaces(places);
    if (places.length > 0) {
      const avgLat = places.reduce((sum, p) => sum + p.latitude, 0) / places.length;
      const avgLng = places.reduce((sum, p) => sum + p.longitude, 0) / places.length;
      setMapCenter([avgLat, avgLng]);
      setZoom(12);
    }
  }, []);

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
        <CoordinateInputPanel
          onNavigate={handleNavigate}
          currentPosition={getCurrentPosition()}
          onSaveFavorite={handleSaveFavorite}
          onGetCurrentLocation={handleGetCurrentLocation}
          onShowGrid={handleShowGrid}
          onCreateReport={handleCreateReport}
          businessWebsite={businessWebsite}
          onBusinessWebsiteChange={setBusinessWebsite}
          gridConfig={gridConfig}
          onGridConfigChange={handleGridConfigChange}
          gridPoints={gridPoints}
          gridKeyword={gridKeyword}
          onGridKeywordChange={setGridKeyword}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
        />
        
        <div className="relative flex-1 h-full" data-testid="map-container">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="h-full w-full"
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              attribution={MAP_STYLES[mapStyle].attribution}
              url={MAP_STYLES[mapStyle].url}
            />
            <MapController center={mapCenter} zoom={zoom} />
            <MapClickHandler onMapClick={handleMapClick} />
            {markerPosition && (
              <Marker position={markerPosition} icon={customMarkerIcon}>
                <Popup>
                  <div className="p-2">
                    <p className="font-medium mb-1">Selected Location</p>
                    <p className="text-sm font-mono">
                      {Array.isArray(markerPosition)
                        ? `${markerPosition[0].toFixed(6)}°, ${markerPosition[1].toFixed(6)}°`
                        : `${markerPosition.lat.toFixed(6)}°, ${markerPosition.lng.toFixed(6)}°`}
                    </p>
                    {currentAddress && (
                      <p className="text-xs text-muted-foreground mt-2">{currentAddress}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
            {favorites.map((fav) => (
              <Marker 
                key={fav.id} 
                position={[fav.latitude, fav.longitude]} 
                icon={favoriteMarkerIcon}
              >
                <Popup>
                  <div className="p-2">
                    <p className="font-medium mb-1">{fav.name}</p>
                    <p className="text-sm font-mono">
                      {fav.latitude.toFixed(6)}°, {fav.longitude.toFixed(6)}°
                    </p>
                    {fav.address && (
                      <p className="text-xs text-muted-foreground mt-2">{fav.address}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
            {gridConfig.enabled && gridPoints.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.lat, point.lng]}
                radius={point.isCenter ? 12 : 10}
                pathOptions={{
                  fillColor: point.isCenter 
                    ? "#1e40af" 
                    : point.isSelected 
                      ? "#3b82f6" 
                      : "#94a3b8",
                  fillOpacity: point.isCenter ? 0.9 : point.isSelected ? 0.7 : 0.4,
                  color: point.isCenter ? "#1e3a8a" : point.isSelected ? "#2563eb" : "#64748b",
                  weight: point.isCenter ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => !point.isCenter && handleToggleGridPoint(point.id),
                }}
              >
                <Popup>
                  <div className="p-2 text-center">
                    <p className="font-medium mb-1">
                      {point.isCenter ? "Center Point" : `Grid Point (${point.row}, ${point.col})`}
                    </p>
                    <p className="text-sm font-mono">
                      {point.lat.toFixed(6)}°, {point.lng.toFixed(6)}°
                    </p>
                    <p className="text-xs mt-1">
                      {point.isSelected ? "Selected" : "Not Selected"}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            {businessPlaces.map((place) => (
              <CircleMarker
                key={place.cid || `place-${place.position}`}
                center={[place.latitude, place.longitude]}
                radius={8}
                pathOptions={{
                  fillColor: "#f97316",
                  fillOpacity: 0.8,
                  color: "#ea580c",
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-2 max-w-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        #{place.position}
                      </span>
                      <p className="font-medium text-sm">{place.title}</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{place.address}</p>
                    {place.rating && (
                      <p className="text-xs mb-1">
                        <span className="text-yellow-500">{'★'.repeat(Math.floor(place.rating))}</span>
                        {' '}{place.rating} ({place.ratingCount} reviews)
                      </p>
                    )}
                    {place.type && (
                      <p className="text-xs text-gray-500 mb-2">{place.type}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {place.website && (
                        <a 
                          href={place.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Website
                        </a>
                      )}
                      {place.placeId && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}&query_place_id=${place.placeId}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View in Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
          
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            mapStyle={mapStyle}
            onMapStyleChange={setMapStyle}
          />
        </div>
      </div>
      
      <SaveFavoriteDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        position={getCurrentPosition()}
        address={currentAddress}
        onSave={handleSaveFavoriteConfirm}
      />
    </>
  );
}
