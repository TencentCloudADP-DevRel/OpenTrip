import { useEffect, useRef, useState } from "react";
import {
  type GeoJSONSource,
  LngLatBounds,
  Map as MlMap,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";
import type { MapStop } from "./types";
import "./map.css";

const STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export interface TripMapProps {
  stops: MapStop[];
  /** 0 = all days, otherwise the day number. */
  day: number;
  activeStopId?: string | null;
  onSelectStop?: (id: string) => void;
  unavailableLabel?: string;
  /** When true, the map enters point-picking mode (pushpin cursor). */
  picking?: boolean;
  /** Called with the clicked coordinates while `picking`. */
  onPick?: (lng: number, lat: number) => void;
  /** Called with the coordinates of a right-click / long-press. */
  onContext?: (lng: number, lat: number) => void;
}

/** Pushpin cursor (data URI) with the hotspot at the pin tip. */
const PIN_CURSOR =
  "url(\"data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23e11d48" stroke="white" stroke-width="1.5"><path d="M12 2c-3.9 0-7 3.1-7 7 0 5 7 13 7 13s7-8 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white" stroke="none"/></svg>',
  ) +
  "\") 16 30, crosshair";

/** MapLibre wrapper in the spirit of mapcn: CARTO positron basemap, per-day
 * colored routes, numbered markers, and active-stop focus. */
export function TripMap({
  stops,
  day,
  activeStopId,
  onSelectStop,
  unavailableLabel = "Map unavailable offline",
  picking = false,
  onPick,
  onContext,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const readyRef = useRef(false);
  const lastFitRef = useRef<string | null>(null);
  const selectRef = useRef(onSelectStop);
  const pickRef = useRef(onPick);
  const contextRef = useRef(onContext);
  const [failed, setFailed] = useState(false);
  selectRef.current = onSelectStop;
  pickRef.current = onPick;
  contextRef.current = onContext;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MlMap;
    try {
      map = new MlMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: [136.8, 35.1],
        zoom: 6.4,
        attributionControl: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", () => setFailed(true));
    map.on("contextmenu", (e) => {
      contextRef.current?.(e.lngLat.lng, e.lngLat.lat);
    });
    map.on("load", () => {
      map.addSource("trip-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "trip-route-casing",
        type: "line",
        source: "trip-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.9 },
      });
      map.addLayer({
        id: "trip-route-line",
        type: "line",
        source: "trip-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });
      readyRef.current = true;
      map.resize();
      // trigger the first sync
      setFailed((f) => f);
      syncRef.current();
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // Keep a stable ref to the latest sync so map load can call it.
  const syncRef = useRef<() => void>(() => {});
  syncRef.current = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const visible = day === 0 ? stops : stops.filter((s) => s.day === day);
    const active = activeStopId ?? "";

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    for (const s of visible) {
      const el = document.createElement("div");
      el.className = "trip-map-marker";
      el.style.background = s.color;
      el.textContent = String(s.num);
      el.dataset.active = s.id === active ? "true" : "false";
      if (s.transit) el.dataset.transit = "true";
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectRef.current?.(s.id);
      });
      const marker = new Marker({ element: el, anchor: "center" })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    const byDay = new Map<number, MapStop[]>();
    for (const s of visible) {
      const list = byDay.get(s.day) ?? [];
      list.push(s);
      byDay.set(s.day, list);
    }
    const features = [...byDay.values()]
      .filter((pts) => pts.length > 1)
      .map((pts) => ({
        type: "Feature" as const,
        properties: { color: pts[0]!.color },
        geometry: {
          type: "LineString" as const,
          coordinates: pts.map((p) => [p.lng, p.lat]),
        },
      }));
    const src = map.getSource("trip-route") as GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features });

    const activeStop = visible.find((s) => s.id === active);
    if (activeStop) {
      map.flyTo({
        center: [activeStop.lng, activeStop.lat],
        zoom: Math.max(map.getZoom(), 13.5),
        duration: 900,
      });
      popupRef.current = new Popup({
        offset: 20,
        closeButton: false,
        closeOnClick: false,
      })
        .setLngLat([activeStop.lng, activeStop.lat])
        .setText(activeStop.name)
        .addTo(map);
    } else if (visible.length) {
      const fitKey = `${day}:${visible.length}`;
      if (fitKey !== lastFitRef.current) {
        lastFitRef.current = fitKey;
        const b = new LngLatBounds();
        visible.forEach((s) => b.extend([s.lng, s.lat]));
        map.fitBounds(b, { padding: 70, maxZoom: 13, duration: 900 });
      }
    }
  };

  useEffect(() => {
    syncRef.current();
  }, [stops, day, activeStopId]);

  // Point-picking mode: pushpin cursor + one click resolves a coordinate.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (!picking) {
      canvas.style.cursor = "";
      return;
    }
    canvas.style.cursor = PIN_CURSOR;
    const handler = (e: { lngLat: { lng: number; lat: number } }) => {
      pickRef.current?.(e.lngLat.lng, e.lngLat.lat);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
      canvas.style.cursor = "";
    };
  }, [picking]);

  return (
    <div ref={containerRef} className="relative size-full overflow-hidden bg-[#e9ecf4]">
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
          {unavailableLabel}
        </div>
      ) : null}
    </div>
  );
}
