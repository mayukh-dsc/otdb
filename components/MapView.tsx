"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Temple } from "@/lib/types";
import { getReligionColor, formatYear } from "@/lib/utils";
import {
  buildSimilarityEdges,
  getSimilarityGroupColor,
  getSimilarityGroupKey,
  type SimilarityMode,
  type SimilarityEdge,
} from "@/lib/similarityEdges";

const INITIAL_CENTER: [number, number] = [18, 82];
const INITIAL_ZOOM = 5;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [0, 55],
  [40, 115],
];

const CARTO_VOYAGER =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function createTempleIcon(
  religion: string,
  markerColor?: string,
  compareBadge?: number
): L.DivIcon {
  const color = markerColor || getReligionColor(religion);
  const badge =
    compareBadge != null
      ? `<circle cx="24" cy="8" r="7" fill="#06b6d4" stroke="white" stroke-width="1.4"/>
         <text x="24" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="system-ui">${compareBadge}</text>`
      : "";
  return L.divIcon({
    className: "custom-marker",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="-1 -1 32 40" style="filter: drop-shadow(0 3px 8px rgba(0,0,0,0.35));">
      <g fill="${color}" stroke="white" stroke-width="1.4" stroke-linejoin="round">
        <circle cx="15" cy="4" r="2.4"/>
        <path d="M8.5 17 L15 7 L21.5 17Z"/>
        <rect x="6.5" y="17" width="17" height="12" rx="1.5"/>
        <rect x="4.5" y="29" width="21" height="5" rx="1.2"/>
      </g>
      <path d="M11.7 34 V25.2 Q15 21.2 18.3 25.2 V34Z" fill="white" stroke="none"/>
      ${badge}
    </svg>`,
    iconSize: [32, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -36],
  });
}

function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function SimilarityLinesPane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("similarityLines")) {
      const pane = map.createPane("similarityLines");
      pane.style.zIndex = "350";
    }
  }, [map]);
  return null;
}

interface MapViewProps {
  temples: Temple[];
  selectedTempleId: string | null;
  onSelectTemple: (temple: Temple) => void;
  similarityMode: SimilarityMode;
  visibleConnectionGroups?: string[];
  compareMode?: boolean;
  comparedTempleIds?: Set<string>;
}

function SimilarityLines({ edges }: { edges: SimilarityEdge[] }) {
  if (edges.length === 0) return null;

  return (
    <>
      {edges.map((edge, i) => (
        <div key={`${i}-${edge.group}`}>
          <Polyline
            positions={[edge.from, edge.to]}
            pathOptions={{
              color: edge.color,
              weight: 6,
              opacity: 0.18,
            }}
            pane="similarityLines"
          />
          <Polyline
            positions={[edge.from, edge.to]}
            pathOptions={{
              color: edge.color,
              weight: 3,
              opacity: 0.9,
              dashArray: "4 8",
            }}
            pane="similarityLines"
          >
            <Popup>
              <span className="text-xs font-medium capitalize">{edge.group}</span>
            </Popup>
          </Polyline>
        </div>
      ))}
    </>
  );
}

export default function MapView({
  temples,
  selectedTempleId,
  onSelectTemple,
  similarityMode,
  visibleConnectionGroups,
  compareMode,
  comparedTempleIds,
}: MapViewProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  const edges = useMemo(() => {
    const built = buildSimilarityEdges(temples, similarityMode);
    if (!visibleConnectionGroups || visibleConnectionGroups.length === 0) {
      return built;
    }
    const allowed = new Set(visibleConnectionGroups);
    return built.filter((edge) => allowed.has(edge.group));
  }, [temples, similarityMode, visibleConnectionGroups]);

  const markerColorsByTempleId = useMemo(() => {
    const byId = new Map<string, string>();
    if (similarityMode === "off") return byId;

    for (const temple of temples) {
      const group = getSimilarityGroupKey(temple, similarityMode);
      if (!group) continue;
      byId.set(temple.id, getSimilarityGroupColor(group));
    }

    return byId;
  }, [temples, similarityMode]);

  const compareBadgeMap = useMemo(() => {
    if (!compareMode || !comparedTempleIds || comparedTempleIds.size === 0)
      return new Map<string, number>();
    const map = new Map<string, number>();
    let idx = 1;
    for (const id of comparedTempleIds) {
      map.set(id, idx++);
    }
    return map;
  }, [compareMode, comparedTempleIds]);

  return (
    <MapContainer
      center={INITIAL_CENTER}
      zoom={INITIAL_ZOOM}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={0.8}
      minZoom={4}
      maxZoom={18}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer attribution={CARTO_ATTR} url={CARTO_VOYAGER} />
      <InvalidateOnResize />
      <SimilarityLinesPane />
      <SimilarityLines edges={edges} />
      {temples.map((temple) => (
        <Marker
          key={temple.id}
          position={[temple.latitude, temple.longitude]}
          icon={createTempleIcon(
            temple.religion,
            markerColorsByTempleId.get(temple.id),
            compareBadgeMap.get(temple.id)
          )}
          ref={(ref) => {
            if (ref) markerRefs.current.set(temple.id, ref);
          }}
          eventHandlers={{
            click: () => onSelectTemple(temple),
          }}
        >
          <Popup closeButton={false} className="temple-popup">
            <div className="text-sm min-w-[220px] p-3 text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-slate-100 text-[1.03rem] leading-tight [text-shadow:0_1px_1px_rgba(0,0,0,0.4)]">
                  {temple.name}
                </strong>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    temple.religion === "Hindu"
                      ? "bg-orange-100 text-orange-700"
                      : temple.religion === "Buddhist"
                        ? "bg-yellow-100 text-yellow-700"
                        : temple.religion === "Jain"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {temple.religion}
                </span>
              </div>
              {temple.yearBuilt !== 0 && (
                <div className="text-slate-300 text-xs mt-1">
                  {formatYear(temple.yearBuilt)}
                  {temple.yearBuiltApproximate && " (approx.)"}
                </div>
              )}
              {(temple.dynasty || temple.architecturalStyle) && (
                <div className="mt-1 space-y-0.5">
                  {temple.dynasty && (
                    <div className="text-slate-200 text-xs">
                      <span className="font-semibold text-slate-100">Dynasty:</span>{" "}
                      {temple.dynasty}
                    </div>
                  )}
                  {temple.architecturalStyle && (
                    <div className="text-slate-200 text-xs">
                      <span className="font-semibold text-slate-100">Style:</span>{" "}
                      {temple.architecturalStyle}
                    </div>
                  )}
                </div>
              )}
              <a
                href={`/temple/${temple.id}`}
                className="zoom-hover block w-[calc(100%-8px)] mt-2 mx-1 px-3 py-1.5 text-sm text-center font-bold text-white bg-gradient-to-r from-violet-500 to-cyan-500 rounded-lg hover:from-violet-400 hover:to-cyan-400 transition-colors shadow-md shadow-cyan-900/30"
              >
                View details &rarr;
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
