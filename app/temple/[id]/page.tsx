"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Temple } from "@/lib/types";
import { formatYear } from "@/lib/utils";
import { FeatureBadgeGroup } from "@/components/FeatureBadge";
import EngineeringPanel from "@/components/temple/EngineeringPanel";
import FloorPlanViewer from "@/components/temple/FloorPlanViewer";
import BlueprintGallery from "@/components/temple/BlueprintGallery";

const TABS = ["Overview", "Floor Plan", "Engineering", "Blueprint"] as const;
type Tab = (typeof TABS)[number];

export default function TempleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [temple, setTemple] = useState<Temple | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [heroSrc, setHeroSrc] = useState(`/images/temples/${id}.jpg`);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetch(`/api/temples/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: Temple) => {
        setTemple(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!temple) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-white">Temple not found</h1>
        <Link href="/" className="text-amber-500 hover:text-amber-400">
          Back to map
        </Link>
      </div>
    );
  }

  const dateStr = temple.yearBuilt
    ? `${formatYear(temple.yearBuilt)}${temple.yearBuiltApproximate ? " (approx.)" : ""}${temple.yearBuiltEnd ? ` – ${formatYear(temple.yearBuiltEnd)}` : ""}`
    : null;

  const religionColors: Record<string, string> = {
    Hindu: "bg-orange-500/20 text-orange-400 ring-orange-500/30",
    Buddhist: "bg-yellow-500/20 text-yellow-400 ring-yellow-500/30",
    Jain: "bg-green-500/20 text-green-400 ring-green-500/30",
    Other: "bg-blue-500/20 text-blue-400 ring-blue-500/30",
  };

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <header className="border-b border-stone-800">
        <div className="max-w-5xl mx-auto px-5 py-6">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <Link href="/" className="text-amber-400 hover:text-amber-300 font-semibold">
              OTDB
            </Link>
            <span className="text-stone-700">/</span>
            <Link href="/temples" className="text-stone-500 hover:text-stone-300 transition-colors">
              Temples
            </Link>
            <span className="text-stone-700">/</span>
            <span className="text-stone-400 truncate">{temple.name}</span>
          </div>

          <h1 className="text-2xl font-bold text-white mt-3">{temple.name}</h1>
          {temple.alternateName && (
            <p className="text-stone-500 text-sm mt-0.5">
              {temple.alternateName}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${
                religionColors[temple.religion] || religionColors.Other
              }`}
            >
              {temple.religion}
            </span>
            {dateStr && (
              <span className="text-sm text-stone-400">{dateStr}</span>
            )}
            {temple.country && (
              <span className="text-sm text-stone-500">
                {[temple.state, temple.country].filter(Boolean).join(", ")}
              </span>
            )}
            {temple.currentCondition && (
              <span className="text-xs text-stone-500 border border-stone-700 px-2 py-0.5 rounded-lg">
                {temple.currentCondition}
              </span>
            )}
          </div>

          {temple.graphTags && temple.graphTags.length > 0 && (
            <div className="mt-4">
              <FeatureBadgeGroup tags={temple.graphTags} maxVisible={8} size="md" />
            </div>
          )}
        </div>
      </header>

      {/* Hero Image */}
      {!imageError && (
        <div className="max-w-5xl mx-auto px-5 mt-6">
          <div className="rounded-xl overflow-hidden bg-stone-900 max-h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              alt={temple.name}
              className="w-full h-80 object-cover"
              referrerPolicy="no-referrer"
              onError={() => {
                if (temple.imageUrl && heroSrc !== temple.imageUrl) {
                  setHeroSrc(temple.imageUrl);
                } else {
                  setImageError(true);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-5 mt-6">
        <div className="border-b border-stone-800">
          <nav className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-amber-500 text-white"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-5 py-6">
        {activeTab === "Overview" && <OverviewTab temple={temple} />}
        {activeTab === "Floor Plan" && <FloorPlanViewer temple={temple} />}
        {activeTab === "Engineering" && <EngineeringPanel temple={temple} />}
        {activeTab === "Blueprint" && <BlueprintGallery temple={temple} />}
      </div>

      {/* Footer Nav */}
      <div className="max-w-5xl mx-auto px-5 pb-10">
        <div className="flex items-center justify-between border-t border-stone-800 pt-4">
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            Back to map
          </Link>
          {temple.wikipediaUrl && (
            <a
              href={temple.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
            >
              Read more on Wikipedia
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ temple }: { temple: Temple }) {
  return (
    <div className="space-y-6">
      {/* Key Facts */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3">
          Key Facts
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          <InfoRow label="Dynasty" value={temple.dynasty} />
          <InfoRow label="Commissioned by" value={temple.commissionedBy} />
          <InfoRow label="Deity" value={temple.deity} />
          <InfoRow label="Architectural Style" value={temple.architecturalStyle} />
          <InfoRow label="Material" value={temple.material} />
          <InfoRow
            label="Height"
            value={temple.heightMeters ? `${temple.heightMeters}m` : undefined}
          />
          <InfoRow label="Part of" value={temple.partOfComplex} />
          <InfoRow label="Heritage Status" value={temple.heritageStatus} />
        </dl>
      </div>

      <TextBlock title="About" text={temple.description} />
      <TextBlock title="History" text={temple.history} />
      <TextBlock title="Architecture" text={temple.architectureNotes} />
      <TextBlock title="Significance" text={temple.significance} />
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > 500;
  const display = isLong && !expanded ? text.slice(0, 500) + "..." : text;

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
      <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2">
        {title}
      </h2>
      <p className="text-sm text-stone-400 leading-relaxed whitespace-pre-line">
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-500 hover:text-amber-400 font-medium mt-2"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
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
    <div className="py-1.5">
      <dt className="text-xs text-stone-500 uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-sm text-stone-200 mt-0.5">{value}</dd>
    </div>
  );
}
