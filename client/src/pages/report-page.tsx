import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, MapPin, Grid3X3, Download, TrendingUp, TrendingDown, Target, Globe, Phone, Star, Building2, Loader2, AlertCircle, Map } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
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

interface PlaceResult {
  position: number;
  title: string;
  address: string;
  rating?: number;
  ratingCount?: number;
  type?: string;
  website?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
}

interface GridSearchResult {
  pointId: string;
  lat: number;
  lng: number;
  row: number;
  col: number;
  rank: number | null;
  matchedPlace?: PlaceResult;
  places: PlaceResult[];
  error?: string;
}

interface GridSearchResponse {
  keyword: string;
  targetWebsite: string;
  totalPoints: number;
  summary: {
    avgRank: number | null;
    foundCount: number;
    notFoundCount: number;
    top3Count: number;
    top3Percent: number;
    top10Count: number;
    top10Percent: number;
    top20Count: number;
    top20Percent: number;
  };
  results: GridSearchResult[];
}

interface ReportData {
  keyword: string;
  websiteFilter: string;
  gridPoints: GridPoint[];
  centerLocation: { lat: number; lng: number; address?: string } | null;
  gridConfig: {
    distanceUnit: "meters" | "miles";
    spacing: number;
    gridSize: number;
  };
  createdAt: string;
  searchResults?: GridSearchResponse;
}

function getRankColor(rank: number | null): string {
  if (rank === null) return "#9CA3AF"; // gray
  if (rank <= 3) return "#22C55E"; // green
  if (rank <= 10) return "#F59E0B"; // yellow/amber
  if (rank <= 20) return "#F97316"; // orange
  return "#EF4444"; // red
}

function getRankBgClass(rank: number | null): string {
  if (rank === null) return "bg-gray-400 dark:bg-gray-600";
  if (rank <= 3) return "bg-green-500 dark:bg-green-600";
  if (rank <= 10) return "bg-yellow-500 dark:bg-yellow-600";
  if (rank <= 20) return "bg-orange-500 dark:bg-orange-600";
  return "bg-red-500 dark:bg-red-600";
}

