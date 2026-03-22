"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import handbookData from "@/data/handbook.json";
import type { HandbookTerm, HandbookCategory } from "@/lib/types";

const terms = handbookData as HandbookTerm[];

const CATEGORY_META: Record<
  HandbookCategory,
  { label: string; description: string; accent: string }
> = {
  anatomy: {
    label: "Temple Anatomy",
    description: "The structural parts that make up a temple",
    accent: "text-indigo-400",
  },
  style: {
    label: "Architectural Styles",
    description: "Regional and historical traditions of temple design",
    accent: "text-purple-400",
  },
  technique: {
    label: "Construction Techniques",
    description: "How temples were built — methods and engineering",
    accent: "text-sky-400",
  },
  material: {
    label: "Building Materials",
    description: "Stone, brick, and mortar — what temples are made of",
    accent: "text-amber-400",
  },
  water: {
    label: "Water Systems",
    description: "Tanks, moats, drainage, and hydraulic engineering",
    accent: "text-cyan-400",
  },
  plan: {
    label: "Plan Types",
    description: "Ground plan shapes and spatial geometry",
    accent: "text-rose-400",
  },
  environmental: {
    label: "Environmental Engineering",
    description: "Acoustics, lighting, thermal design, and astronomical alignment",
    accent: "text-emerald-400",
  },
};

const CATEGORY_ORDER: HandbookCategory[] = [
  "anatomy",
  "style",
  "technique",
  "material",
  "water",
  "plan",
  "environmental",
];

export default function HandbookPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<HandbookCategory | null>(
    null
  );

  const filtered = useMemo(() => {
    let result = terms;
    if (activeCategory) {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.shortDescription.toLowerCase().includes(q) ||
          (t.originalTerm && t.originalTerm.toLowerCase().includes(q))
      );
    }
    return result;
  }, [search, activeCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, HandbookTerm[]> = {};
    for (const term of filtered) {
      if (!groups[term.category]) groups[term.category] = [];
      groups[term.category].push(term);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <header className="border-b border-stone-800">
        <div className="max-w-6xl mx-auto px-5 py-6">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <Link
              href="/"
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              OTDB
            </Link>
            <span className="text-stone-700">/</span>
            <span className="text-stone-400">Handbook</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-3">
            Understanding Temple Architecture
          </h1>
          <p className="text-stone-400 mt-1.5 text-sm leading-relaxed max-w-2xl">
            A glossary of {terms.length} terms covering structural anatomy,
            construction techniques, materials, and engineering systems. Click
            any term to find temples that share that feature.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6">
        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-stone-700 bg-stone-900 text-white text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={!activeCategory}
              onClick={() => setActiveCategory(null)}
            >
              All
            </FilterPill>
            {CATEGORY_ORDER.map((cat) => (
              <FilterPill
                key={cat}
                active={activeCategory === cat}
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
              >
                {CATEGORY_META[cat].label}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Term Groups */}
        {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
          <section key={cat} className="mb-12">
            <div className="mb-4">
              <h2 className={`text-lg font-bold ${CATEGORY_META[cat].accent}`}>
                {CATEGORY_META[cat].label}
              </h2>
              <p className="text-sm text-stone-500">
                {CATEGORY_META[cat].description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[cat]!.map((term) => (
                <TermCard key={term.slug} term={term} />
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-stone-500">
            <p className="text-lg">No terms match your search.</p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory(null);
              }}
              className="mt-2 text-amber-500 hover:text-amber-400 text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-amber-600 text-white"
          : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

function TermCard({ term }: { term: HandbookTerm }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 hover:border-stone-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">{term.name}</h3>
          {term.originalTerm && (
            <p className="text-xs text-stone-500 italic mt-0.5">
              {term.originalTerm}
            </p>
          )}
        </div>
        <Link
          href={`/temples?tag=${encodeURIComponent(term.graphTag)}`}
          className="flex-shrink-0 px-2.5 py-1 text-xs bg-amber-600/15 text-amber-400 rounded-lg hover:bg-amber-600/25 transition-colors font-medium"
        >
          View temples
        </Link>
      </div>

      <p className="text-sm text-stone-400 mt-3 leading-relaxed">
        {term.shortDescription}
      </p>

      {term.fullDescription && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-500 hover:text-amber-400 mt-2 font-medium"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
          {expanded && (
            <p className="text-sm text-stone-400 mt-2 leading-relaxed border-t border-stone-800 pt-3">
              {term.fullDescription}
            </p>
          )}
        </>
      )}
    </div>
  );
}
