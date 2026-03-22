"use client";

import type { Temple } from "@/lib/types";
import { filterImageRefs } from "@/lib/imageUtils";

interface Props {
  temple: Temple;
}

export default function BlueprintGallery({ temple }: Props) {
  const viz = temple.visualization;
  const crossSections = filterImageRefs(viz?.crossSectionUrls);
  const elevations = filterImageRefs(viz?.elevationUrls);
  const hasContent = crossSections.length > 0 || elevations.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-20">&#9998;</div>
        <h3 className="text-lg font-medium text-stone-300">
          Blueprints not yet available
        </h3>
        <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
          Cross-sections and elevation drawings are being gathered from the ASI
          Temple Survey Project and Wikimedia Commons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {elevations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3">
            Elevation Drawings
          </h2>
          <div className="grid gap-4">
            {elevations.map((img, i) => (
              <ImageCard key={i} img={img} templeName={temple.name} type="elevation" index={i} />
            ))}
          </div>
        </div>
      )}

      {crossSections.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3">
            Cross-Sections
          </h2>
          <div className="grid gap-4">
            {crossSections.map((img, i) => (
              <ImageCard key={i} img={img} templeName={temple.name} type="cross-section" index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageCard({
  img,
  templeName,
  type,
  index,
}: {
  img: { url: string; caption?: string; attribution?: { source: string } };
  templeName: string;
  type: string;
  index: number;
}) {
  const sourceNames: Record<string, string> = {
    asi: "Archaeological Survey of India",
    commons: "Wikimedia Commons",
    wikipedia: "Wikipedia",
  };

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between border-b border-stone-800">
        <span className="text-sm font-medium text-stone-300 capitalize">
          {img.caption || `${type} ${index + 1}`}
        </span>
        {img.attribution && (
          <span className="text-xs text-stone-500">
            Source: {sourceNames[img.attribution.source] || img.attribution.source}
          </span>
        )}
      </div>
      <div className="p-5 flex items-center justify-center min-h-[250px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={`${templeName} ${type}`}
          className="max-w-full max-h-[500px] object-contain rounded"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
