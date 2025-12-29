import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import { Icon, LatLngExpression, LatLngBounds, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

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

const centerMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Create a custom SVG icon for selected grid points with checkmark
const createCheckmarkIcon = () => {
  return new DivIcon({
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background-color: #22c55e;
        border: 2px solid #16a34a;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: "custom-checkmark-icon",
  });
};

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

function MapBoundsController({ gridPoints }: { gridPoints: GridPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (gridPoints.length > 0) {
      const bounds = new LatLngBounds(
        gridPoints.map((point) => [point.lat, point.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [gridPoints, map]);

  return null;
}

export default function Step5Review() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());

  const businessWebsite = sessionStorage.getItem("businessWebsite");
  const selectedLocationStr = sessionStorage.getItem("selectedLocation");
  const searchKeyword = sessionStorage.getItem("searchKeyword");
  const gridConfigStr = sessionStorage.getItem("gridConfig");

  let selectedLocation = null;
  let gridConfig: GridConfig | null = null;
  let gridPoints: GridPoint[] = [];
  let mapCenter: LatLngExpression = [40.7128, -74.0060];

  if (selectedLocationStr) {
    try {
      selectedLocation = JSON.parse(selectedLocationStr);
      if (selectedLocation?.lat && selectedLocation?.lng) {
        mapCenter = [selectedLocation.lat, selectedLocation.lng];
      }
    } catch {
      selectedLocation = null;
    }
  }

  if (gridConfigStr) {
    try {
      gridConfig = JSON.parse(gridConfigStr);
      if (selectedLocation && gridConfig) {
        gridPoints = calculateGridPoints(
          selectedLocation.lat,
          selectedLocation.lng,
          gridConfig.spacing,
          gridConfig.gridSize,
          gridConfig.distanceUnit
        );
        // Initialize all points as selected
        if (selectedPointIds.size === 0) {
          setSelectedPointIds(new Set(gridPoints.map((p) => p.id)));
        }
      }
    } catch {
      gridConfig = null;
    }
  }

  // Redirect if missing previous steps
  useEffect(() => {
    if (!businessWebsite || !selectedLocation || !searchKeyword || !gridConfig) {
      setLocation("/");
    }
  }, [businessWebsite, selectedLocation, searchKeyword, gridConfig, setLocation]);

  const togglePointSelection = (pointId: string) => {
    const newSelected = new Set(selectedPointIds);
    if (newSelected.has(pointId)) {
      newSelected.delete(pointId);
    } else {
      newSelected.add(pointId);
    }
    setSelectedPointIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedPointIds(new Set(gridPoints.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedPointIds(new Set());
  };

  const handleCreateCampaign = () => {
    if (selectedPointIds.size === 0) {
      toast({
        title: "No points selected",
        description: "Please select at least one grid point to create a campaign.",
        variant: "destructive",
      });
      return;
    }
    
    // Store campaign data for dashboard
    const campaignData = {
      businessWebsite,
      selectedLocation,
      searchKeyword,
      gridConfig,
      selectedPointIds: Array.from(selectedPointIds),
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem("campaignData", JSON.stringify(campaignData));
    setLocation("/dashboard");
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full min-h-0">
        {/* Left Side - Summary Cards */}
        <div className="w-full lg:w-96 flex flex-col min-h-0">
          <Card className="p-6 shadow-lg flex-1 flex flex-col overflow-y-auto">
            <div className="space-y-3 flex-1">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold">Ready to Analyze</h1>
                <p className="text-sm text-muted-foreground">Step 5 of 5: Review & Generate Report</p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-2">
                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Business Website</p>
                    <p className="font-semibold text-xs break-all text-primary">{businessWebsite}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocation("/")}
                    data-testid="button-edit-step1-from-review"
                    className="flex-shrink-0 h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-semibold text-xs break-all">
                      {selectedLocation?.address || `${selectedLocation?.lat.toFixed(4)}°, ${selectedLocation?.lng.toFixed(4)}°`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocation("/location")}
                    data-testid="button-edit-step2-from-review"
                    className="flex-shrink-0 h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Keyword</p>
                    <p className="font-semibold text-xs break-all">{searchKeyword}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocation("/keyword")}
                    data-testid="button-edit-step3-from-review"
                    className="flex-shrink-0 h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Grid Configuration</p>
                    <p className="font-semibold text-xs">
                      {gridConfig?.gridSize}x{gridConfig?.gridSize} grid, {gridConfig?.spacing}{gridConfig?.distanceUnit === "miles" ? "mi" : "m"} spacing
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocation("/grid")}
                    data-testid="button-edit-step4-from-review"
                    className="flex-shrink-0 h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>

              </div>

              {/* Grid Points Selection Counter and Selection Controls Row */}
              <div className="flex gap-2">
                {/* Grid Points Selection Counter */}
                <div className="flex-1 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-muted-foreground leading-tight">Grid Points Selected</p>
                  <p className="font-bold text-base text-green-600 dark:text-green-400 leading-tight" data-testid="text-selected-count">
                    {selectedPointIds.size} / {gridPoints.length}
                  </p>
                </div>

                {/* Selection Controls - Grouped in Column */}
                <div className="flex flex-col gap-1 w-32">
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    data-testid="button-select-all"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={handleDeselectAll}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    data-testid="button-deselect-all"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Button */}
              <Button
                onClick={handleCreateCampaign}
                className="w-full h-10 text-sm font-semibold"
                data-testid="button-create-campaign"
                disabled={selectedPointIds.size === 0}
              >
                Create Campaign
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {/* Description */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                <p className="text-xs font-medium">What will happen next?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Search rankings across selected grid locations</li>
                  <li>• Find where your business website ranks</li>
                  <li>• Identify top-performing locations</li>
                  <li>• Generate comprehensive grid report</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side - Map Preview */}
        <div className="flex-1 min-h-96 lg:min-h-full relative">
          <Card className="p-0 shadow-lg h-full overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ width: "100%", height: "100%" }}
              className="rounded-lg"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Map bounds controller - fits all grid points */}
              <MapBoundsController gridPoints={gridPoints} />

              {/* Center marker */}
              {selectedLocation && (
                <Marker
                  position={[selectedLocation.lat, selectedLocation.lng]}
                  icon={centerMarkerIcon}
                >
                </Marker>
              )}

              {/* Grid points */}
              {gridPoints.map((point) => {
                const isPointSelected = selectedPointIds.has(point.id);
                
                return (
                  <div key={point.id}>
                    {/* Circle marker - green for selected, gray for unselected */}
                    <CircleMarker
                      center={[point.lat, point.lng]}
                      radius={isPointSelected ? 8 : 6}
                      fillColor={isPointSelected ? "#22c55e" : "#d1d5db"}
                      color={isPointSelected ? "#16a34a" : "#9ca3af"}
                      weight={isPointSelected ? 2 : 1}
                      opacity={isPointSelected ? 1 : 0.6}
                      fillOpacity={isPointSelected ? 0.8 : 0.5}
                      eventHandlers={{
                        click: () => togglePointSelection(point.id),
                      }}
                      data-testid={`grid-point-${point.id}`}
                    />
                    
                    {/* Checkmark icon only on selected points */}
                    {isPointSelected && (
                      <Marker
                        position={[point.lat, point.lng]}
                        icon={createCheckmarkIcon()}
                        interactive={false}
                      />
                    )}
                  </div>
                );
              })}
            </MapContainer>
            
            {/* Map hint overlay */}
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 px-3 py-2 rounded-lg text-xs text-muted-foreground pointer-events-none">
              Click grid points to select/deselect
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
