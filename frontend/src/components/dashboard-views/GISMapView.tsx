import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGisMinesApi, getGisPinsApi, type Row } from "@/lib/api";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const riskColor: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };

export function GISMapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<unknown>(null);
  const [mines, setMines] = useState<Row | null>(null);
  const [pins, setPins] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [gis, pinsData] = await Promise.all([getGisMinesApi(), getGisPinsApi()]);
      setMines(gis); setPins(pinsData);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load GIS data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!mines || !mapRef.current || leafletRef.current) return;
    void import("leaflet").then(L => {
      if (!mapRef.current || leafletRef.current) return;
      // @ts-expect-error leaflet css
      const linkEl = document.createElement("link");
      linkEl.rel = "stylesheet"; linkEl.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(linkEl);

      const map = L.map(mapRef.current, { center: [22.5, 85.0], zoom: 6 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 18 }).addTo(map);

      // GeoJSON mine boundaries
      const features = (mines as Record<string, unknown>);
      if (features && typeof features === "object") {
        try {
          L.geoJSON(features as Parameters<typeof L.geoJSON>[0], {
            style: (feature) => {
              const level = String(feature?.properties?.risk_level ?? "medium").toLowerCase();
              return { color: riskColor[level] ?? riskColor.medium, weight: 2, fillOpacity: 0.15 };
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties as Record<string, unknown>;
              layer.bindPopup(`
                <strong>${String(p.name ?? "")}</strong><br/>
                ${String(p.subsidiary ?? "")} · ${String(p.mine_type ?? "")}<br/>
                Compliance: <strong>${String(p.compliance_pct ?? "—")}%</strong><br/>
                Risk: <span style="color:${riskColor[String(p.risk_level ?? "").toLowerCase()] ?? "#888"}">${String(p.risk_level ?? "—")}</span><br/>
                Overdue tasks: ${String(p.overdue_tasks ?? 0)} · Open CAPAs: ${String(p.open_capas ?? 0)}
              `);
            }
          }).addTo(map);
        } catch { /* boundary parsing error */ }
      }

      // Pins
      for (const pin of pins) {
        const lat = Number(pin.lat); const lng = Number(pin.lng);
        if (!lat || !lng) continue;
        const color = pin.type === "sos" ? "#ef4444" : pin.severity === "critical" ? "#f97316" : "#6366f1";
        const icon = L.divIcon({ html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`, className: "" });
        L.marker([lat, lng], { icon }).bindPopup(`<strong>${String(pin.title ?? "")}</strong><br/>${String(pin.type ?? "")} · ${String(pin.mine_name ?? "")}`).addTo(map);
      }

      leafletRef.current = map;
      setMapReady(true);

      // Fit bounds to mine centers
      const centers: [number, number][] = pins.filter(p => p.lat && p.lng).map(p => [Number(p.lat), Number(p.lng)]);
      if (centers.length > 0) try { map.fitBounds(L.latLngBounds(centers), { padding: [30, 30] }); } catch { /* ignore */ }
    });
  }, [mines, pins]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><MapIcon className="size-6 text-primary" /> GIS Mine Map</h2>
          <p className="text-sm text-muted-foreground">Real GeoJSON boundaries and live pins from the backend.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-red-400 border border-white inline-block" /> High risk</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-amber-400 border border-white inline-block" /> Medium risk</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-green-400 border border-white inline-block" /> Low risk</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-red-500 border border-white inline-block" /> SOS / Critical pin</span>
        <span>{pins.length} pins loaded</span>
      </div>

      <div className="dashboard-card overflow-hidden" style={{ height: 560 }}>
        {loading && <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading map data…</div>}
        {!loading && !error && <div ref={mapRef} style={{ height: "100%", width: "100%" }} />}
      </div>

      {!mapReady && !loading && !error && (
        <p className="text-xs text-muted-foreground">Map is initialising…</p>
      )}
    </div>
  );
}
