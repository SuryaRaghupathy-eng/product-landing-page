import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ArrowLeft, Play, Edit2, Save, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, CircleMarker } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface CampaignData {
  businessWebsite: string;
  selectedLocation: { address?: string; lat: number; lng: number };
  searchKeyword: string;
  gridConfig: {
    enabled: boolean;
    distanceUnit: "meters" | "miles";
    spacing: number;
    gridSize: number;
  };
  selectedPointIds: string[];
  createdAt: string;
}

const centerMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  row: number;
  col: number;
}

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
      
      points.push({
        id: `${row}_${col}`,
        lat,
        lng,
        row,
        col,
      });
    }
  }

  return points;
}

export default function CampaignDashboard() {
  const [, setLocation] = useLocation();
  const [gridPoints, setGridPoints] = useState<GridPoint[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([40.7128, -74.0060]);
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  
  // Edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CampaignData>>({});

  const campaignDataStr = sessionStorage.getItem("campaignData");
  const initialCampaignData: CampaignData | null = campaignDataStr ? JSON.parse(campaignDataStr) : null;

  useEffect(() => {
    if (!initialCampaignData) {
      setLocation("/");
      return;
    }

    setCampaignData(initialCampaignData);

    // Calculate grid points
    const points = calculateGridPoints(
      initialCampaignData.selectedLocation.lat,
      initialCampaignData.selectedLocation.lng,
      initialCampaignData.gridConfig.spacing,
      initialCampaignData.gridConfig.gridSize,
      initialCampaignData.gridConfig.distanceUnit
    );
    setGridPoints(points);
    setMapCenter([initialCampaignData.selectedLocation.lat, initialCampaignData.selectedLocation.lng]);
  }, [setLocation]);

  if (!campaignData) {
    return null;
  }

  const selectedPoints = gridPoints.filter(p => campaignData.selectedPointIds.includes(p.id));

  const handleEditField = (field: string) => {
    setEditingField(field);
    setEditValues(campaignData);
  };

  const handleSaveEdit = () => {
    if (!editValues) return;

    const updatedData = {
      ...campaignData,
      ...editValues,
    };
    setCampaignData(updatedData);
    sessionStorage.setItem("campaignData", JSON.stringify(updatedData));
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValues({});
  };

  const handleRunReport = () => {
    // Store data for report generation
    const reportData = {
      keyword: campaignData.searchKeyword,
      websiteFilter: campaignData.businessWebsite,
      gridPoints: gridPoints.map(p => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        row: p.row,
        col: p.col,
        isSelected: campaignData.selectedPointIds.includes(p.id),
        isCenter: p.row === 0 && p.col === 0,
      })),
      centerLocation: campaignData.selectedLocation,
      gridConfig: campaignData.gridConfig,
      createdAt: campaignData.createdAt,
    };
    sessionStorage.setItem("reportData", JSON.stringify(reportData));
    setLocation("/report");
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full min-h-0">
        {/* Left Side - Campaign Details */}
        <div className="w-full lg:w-96 flex flex-col min-h-0">
          <Card className="p-6 shadow-lg flex-1 flex flex-col overflow-y-auto">
            <div className="space-y-6 flex-1">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <CheckCircle2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold">Campaign Created</h1>
                <p className="text-sm text-muted-foreground">Ready to run your ranking report</p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleRunReport}
                  className="w-full h-11 text-sm font-semibold"
                  data-testid="button-run-report"
                >
                  Run Report
                  <Play className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={() => setLocation("/review")}
                  variant="outline"
                  className="w-full text-sm"
                  data-testid="button-back-to-review"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Review
                </Button>
              </div>

              {/* Campaign Details */}
              <div className="space-y-2">
                {/* Campaign Name (Keyword) */}
                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Campaign Name</p>
                      {editingField === "keyword" ? (
                        <Input
                          value={editValues.searchKeyword || ""}
                          onChange={(e) => setEditValues({ ...editValues, searchKeyword: e.target.value })}
                          className="mt-1 text-xs h-7"
                          data-testid="input-campaign-name"
                        />
                      ) : (
                        <p className="font-semibold text-xs break-all text-primary">{campaignData.searchKeyword}</p>
                      )}
                    </div>
                    {editingField === "keyword" ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleEditField("keyword")}
                        data-testid="button-edit-keyword"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Business Website */}
                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Business Website</p>
                      {editingField === "website" ? (
                        <Input
                          value={editValues.businessWebsite || ""}
                          onChange={(e) => setEditValues({ ...editValues, businessWebsite: e.target.value })}
                          className="mt-1 text-xs h-7"
                          data-testid="input-business-website"
                        />
                      ) : (
                        <p className="font-semibold text-xs break-all">{campaignData.businessWebsite}</p>
                      )}
                    </div>
                    {editingField === "website" ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleEditField("website")}
                        data-testid="button-edit-website"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Location</p>
                      {editingField === "location" ? (
                        <Input
                          value={editValues.selectedLocation?.address || ""}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            selectedLocation: { ...(editValues.selectedLocation || campaignData.selectedLocation), address: e.target.value }
                          })}
                          className="mt-1 text-xs h-7"
                          data-testid="input-location"
                        />
                      ) : (
                        <p className="font-semibold text-xs break-all">
                          {campaignData.selectedLocation?.address || `${campaignData.selectedLocation?.lat.toFixed(4)}°, ${campaignData.selectedLocation?.lng.toFixed(4)}°`}
                        </p>
                      )}
                    </div>
                    {editingField === "location" ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleEditField("location")}
                        data-testid="button-edit-location"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Grid Configuration */}
                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Grid Configuration</p>
                      {editingField === "gridConfig" ? (
                        <div className="mt-1 space-y-2">
                          <Input
                            type="number"
                            value={editValues.gridConfig?.gridSize || ""}
                            onChange={(e) => setEditValues({
                              ...editValues,
                              gridConfig: { ...(editValues.gridConfig || campaignData.gridConfig), gridSize: parseInt(e.target.value) || 0 }
                            })}
                            placeholder="Grid size"
                            className="text-xs h-7"
                            data-testid="input-grid-size"
                          />
                          <Input
                            type="number"
                            value={editValues.gridConfig?.spacing || ""}
                            onChange={(e) => setEditValues({
                              ...editValues,
                              gridConfig: { ...(editValues.gridConfig || campaignData.gridConfig), spacing: parseInt(e.target.value) || 0 }
                            })}
                            placeholder="Spacing"
                            className="text-xs h-7"
                            data-testid="input-grid-spacing"
                          />
                        </div>
                      ) : (
                        <p className="font-semibold text-xs">
                          {campaignData.gridConfig?.gridSize}x{campaignData.gridConfig?.gridSize} grid, {campaignData.gridConfig?.spacing}{campaignData.gridConfig?.distanceUnit === "miles" ? "mi" : "m"} spacing
                        </p>
                      )}
                    </div>
                    {editingField === "gridConfig" ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleEditField("gridConfig")}
                        data-testid="button-edit-grid-config"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Grid Points Selection Counter */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-muted-foreground">Grid Points Selected</p>
                  <p className="font-bold text-lg text-blue-600 dark:text-blue-400" data-testid="text-dashboard-selected-count">
                    {selectedPoints.length} / {gridPoints.length}
                  </p>
                </div>

                {/* Edit Mode Save/Cancel Buttons */}
                {editingField && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      className="flex-1 h-8 text-xs"
                      data-testid="button-save-edit"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="flex-1 h-8 text-xs"
                      data-testid="button-cancel-edit"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                <p className="text-xs font-medium">What happens when you run the report?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Search rankings across selected grid locations</li>
                  <li>• Find where your website ranks for the keyword</li>
                  <li>• Identify top-performing locations</li>
                  <li>• Generate comprehensive analysis report</li>
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

              {/* Center marker */}
              {campaignData.selectedLocation && (
                <Marker
                  position={[campaignData.selectedLocation.lat, campaignData.selectedLocation.lng]}
                  icon={centerMarkerIcon}
                />
              )}

              {/* Grid points */}
              {gridPoints.map((point) => {
                const isSelected = campaignData.selectedPointIds.includes(point.id);
                return (
                  <CircleMarker
                    key={point.id}
                    center={[point.lat, point.lng]}
                    radius={isSelected ? 8 : 6}
                    fillColor={isSelected ? "#22c55e" : "#d1d5db"}
                    color={isSelected ? "#16a34a" : "#9ca3af"}
                    weight={isSelected ? 2 : 1}
                    opacity={isSelected ? 1 : 0.6}
                    fillOpacity={isSelected ? 0.8 : 0.5}
                    data-testid={`campaign-grid-point-${point.id}`}
                  />
                );
              })}
            </MapContainer>
            
            {/* Map hint overlay */}
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 px-3 py-2 rounded-lg text-xs text-muted-foreground pointer-events-none">
              Campaign map preview
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
