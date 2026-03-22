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
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Temple } from "@/lib/types";
import { getReligionColor, formatYear } from "@/lib/utils";
import {
  buildSimilarityEdges,
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

function createTempleIcon(religion: string): L.DivIcon {
  const color = getReligionColor(religion);
  return L.divIcon({
    className: "custom-marker",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35));">
      <g fill="${color}" stroke="white" stroke-width="1.2" stroke-linejoin="round">
        <circle cx="12" cy="3" r="2"/>
        <path d="M7 14 L12 5 L17 14Z"/>
        <rect x="5" y="14" width="14" height="10"/>
        <rect x="3" y="24" width="18" height="4" rx="1"/>
      </g>
      <path d="M9.5 28 V20.5 Q12 17.5 14.5 20.5 V28Z" fill="white" stroke="none"/>
    </svg>`,
    iconSize: [24, 30],
    iconAnchor: [12, 30],
    popupAnchor: [0, -30],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount();
  let size = "w-8 h-8 text-xs";
  if (count > 50) size = "w-12 h-12 text-sm";
  else if (count > 10) size = "w-10 h-10 text-sm";

  return L.divIcon({
    html: `<div class="${size} flex items-center justify-center rounded-full bg-amber-600 text-white font-bold shadow-lg border-2 border-white/80">${count}</div>`,
    className: "custom-cluster",
    iconSize: L.point(40, 40),
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
}

function SimilarityLines({ edges }: { edges: SimilarityEdge[] }) {
  if (edges.length === 0) return null;

  return (
    <>
      {edges.map((edge, i) => (
        <Polyline
          key={`${i}-${edge.group}`}
          positions={[edge.from, edge.to]}
          pathOptions={{
            color: edge.color,
            weight: 2,
            opacity: 0.55,
            dashArray: "6 10",
          }}
          pane="similarityLines"
        >
          <Popup>
            <span className="text-xs font-medium capitalize">{edge.group}</span>
          </Popup>
        </Polyline>
      ))}
    </>
  );
}

export default function MapView({
  temples,
  selectedTempleId,
  onSelectTemple,
  similarityMode,
}: MapViewProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  const edges = useMemo(
    () => buildSimilarityEdges(temples, similarityMode),
    [temples, similarityMode]
  );

  // selectedTempleId reserved for future fly-to behavior

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
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        iconCreateFunction={createClusterIcon}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
      >
        {temples.map((temple) => (
          <Marker
            key={temple.id}
            position={[temple.latitude, temple.longitude]}
            icon={createTempleIcon(temple.religion)}
            ref={(ref) => {
              if (ref) markerRefs.current.set(temple.id, ref);
            }}
            eventHandlers={{
              click: () => onSelectTemple(temple),
            }}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <strong className="text-stone-900">{temple.name}</strong>
                {temple.yearBuilt !== 0 && (
                  <div className="text-stone-500 text-xs mt-0.5">
                    {formatYear(temple.yearBuilt)}
                    {temple.yearBuiltApproximate && " (approx.)"}
                  </div>
                )}
                {temple.architecturalStyle && (
                  <div className="text-stone-400 text-xs">
                    {temple.architecturalStyle}
                  </div>
                )}
                <a
                  href={`/temple/${temple.id}`}
                  className="inline-block mt-1.5 px-2.5 py-1 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
                >
                  View details &rarr;
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
