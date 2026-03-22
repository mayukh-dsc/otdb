"use client";

import type { Temple } from "@/lib/types";

interface Props {
  temple: Temple;
}

export default function FloorPlanViewer({ temple }: Props) {
  const viz = temple.visualization;
  const hasFloorPlans = viz?.floorPlanUrls && viz.floorPlanUrls.length > 0;
  const hasLegacyFloorPlan = temple.floorPlanUrl;

  if (!hasFloorPlans && !hasLegacyFloorPlan) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-20">&#9633;</div>
        <h3 className="text-lg font-medium text-stone-300">
          Floor plan not yet available
        </h3>
        <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
          Our pipeline is searching ASI archives and Wikimedia Commons for
          architectural drawings of this temple.
        </p>
      </div>
    );
  }

  const images = hasFloorPlans
    ? viz!.floorPlanUrls!
    : [
        {
          url: temple.floorPlanUrl!,
          caption: "Floor plan",
          attribution: { source: "wikipedia" as const, fetchedAt: "" },
        },
      ];

  return (
    <div className="space-y-4">
      {images.map((img, i) => (
        <div key={i} className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between border-b border-stone-800">
            <span className="text-sm font-medium text-stone-300">
              {img.caption || `Floor Plan ${i + 1}`}
            </span>
            {img.attribution && (
              <span className="text-xs text-stone-500">
                Source: {formatSource(img.attribution.source)}
              </span>
            )}
          </div>
          <div className="p-5 flex items-center justify-center min-h-[300px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.caption || `${temple.name} floor plan`}
              className="max-w-full max-h-[600px] object-contain rounded"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatSource(source: string): string {
  const names: Record<string, string> = {
    asi: "Archaeological Survey of India",
    wikidata: "Wikidata",
    wikipedia: "Wikipedia",
    commons: "Wikimedia Commons",
    "data-gov": "data.gov.in",
  };
  return names[source] || source;
}
