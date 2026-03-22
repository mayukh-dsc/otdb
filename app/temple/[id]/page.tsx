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
import { getTempleImageCandidatesFromTemple, getTempleImageSrcSet, TEMPLE_IMAGE_SIZES } from "@/lib/templeImage";

const TABS = ["Overview", "Floor Plan", "Engineering", "Blueprint"] as const;
type Tab = (typeof TABS)[number];

export default function TempleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [temple, setTemple] = useState<Temple | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!temple) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-surface border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 py-6">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <Link href="/" className="text-amber-400 hover:text-amber-300 font-semibold">
              OTDB
            </Link>
            <span className="text-slate-500">/</span>
            <Link href="/temples" className="text-slate-300 hover:text-white transition-colors">
              Temples
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-slate-200 truncate">{temple.name}</span>
          </div>

          <h1 className="text-3xl font-bold text-white mt-3 tracking-tight">{temple.name}</h1>
          {temple.alternateName && (
            <p className="text-slate-300 text-sm mt-0.5">
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
              <span className="text-sm text-slate-200">{dateStr}</span>
            )}
            {temple.country && (
              <span className="text-sm text-slate-300">
                {[temple.state, temple.country].filter(Boolean).join(", ")}
              </span>
            )}
            {temple.currentCondition && (
              <span className="text-xs text-slate-200 border border-white/20 px-2 py-0.5 rounded-lg">
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
      <TempleHeroImage key={temple.id} temple={temple} />

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-5 mt-6">
        <div className="glass-surface rounded-xl px-4 border border-white/10">
          <nav className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`zoom-click py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-cyan-300 text-white"
                    : "text-slate-400 hover:text-slate-200"
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
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <Link
            href="/"
            className="zoom-hover text-sm text-slate-400 hover:text-slate-100 transition-colors"
          >
            Back to map
          </Link>
          {temple.wikipediaUrl && (
            <a
              href={temple.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="zoom-hover text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Read more on Wikipedia
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function TempleHeroImage({ temple }: { temple: Temple }) {
  const heroCandidates = getTempleImageCandidatesFromTemple(temple);
  const srcSet = getTempleImageSrcSet(temple.id);
  const [heroIndex, setHeroIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (imageError || heroCandidates.length === 0) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-5 mt-6">
      <div className="glass-card rounded-2xl overflow-hidden max-h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroCandidates[Math.min(heroIndex, Math.max(heroCandidates.length - 1, 0))]}
          srcSet={srcSet || undefined}
          sizes={srcSet ? TEMPLE_IMAGE_SIZES : undefined}
          alt={temple.name}
          className="w-full h-80 object-cover transition-transform duration-700 hover:scale-105"
          referrerPolicy="no-referrer"
          onError={() => {
            if (heroIndex < heroCandidates.length - 1) {
              setHeroIndex((i) => i + 1);
            } else {
              setImageError(true);
            }
          }}
        />
      </div>
    </div>
  );
}

function OverviewTab({ temple }: { temple: Temple }) {
  return (
    <div className="space-y-6">
      {/* Key Facts */}
      <div className="glass-card zoom-hover rounded-xl border p-5">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">
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
    <div className="glass-card zoom-hover rounded-xl border p-5">
      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
        {title}
      </h2>
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="zoom-click text-xs text-cyan-300 hover:text-cyan-200 font-medium mt-2"
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
      <dt className="text-xs text-slate-300 uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-sm text-white mt-0.5">{value}</dd>
    </div>
  );
}