function getRankTextColor(rank: number | null): string {
  if (rank === null) return "text-gray-600 dark:text-gray-400";
  if (rank <= 3) return "text-green-600 dark:text-green-400";
  if (rank <= 10) return "text-yellow-600 dark:text-yellow-400";
  if (rank <= 20) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getRankBadgeVariant(rank: number | null): "default" | "secondary" | "destructive" | "outline" {
  if (rank === null) return "secondary";
  if (rank <= 3) return "default";
  if (rank <= 10) return "outline";
  return "destructive";
}

function MapBoundsUpdater({ results }: { results: GridSearchResult[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (results.length > 0) {
      const bounds = results.map(r => [r.lat, r.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [results, map]);
  
  return null;
}

export default function ReportPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPoint, setSelectedPoint] = useState<GridSearchResult | null>(null);
  const [searchResults, setSearchResults] = useState<GridSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasStartedSearch, setHasStartedSearch] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "grid">("map");
  
  const storedData = sessionStorage.getItem("reportData");
  const reportData: ReportData | null = storedData ? JSON.parse(storedData) : null;

  const gridSearchMutation = useMutation({
    mutationFn: async (data: { gridPoints: any[]; keyword: string; targetWebsite: string }) => {
      console.log("Starting grid search with:", data);
      const response = await apiRequest("POST", "/api/grid-search", data);
      const result = await response.json();
      console.log("Grid search result:", result);
      return result as GridSearchResponse;
    },
    onSuccess: (data: GridSearchResponse) => {
      console.log("Grid search success:", data);
      setSearchResults(data);
      setIsSearching(false);
      if (reportData) {
        const updatedData = { ...reportData, searchResults: data };
        sessionStorage.setItem("reportData", JSON.stringify(updatedData));
      }
    },
    onError: (error: Error) => {
      console.error("Grid search error:", error);
      setIsSearching(false);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message || "Failed to perform grid search",
      });
    },
  });

  useEffect(() => {
    if (!reportData) return;
    
    if (reportData.searchResults && !searchResults) {
      console.log("Loading cached search results");
      setSearchResults(reportData.searchResults);
      return;
    }
    
    if (!hasStartedSearch && !isSearching && !searchResults && !reportData.searchResults) {
      const selectedPoints = reportData.gridPoints.filter(p => p.isSelected);
      if (selectedPoints.length > 0 && reportData.keyword) {
        console.log("Starting new grid search");
        setHasStartedSearch(true);
        setIsSearching(true);
        gridSearchMutation.mutate({
          gridPoints: selectedPoints,
          keyword: reportData.keyword,
          targetWebsite: reportData.websiteFilter || "",
        });
      }
    }
  }, [reportData, hasStartedSearch, isSearching, searchResults]);

  if (!reportData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Report Data</h2>
          <p className="text-muted-foreground mb-4">
            Please create a report from the map page first.
          </p>
          <Button onClick={() => navigate("/")} data-testid="button-back-to-map">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Map
          </Button>
        </Card>
      </div>
    );
  }

  const selectedPoints = reportData.gridPoints.filter(p => p.isSelected);
  const centerPoint = reportData.gridPoints.find(p => p.isCenter);

  const getResultForPoint = (point: GridPoint): GridSearchResult | undefined => {
    return searchResults?.results.find(r => r.pointId === point.id);
  };

  const handleExportCSV = () => {
    if (!searchResults) {
      const headers = ["Point ID", "Row", "Column", "Latitude", "Longitude", "Is Center", "Is Selected"];
      const rows = selectedPoints.map(point => [
        point.id,
        point.row,
        point.col,
        point.lat.toFixed(6),
        point.lng.toFixed(6),
        point.isCenter ? "Yes" : "No",
        point.isSelected ? "Yes" : "No"
      ]);

      const csvContent = [
        `# Report Generated: ${reportData.createdAt}`,
        `# Keyword: ${reportData.keyword || "Not specified"}`,
        `# Website Filter: ${reportData.websiteFilter || "Not specified"}`,
        `# Grid Size: ${reportData.gridConfig.gridSize}x${reportData.gridConfig.gridSize}`,
        `# Spacing: ${reportData.gridConfig.spacing} ${reportData.gridConfig.distanceUnit}`,
        "",
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      downloadCSV(csvContent, "grid-coordinates");
    } else {
      const headers = ["Point ID", "Row", "Column", "Latitude", "Longitude", "Rank", "Business Name", "Address", "Rating", "Website"];
      const rows = searchResults.results.map(result => [
        result.pointId,
        result.row,
        result.col,
        result.lat.toFixed(6),
        result.lng.toFixed(6),
        result.rank || "Not Found",
        result.matchedPlace?.title || "",
        `"${(result.matchedPlace?.address || "").replace(/"/g, '""')}"`,
        result.matchedPlace?.rating || "",
        result.matchedPlace?.website || ""
      ]);

      const csvContent = [
        `# Local Search Grid Report`,
        `# Generated: ${reportData.createdAt}`,
        `# Keyword: ${searchResults.keyword}`,
        `# Target Website: ${searchResults.targetWebsite || "Not specified"}`,
        `# Grid Size: ${reportData.gridConfig.gridSize}x${reportData.gridConfig.gridSize}`,
        `# Spacing: ${reportData.gridConfig.spacing} ${reportData.gridConfig.distanceUnit}`,
        `# Average Rank: ${searchResults.summary.avgRank || "N/A"}`,
        `# Found in Top 3: ${searchResults.summary.top3Percent}%`,
        `# Found in Top 10: ${searchResults.summary.top10Percent}%`,
        `# Found in Top 20: ${searchResults.summary.top20Percent}%`,
        "",
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      downloadCSV(csvContent, "local-search-grid-report");
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const gridSize = reportData.gridConfig.gridSize;
  const half = Math.floor(gridSize / 2);

  const renderGridVisualization = () => {
    const rows = [];
    for (let row = -half; row <= half; row++) {
      const cells = [];
      for (let col = -half; col <= half; col++) {
        const point = reportData.gridPoints.find(p => p.row === row && p.col === col);
        const result = point ? getResultForPoint(point) : undefined;
        const rank = result?.rank ?? null;
        const isCenter = point?.isCenter || false;
        
        cells.push(
          <button
            key={`${row}_${col}`}
            onClick={() => result && setSelectedPoint(result)}
            className={`
              w-10 h-10 md:w-12 md:h-12 rounded-md flex items-center justify-center text-sm font-bold
              transition-all cursor-pointer
              ${getRankBgClass(rank)}
              ${isCenter ? "ring-2 ring-blue-600 ring-offset-2" : ""}
              ${result ? "hover:scale-110" : "opacity-50"}
              text-white
            `}
            data-testid={`grid-cell-${row}-${col}`}
            disabled={!result}
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : rank !== null ? (
              rank
            ) : result ? (
              <XIcon className="w-4 h-4" />
            ) : (
              "-"
            )}
          </button>
        );
      }
      rows.push(
        <div key={row} className="flex gap-1 md:gap-2 justify-center">
          {cells}
        </div>
      );
    }
    return rows;
  };

  const defaultCenter = centerPoint 
    ? { lat: centerPoint.lat, lng: centerPoint.lng }
    : reportData.centerLocation 
    ? { lat: reportData.centerLocation.lat, lng: reportData.centerLocation.lng }
    : { lat: 52.5, lng: -1.9 }; // Default to UK midlands

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back-to-map"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Local Search Grid Report
                </h1>
                <p className="text-sm text-muted-foreground">
                  {reportData.keyword || "No keyword"} - Generated on {new Date(reportData.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md">
                <Button 
                  variant={viewMode === "map" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  data-testid="button-view-map"
                >
                  <Map className="w-4 h-4 mr-1" />
                  Map
                </Button>
                <Button 
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Grid
                </Button>
              </div>
              <Button onClick={handleExportCSV} data-testid="button-export-csv">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {isSearching && (
          <div className="container mx-auto px-4 py-4">
            <Card className="p-6">
              <div className="flex items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div>
                  <h3 className="font-semibold">Searching Grid Points...</h3>
                  <p className="text-sm text-muted-foreground">
                    Checking rankings for "{reportData.keyword}" across {selectedPoints.length} locations
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {searchResults && (
          <>
            <div className="px-4 py-4 flex-shrink-0 border-b">
              <div className="container mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <TrendingUp className="w-4 h-4" />
                      Avg Rank
                    </div>
                    <p className={`font-bold text-2xl ${getRankTextColor(searchResults.summary.avgRank)}`} data-testid="text-avg-rank">
                      {searchResults.summary.avgRank || "N/A"}
                    </p>
                  </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <FileText className="w-4 h-4" />
                    Keyword Count
                  </div>
                  <p className="font-bold text-2xl text-blue-600 dark:text-blue-400" data-testid="text-keyword-count">
                    1
                  </p>
                  <p className="text-xs text-muted-foreground">keyword searched</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Target className="w-4 h-4" />
                    Found
                  </div>
                  <p className="font-bold text-2xl text-green-600 dark:text-green-400" data-testid="text-found-count">
                    {searchResults.summary.foundCount}/{searchResults.totalPoints}
                  </p>
                </Card>

                <Card className="p-4 bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm mb-1">
                    1-3 position
                  </div>
                  <p className="font-bold text-2xl text-green-600 dark:text-green-400" data-testid="text-top3">
                    {searchResults.summary.top3Percent}%
                  </p>
                  <p className="text-xs text-muted-foreground">{searchResults.summary.top3Count} points</p>
                </Card>

                <Card className="p-4 bg-yellow-50 dark:bg-yellow-950">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm mb-1">
                    4-10 position
                  </div>
                  <p className="font-bold text-2xl text-yellow-600 dark:text-yellow-400" data-testid="text-top10">
                    {searchResults.summary.top10Percent}%
                  </p>
                  <p className="text-xs text-muted-foreground">{searchResults.summary.top10Count} points</p>
                </Card>

                <Card className="p-4 bg-orange-50 dark:bg-orange-950">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm mb-1">
                    11-20 position
                  </div>
                  <p className="font-bold text-2xl text-orange-600 dark:text-orange-400" data-testid="text-top20">
                    {searchResults.summary.top20Percent}%
                  </p>
                  <p className="text-xs text-muted-foreground">{searchResults.summary.top20Count} points</p>
                </Card>

                <Card className="p-4 bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm mb-1">
                    Not Found
                  </div>
                  <p className="font-bold text-2xl text-red-600 dark:text-red-400" data-testid="text-not-found">
                    {searchResults.summary.notFoundCount}
                  </p>
                  <p className="text-xs text-muted-foreground">points</p>
                  </Card>
                </div>
              </div>
            </div>

            {viewMode === "map" ? (
              <div className="flex-1 flex min-h-0">
                <div className="w-[60%] relative">
                  <MapContainer
                    center={[defaultCenter.lat, defaultCenter.lng]}
                    zoom={10}
                    className="h-full w-full min-h-[500px]"
                    style={{ height: "calc(100vh - 280px)" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapBoundsUpdater results={searchResults.results} />
                    
                    {searchResults.results.map((result) => {
                      const isCenter = centerPoint && result.lat === centerPoint.lat && result.lng === centerPoint.lng;
                      const color = getRankColor(result.rank);
                      const size = isCenter ? 36 : 32;
                      const borderColor = isCenter ? "#3B82F6" : "#FFFFFF";
                      const borderWidth = isCenter ? 3 : 2;
                      
                      const icon = L.divIcon({
                        className: 'custom-rank-marker',
                        html: `<div style="
                          width: ${size}px;
                          height: ${size}px;
                          background-color: ${color};
                          border: ${borderWidth}px solid ${borderColor};
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-weight: bold;
                          font-size: ${result.rank !== null && result.rank > 99 ? '10px' : '12px'};
                          color: white;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                          cursor: pointer;
                        ">${result.rank !== null ? result.rank : 'X'}</div>`,
                        iconSize: [size, size],
                        iconAnchor: [size / 2, size / 2],
                      });
                      
                      return (
                        <Marker
                          key={result.pointId}
                          position={[result.lat, result.lng]}
                          icon={icon}
                          eventHandlers={{
                            click: () => setSelectedPoint(result),
                          }}
                        >
                          <Popup>
                            <div className="text-center min-w-[150px]">
                              <div className="font-bold text-lg mb-1">
                                {result.rank !== null ? `Rank #${result.rank}` : "Not Found"}
                              </div>
                              {result.matchedPlace && (
                                <div className="text-sm">
                                  <p className="font-medium">{result.matchedPlace.title}</p>
                                  <p className="text-muted-foreground text-xs">{result.matchedPlace.address}</p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                  
                  {/* Rank number overlay using CSS */}
                  <style>{`
                    .leaflet-interactive {
                      cursor: pointer;
                    }
                  `}</style>
                  
                  {/* Custom rank labels */}
                  <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 z-[1000]">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span>Top 3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span>4-10</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                        <span>11-20</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span>21+</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                        <span>Not Found</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Details sidebar */}
                <div className="w-[40%] border-l bg-card min-h-0 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto flex flex-col">
                    <div className="px-4 pt-4 pb-2 flex-shrink-0">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {selectedPoint ? "Location Details" : "Select a Point"}
                      </h2>
                    </div>
                    {selectedPoint ? (
                      <div className="flex-1 px-4 pb-4">
                        <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Grid Position</p>
                          <p className="font-medium">Row {selectedPoint.row}, Col {selectedPoint.col}</p>
                        </div>
                        <Badge variant={getRankBadgeVariant(selectedPoint.rank)}>
                          {selectedPoint.rank ? `Rank #${selectedPoint.rank}` : "Not Found"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Coordinates</p>
                        <p className="font-mono text-sm">
                          {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
                        </p>
                      </div>
                      {selectedPoint.matchedPlace && (
                        <div className="border-t pt-4 space-y-3">
                          <h4 className="font-semibold text-green-600 dark:text-green-400">
                            Target Business Found
                          </h4>
                          <div>
                            <p className="font-medium">{selectedPoint.matchedPlace.title}</p>
                            <p className="text-sm text-muted-foreground">{selectedPoint.matchedPlace.address}</p>
                          </div>
                          {selectedPoint.matchedPlace.rating && (
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>{selectedPoint.matchedPlace.rating}</span>
                              <span className="text-muted-foreground">
                                ({selectedPoint.matchedPlace.ratingCount} reviews)
                              </span>
                            </div>
                          )}
                          {selectedPoint.matchedPlace.website && (
                            <a 
                              href={selectedPoint.matchedPlace.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary hover:underline text-sm"
                            >
                              <Globe className="w-4 h-4" />
                              Visit Website
                            </a>
                          )}
                          {selectedPoint.matchedPlace.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4" />
                              {selectedPoint.matchedPlace.phoneNumber}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedPoint.places.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="font-semibold mb-2">Top Results at This Location</h4>
                          <div className="space-y-2">
                            {selectedPoint.places.slice(0, 10).map((place, idx) => (
                              <div 
                                key={idx} 
                                className={`p-2 rounded text-sm ${
                                  place.position === selectedPoint.rank 
                                    ? "bg-green-100 dark:bg-green-900 border border-green-500" 
                                    : "bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">#{place.position} {place.title}</span>
                                  {place.rating && (
                                    <span className="flex items-center gap-1 text-xs">
                                      <Star className="w-3 h-3 text-yellow-500" />
                                      {place.rating}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
                        <MapPin className="w-12 h-12 mb-4" />
                        <p className="text-center">Click on a circle on the map to view details</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="container mx-auto px-4 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Grid3X3 className="w-5 h-5" />
                      Ranking Grid
                    </h2>
                    <div className="flex flex-col gap-1 md:gap-2 items-center">
                      {renderGridVisualization()}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 justify-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                        <span>Top 3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-500"></div>
                        <span>4-10</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-500"></div>
                        <span>11-20</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500"></div>
                        <span>21+</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-400"></div>
                        <span>Not Found</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Click on a cell to see detailed results for that location
                    </p>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {selectedPoint ? "Location Details" : "Select a Grid Point"}
                    </h2>
                    {selectedPoint ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Grid Position</p>
                            <p className="font-medium">Row {selectedPoint.row}, Col {selectedPoint.col}</p>
                          </div>
                          <Badge variant={getRankBadgeVariant(selectedPoint.rank)}>
                            {selectedPoint.rank ? `Rank #${selectedPoint.rank}` : "Not Found"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Coordinates</p>
                          <p className="font-mono text-sm">
                            {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
                          </p>
                        </div>
                        {selectedPoint.matchedPlace && (
                          <div className="border-t pt-4 space-y-3">
                            <h4 className="font-semibold text-green-600 dark:text-green-400">
                              Target Business Found
                            </h4>
                            <div>
                              <p className="font-medium">{selectedPoint.matchedPlace.title}</p>
                              <p className="text-sm text-muted-foreground">{selectedPoint.matchedPlace.address}</p>
                            </div>
                            {selectedPoint.matchedPlace.rating && (
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span>{selectedPoint.matchedPlace.rating}</span>
                                <span className="text-muted-foreground">
                                  ({selectedPoint.matchedPlace.ratingCount} reviews)
                                </span>
                              </div>
                            )}
                            {selectedPoint.matchedPlace.website && (
                              <a 
                                href={selectedPoint.matchedPlace.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline text-sm"
                              >
                                <Globe className="w-4 h-4" />
                                Visit Website
                              </a>
                            )}
                            {selectedPoint.matchedPlace.phoneNumber && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4" />
                                {selectedPoint.matchedPlace.phoneNumber}
                              </div>
                            )}
                          </div>
                        )}
                        {selectedPoint.places.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">Top Results at This Location</h4>
                            <div className="space-y-2">
                              {selectedPoint.places.slice(0, 10).map((place, idx) => (
                                <div 
                                  key={idx} 
                                  className={`p-2 rounded text-sm ${
                                    place.position === selectedPoint.rank 
                                      ? "bg-green-100 dark:bg-green-900 border border-green-500" 
                                      : "bg-muted/50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">#{place.position} {place.title}</span>
                                    {place.rating && (
                                      <span className="flex items-center gap-1 text-xs">
                                        <Star className="w-3 h-3 text-yellow-500" />
                                        {place.rating}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <MapPin className="w-12 h-12 mb-4" />
                        <p>Click on a grid cell to view details</p>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {!searchResults && !isSearching && !reportData.keyword && (
          <div className="container mx-auto px-4 py-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-8 h-8" />
                <div>
                  <h3 className="font-semibold">No Keyword Specified</h3>
                  <p className="text-sm text-muted-foreground">
                    Please go back and enter a search keyword to generate ranking data.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
