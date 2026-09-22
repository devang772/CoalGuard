import { useEffect, useRef, useState } from "react";
import {
  Map,
  Layers,
  MapPin,
  Radio,
  Eye,
  Maximize2,
  Navigation,
  Compass,
  Zap,
  Check,
  Flame,
  ShieldAlert,
  Crosshair,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const gisMines = [
  {
    id: "MINE-KS-02",
    name: "Kusunda Opencast Mine",
    lat: 23.7833,
    lng: 86.4333,
    coordinates: "23.7833° N, 86.4333° E",
    elevation: "185 m AMSL",
    status: "HIGH RISK",
    tone: "high",
    sensorsActive: 28,
    slopeAngle: "42° (Displacement Warning)",
    satelliteUpdate: "5 mins ago (Sentinel-1 InSAR)",
    hazardType: "Slope Micro-Movement (4.2mm/hr)",
  },
  {
    id: "MINE-JH-01",
    name: "Jharia Underground Coal Mine",
    lat: 23.75,
    lng: 86.4167,
    coordinates: "23.7500° N, 86.4167° E",
    elevation: "210 m AMSL",
    status: "LOW RISK",
    tone: "low",
    sensorsActive: 42,
    slopeAngle: "N/A (Underground Seam 9)",
    satelliteUpdate: "12 mins ago (Sentinels 2A)",
    hazardType: "CH4 Level Normal (0.12%)",
  },
  {
    id: "MINE-MN-03",
    name: "Moonidih Shaft & Washery",
    lat: 23.7333,
    lng: 86.35,
    coordinates: "23.7333° N, 86.3500° E",
    elevation: "198 m AMSL",
    status: "MEDIUM RISK",
    tone: "medium",
    sensorsActive: 36,
    slopeAngle: "N/A (Deep Shaft Entry)",
    satelliteUpdate: "22 mins ago (Landsat 9)",
    hazardType: "Auxiliary Fan Winder Operational",
  },
  {
    id: "MINE-KR-04",
    name: "Karkali Open Pit",
    lat: 23.7667,
    lng: 85.8667,
    coordinates: "23.7667° N, 85.8667° E",
    elevation: "245 m AMSL",
    status: "CRITICAL RISK",
    tone: "critical",
    sensorsActive: 19,
    slopeAngle: "48° (DGMS Exceeded)",
    satelliteUpdate: "2 mins ago (RadarSat-2)",
    hazardType: "Dust PM10 Elevation (340 µg/m³)",
  },
  {
    id: "MINE-RN-05",
    name: "Raniganj South Seam",
    lat: 23.6167,
    lng: 87.1333,
    coordinates: "23.6167° N, 87.1333° E",
    elevation: "160 m AMSL",
    status: "LOW RISK",
    tone: "low",
    sensorsActive: 31,
    slopeAngle: "N/A",
    satelliteUpdate: "18 mins ago",
    hazardType: "Airflow Optimal (520 m³/min)",
  },
  {
    id: "MINE-SG-06",
    name: "Singrauli North Open Pit",
    lat: 24.2,
    lng: 82.6,
    coordinates: "24.2000° N, 82.6000° E",
    elevation: "290 m AMSL",
    status: "MEDIUM RISK",
    tone: "medium",
    sensorsActive: 54,
    slopeAngle: "36° (Stable)",
    satelliteUpdate: "8 mins ago",
    hazardType: "Heavy Equipment Fleet Active",
  },
];

export function GISMapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [selectedMine, setSelectedMine] = useState<(typeof gisMines)[0]>(gisMines[0]);
  const [activeTile, setActiveTile] = useState<"satellite" | "osm" | "topo">("satellite");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const layersRef = useRef<{ satellite?: any; osm?: any; topo?: any }>({});

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Load Leaflet CSS stylesheet dynamically
    if (!document.getElementById("leaflet-css-cdn")) {
      const link = document.createElement("link");
      link.id = "leaflet-css-cdn";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Dynamic loader for Leaflet library
    const loadLeaflet = () => {
      return new Promise<any>((resolve) => {
        if ((window as any).L) {
          resolve((window as any).L);
          return;
        }
        const scriptId = "leaflet-js-cdn";
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve((window as any).L));
          return;
        }
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve((window as any).L);
        document.body.appendChild(script);
      });
    };

    loadLeaflet().then((L) => {
      if (mapInstanceRef.current) return;

      // Initialize Leaflet Map centered at Dhanbad Mining Belt
      const map = L.map(mapContainerRef.current, {
        center: [23.75, 86.4167],
        zoom: 11,
        zoomControl: false,
      });

      // Add Zoom Control to bottom-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Tile Layers
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
          attribution: "Esri World Imagery GIS",
        }
      );

      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      });

      const topoLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: "OpenTopoMap",
      });

      satelliteLayer.addTo(map);

      layersRef.current = {
        satellite: satelliteLayer,
        osm: osmLayer,
        topo: topoLayer,
      };

      mapInstanceRef.current = map;
      setIsMapLoaded(true);

      // Custom Marker Icon Generator
      const createCustomIcon = (tone: string, name: string) => {
        const color =
          tone === "critical"
            ? "#f43f5e"
            : tone === "high"
            ? "#f59e0b"
            : tone === "medium"
            ? "#3b82f6"
            : "#10b981";

        return L.divIcon({
          className: "custom-leaflet-marker",
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <span style="position: absolute; width: 28px; height: 28px; border-radius: 999px; background: ${color}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <div style="width: 14px; height: 14px; border-radius: 999px; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
      };

      // Add Mine Site Markers & Telemetry Popups
      gisMines.forEach((mine) => {
        const marker = L.marker([mine.lat, mine.lng], {
          icon: createCustomIcon(mine.tone, mine.name),
        }).addTo(map);

        const popupContent = `
          <div style="font-family: inherit; padding: 4px; color: #0f172a;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">${mine.id}</div>
            <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">${mine.name}</div>
            <div style="font-size: 11px; margin-top: 4px; color: #475569;">
              📍 <strong>Coords:</strong> ${mine.coordinates}<br/>
              ⚠️ <strong>Status:</strong> <span style="font-weight:700; color: ${mine.tone === 'critical' || mine.tone === 'high' ? '#e11d48' : '#059669'};">${mine.status}</span><br/>
              📡 <strong>Telemetry:</strong> ${mine.hazardType}<br/>
              🏔️ <strong>Elevation:</strong> ${mine.elevation}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => {
          setSelectedMine(mine);
        });
      });

      // Add Hazard Boundary Polygons (Restricted Safety Zone)
      const highwallZoneCoords: [number, number][] = [
        [23.787, 86.43],
        [23.789, 86.438],
        [23.781, 86.442],
        [23.779, 86.434],
      ];

      L.polygon(highwallZoneCoords, {
        color: "#f43f5e",
        fillColor: "#f43f5e",
        fillOpacity: 0.25,
        weight: 2,
        dashArray: "5, 5",
      })
        .addTo(map)
        .bindPopup("<b>RESTRICTED HAZARD ZONE #04</b><br/>Highwall Bench 4 Slope Micro-Displacement Alert Zone");

      // Jharia Safe Zone Polygon
      const jhariaSafeZoneCoords: [number, number][] = [
        [23.754, 86.41],
        [23.758, 86.425],
        [23.744, 86.428],
        [23.742, 86.412],
      ];

      L.polygon(jhariaSafeZoneCoords, {
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.18,
        weight: 2,
      })
        .addTo(map)
        .bindPopup("<b>JHARIA SEAM 9 SAFE OPERATIONAL ZONE</b><br/>Full Compliance Verified");

      // Water Dust Buffer Circle at Karkali
      L.circle([23.7667, 85.8667], {
        radius: 1200,
        color: "#f59e0b",
        fillColor: "#f59e0b",
        fillOpacity: 0.15,
        weight: 1.5,
      })
        .addTo(map)
        .bindPopup("<b>KARKALI DUST SUPPRESSION BUFFER</b><br/>Airborne PM10 Dispersion Radius");
    });
  }, []);

  // Handle Layer Switching
  const handleSwitchTile = (tileType: "satellite" | "osm" | "topo") => {
    setActiveTile(tileType);
    if (!mapInstanceRef.current || !layersRef.current.satellite) return;

    const map = mapInstanceRef.current;
    map.removeLayer(layersRef.current.satellite);
    map.removeLayer(layersRef.current.osm);
    map.removeLayer(layersRef.current.topo);

    if (tileType === "satellite") layersRef.current.satellite.addTo(map);
    if (tileType === "osm") layersRef.current.osm.addTo(map);
    if (tileType === "topo") layersRef.current.topo.addTo(map);
  };

  // Fly Map to selected Mine coordinates
  const flyToMine = (mine: (typeof gisMines)[0]) => {
    setSelectedMine(mine);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([mine.lat, mine.lng], 14, {
        duration: 1.5,
      });
    }
  };

  // Reset Map View to region overview
  const resetMapView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([23.75, 86.4167], 11, { duration: 1.2 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight">Geospatial Intelligence & GIS Map</h2>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Radio className="size-3 animate-pulse text-emerald-500" /> Real GIS Active
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Interactive GIS geospatial map with Esri high-res satellite imagery, real mine site coordinates, slope hazard polygons, and IoT telemetry popups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={resetMapView}>
            <RotateCcw className="size-4" /> Reset Map View
          </Button>
        </div>
      </div>

      {/* Mine Selector Buttons Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
          <Crosshair className="size-3 text-primary" /> Focus Site:
        </span>
        {gisMines.map((m) => (
          <button
            key={m.id}
            onClick={() => flyToMine(m)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all border whitespace-nowrap",
              selectedMine.id === m.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold"
                : "bg-card text-foreground hover:border-primary/50"
            )}
          >
            <span className={cn("status-dot", `dot-${m.tone}`)} />
            {m.name}
          </button>
        ))}
      </div>

      {/* Main Grid: Real Leaflet Map + Inspector Panel */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Map Canvas & Controls */}
        <div className="space-y-3 lg:col-span-3">
          {/* Layer Switcher Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-muted-foreground">
              <Layers className="size-4 text-primary" /> Map Basemap Layer:
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSwitchTile("satellite")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors border",
                  activeTile === "satellite"
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "bg-background hover:bg-accent"
                )}
              >
                {activeTile === "satellite" && <Check className="size-3" />} Esri Satellite (High-Res)
              </button>
              <button
                onClick={() => handleSwitchTile("osm")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors border",
                  activeTile === "osm"
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "bg-background hover:bg-accent"
                )}
              >
                {activeTile === "osm" && <Check className="size-3" />} OpenStreetMap (Street)
              </button>
              <button
                onClick={() => handleSwitchTile("topo")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors border",
                  activeTile === "topo"
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "bg-background hover:bg-accent"
                )}
              >
                {activeTile === "topo" && <Check className="size-3" />} OpenTopo (Terrain)
              </button>
            </div>
          </div>

          {/* Leaflet Real GIS Map Container */}
          <div className="relative h-[560px] w-full overflow-hidden rounded-xl border bg-slate-950 shadow-xl">
            {!isMapLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950 text-sky-400 font-display text-sm gap-2">
                <Radio className="size-5 animate-spin" /> Loading Real GIS Satellite Layers & Geolocation Coordinates...
              </div>
            )}
            <div ref={mapContainerRef} className="h-full w-full z-0" />

            {/* Custom Telemetry HUD Box overlay on map */}
            <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-slate-900/90 p-3.5 backdrop-blur border border-slate-700 text-xs text-slate-200 space-y-1 shadow-2xl max-w-xs">
              <p className="font-semibold text-sky-400 flex items-center gap-1">
                <Compass className="size-3.5" /> GIS Real Telemetry Overlay
              </p>
              <p>Active Focus: <strong className="text-white">{selectedMine.name}</strong></p>
              <p>Coordinates: <span className="font-mono text-sky-300">{selectedMine.coordinates}</span></p>
              <p>Basemap: <span className="uppercase text-emerald-400 font-semibold">{activeTile}</span></p>
              <p className="text-[10px] text-slate-400 pt-1">
                Drag, zoom or click markers on map to view live telemetric safety readings.
              </p>
            </div>
          </div>
        </div>

        {/* Selected Site Inspector Drawer */}
        <div className="dashboard-card p-5 space-y-5">
          <div className="border-b pb-3">
            <span className="font-mono text-xs font-bold text-primary">{selectedMine.id}</span>
            <h3 className="font-display text-lg font-bold">{selectedMine.name}</h3>
            <span className={cn("status-badge mt-1", `status-${selectedMine.tone}`)}>{selectedMine.status}</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <p className="text-muted-foreground">Geographic Coordinates</p>
              <p className="font-mono font-semibold text-foreground">{selectedMine.coordinates}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Topographic Elevation</p>
              <p className="font-semibold text-foreground">{selectedMine.elevation}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Highwall Slope Parameter</p>
              <p className="font-semibold text-foreground">{selectedMine.slopeAngle}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Active IoT Telemetry Sensor Nodes</p>
              <p className="font-semibold text-emerald-600">{selectedMine.sensorsActive} Connected Nodes</p>
            </div>

            <div>
              <p className="text-muted-foreground">InSAR Satellite Radar Sync Pass</p>
              <p className="font-semibold text-foreground">{selectedMine.satelliteUpdate}</p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3.5 text-xs space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Zap className="size-3.5 text-amber-500" /> Active Safety Hazard Status
            </p>
            <p className="text-muted-foreground">{selectedMine.hazardType}</p>
          </div>

          <div className="space-y-2 pt-2">
            <Button className="w-full text-xs gap-2" onClick={() => flyToMine(selectedMine)}>
              <Crosshair className="size-3.5" /> Center Map on {selectedMine.id}
            </Button>
            <Button variant="outline" className="w-full text-xs gap-2">
              Export GeoJSON Coordinates
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
