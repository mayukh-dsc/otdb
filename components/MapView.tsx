"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Temple } from "@/lib/types";
import { getReligionColor, formatYear } from "@/lib/utils";

const INITIAL_CENTER: [number, number] = [18, 82];
const INITIAL_ZOOM = 5;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [0, 55],
  [40, 115],
];

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
    html: `<div class="${size} flex items-center justify-center rounded-full bg-amber-700 text-white font-semibold shadow-md border-2 border-white">${count}</div>`,
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

interface MapViewProps {
  temples: Temple[];
  selectedTempleId: string | null;
  onSelectTemple: (temple: Temple) => void;
}

export default function MapView({
  temples,
  selectedTempleId,
  onSelectTemple,
}: MapViewProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

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
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateOnResize />
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
              <div className="text-sm">
                <strong>{temple.name}</strong>
                {temple.yearBuilt !== 0 && (
                  <div className="text-gray-600">
                    {formatYear(temple.yearBuilt)}
                    {temple.yearBuiltApproximate && " (approx.)"}
                  </div>
                )}
                <a
                  href={`/temple/${temple.id}`}
                  className="inline-block mt-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
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
