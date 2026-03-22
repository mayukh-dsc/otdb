"use client";

import { useState } from "react";
import { Temple } from "@/lib/types";
import { formatYear } from "@/lib/utils";
import { FeatureBadgeGroup } from "@/components/FeatureBadge";

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
    <div className="flex items-start justify-between py-2 border-b border-stone-100 last:border-b-0 gap-4">
      <dt className="text-xs uppercase tracking-wider text-stone-400 flex-shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-stone-800 text-right">{value}</dd>
    </div>
  );
}

function ReligionBadge({ religion }: { religion: string }) {
  const colors: Record<string, string> = {
    Hindu: "bg-orange-100 text-orange-800 ring-orange-200",
    Buddhist: "bg-yellow-100 text-yellow-800 ring-yellow-200",
    Jain: "bg-green-100 text-green-800 ring-green-200",
    Other: "bg-blue-100 text-blue-800 ring-blue-200",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${colors[religion] || colors.Other}`}
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
      <div className="flex items-start justify-between p-5 border-b border-stone-200 bg-stone-50">
        <div className="flex-1 min-w-0 pr-3">
          <h2 className="text-lg font-bold text-stone-900 leading-tight">
            {temple.name}
          </h2>
          {temple.alternateName && (
            <p className="text-xs text-stone-400 mt-0.5 truncate">
              {temple.alternateName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2.5">
            <ReligionBadge religion={temple.religion} />
            {temple.currentCondition && (
              <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {temple.currentCondition}
              </span>
            )}
          </div>
          <a
            href={`/temple/${temple.id}`}
            className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
          >
            Full Visualization &rarr;
          </a>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
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
        <TempleImage imageUrl={temple.imageUrl} alt={temple.name} />

        {/* Graph Tags */}
        {temple.graphTags && temple.graphTags.length > 0 && (
          <div className="px-5 pt-4">
            <FeatureBadgeGroup tags={temple.graphTags} maxVisible={5} />
          </div>
        )}

        <div className="px-5 py-4 space-y-1">
          {/* Key facts */}
          <dl>
            <InfoRow label="Date" value={dateStr} />
            <InfoRow label="Dynasty" value={temple.dynasty} />
            <InfoRow label="Commissioned by" value={temple.commissionedBy} />
            <InfoRow label="Deity" value={temple.deity} />
            <InfoRow
              label="Style"
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
            <InfoRow label="Heritage" value={temple.heritageStatus} />
            <InfoRow
              label="Location"
              value={[temple.state, temple.country]
                .filter(Boolean)
                .join(", ")}
            />
          </dl>

          {/* Text sections */}
          <TextSection title="About" text={temple.description} />
          <TextSection title="History" text={temple.history} />
          <TextSection title="Architecture" text={temple.architectureNotes} />
          <TextSection title="Significance" text={temple.significance} />

          {/* Floor Plan */}
          {temple.floorPlanUrl && (
            <div className="pt-4">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">
                Floor Plan
              </h3>
              <div className="w-full bg-stone-50 rounded-lg overflow-hidden border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={temple.floorPlanUrl}
                  alt={`${temple.name} floor plan`}
                  className="w-full h-auto object-contain"
                  referrerPolicy="no-referrer"
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

function TextSection({ title, text }: { title: string; text?: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > 400;
  const display = isLong && !expanded ? text.slice(0, 400) + "..." : text;

  return (
    <div className="pt-4">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-1"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function TempleImage({
  imageUrl,
  alt,
}: {
  imageUrl?: string;
  alt: string;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className="w-full h-44 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-stone-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const src = imageUrl.replace(/^http:/, "https:");

  return (
    <div className="w-full h-52 bg-stone-100 overflow-hidden relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
