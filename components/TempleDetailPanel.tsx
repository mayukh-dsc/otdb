"use client";

import { useState } from "react";
import { Temple } from "@/lib/types";
import { formatYear } from "@/lib/utils";

interface TempleDetailPanelProps {
  temple: Temple | null;
  onClose: () => void;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (!value) return null;
  return (
    <div className="py-2 border-b border-stone-200 last:border-b-0">
      <dt className="text-xs uppercase tracking-wider text-stone-400 mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-stone-800">{value}</dd>
    </div>
  );
}

function ReligionBadge({ religion }: { religion: string }) {
  const colors: Record<string, string> = {
    Hindu: "bg-orange-100 text-orange-800",
    Buddhist: "bg-yellow-100 text-yellow-800",
    Jain: "bg-green-100 text-green-800",
    Other: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[religion] || colors.Other}`}
    >
      {religion}
    </span>
  );
}

export default function TempleDetailPanel({
  temple,
  onClose,
}: TempleDetailPanelProps) {
  if (!temple) return null;

  const dateStr = temple.yearBuilt
    ? `${formatYear(temple.yearBuilt)}${temple.yearBuiltApproximate ? " (approx.)" : ""}${temple.yearBuiltEnd ? ` – ${formatYear(temple.yearBuiltEnd)}` : ""}`
    : null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-stone-200">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="text-lg font-semibold text-stone-900 leading-tight">
            {temple.name}
          </h2>
          {temple.alternateName && (
            <p className="text-sm text-stone-500 mt-0.5">
              {temple.alternateName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <ReligionBadge religion={temple.religion} />
            {temple.currentCondition && (
              <span className="text-xs text-stone-500">
                {temple.currentCondition}
              </span>
            )}
          </div>
          <a
            href={`/temple/${temple.id}`}
            className="inline-flex items-center gap-1 mt-2 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full hover:bg-amber-100 transition-colors"
          >
            Full Visualization &rarr;
          </a>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
          aria-label="Close panel"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        {temple.imageUrl && (
          <TempleImage imageUrl={temple.imageUrl} alt={temple.name} />
        )}

        <div className="p-4 space-y-1">
          {/* Key facts */}
          <dl>
            <InfoRow label="Date" value={dateStr} />
            <InfoRow label="Dynasty" value={temple.dynasty} />
            <InfoRow label="Commissioned by" value={temple.commissionedBy} />
            <InfoRow label="Deity" value={temple.deity} />
            <InfoRow
              label="Architectural Style"
              value={temple.architecturalStyle}
            />
            <InfoRow label="Material" value={temple.material} />
            <InfoRow
              label="Height"
              value={
                temple.heightMeters
                  ? `${temple.heightMeters}m`
                  : undefined
              }
            />
            <InfoRow label="Part of" value={temple.partOfComplex} />
            <InfoRow label="Heritage Status" value={temple.heritageStatus} />
            <InfoRow
              label="Location"
              value={[temple.state, temple.country]
                .filter(Boolean)
                .join(", ")}
            />
          </dl>

          {/* Description */}
          {temple.description && (
            <div className="pt-3">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                About
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {temple.description}
              </p>
            </div>
          )}

          {/* History */}
          {temple.history && (
            <div className="pt-3">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                History
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {temple.history}
              </p>
            </div>
          )}

          {/* Architecture */}
          {temple.architectureNotes && (
            <div className="pt-3">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                Architecture
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {temple.architectureNotes}
              </p>
            </div>
          )}

          {/* Significance */}
          {temple.significance && (
            <div className="pt-3">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                Significance
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {temple.significance}
              </p>
            </div>
          )}

          {/* Floor Plan */}
          {temple.floorPlanUrl && (
            <div className="pt-3">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                Floor Plan
              </h3>
              <div className="w-full bg-stone-100 rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={temple.floorPlanUrl}
                  alt={`${temple.name} floor plan`}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          )}

          {/* Links */}
          {temple.wikipediaUrl && (
            <div className="pt-4 pb-2">
              <a
                href={temple.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Read more on Wikipedia
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TempleImage({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) return null;

  const src = imageUrl.replace(/^http:/, "https:");

  return (
    <div className="w-full h-48 bg-stone-100 overflow-hidden relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
