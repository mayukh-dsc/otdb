"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import handbookData from "@/data/handbook.json";
import type { HandbookTerm, HandbookCategory } from "@/lib/types";

const terms = handbookData as HandbookTerm[];

const CATEGORY_META: Record<
  HandbookCategory,
  { label: string; description: string }
> = {
  anatomy: {
    label: "Temple Anatomy",
    description: "The structural parts that make up a temple",
  },
  style: {
    label: "Architectural Styles",
    description: "Regional and historical traditions of temple design",
  },
  technique: {
    label: "Construction Techniques",
    description: "How temples were built — methods and engineering",
  },
  material: {
    label: "Building Materials",
    description: "Stone, brick, and mortar — what temples are made of",
  },
  water: {
    label: "Water Systems",
    description: "Tanks, moats, drainage, and hydraulic engineering",
  },
  plan: {
    label: "Plan Types",
    description: "Ground plan shapes and spatial geometry",
  },
  environmental: {
    label: "Environmental Engineering",
    description: "Acoustics, lighting, thermal design, and astronomical alignment",
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
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-stone-900 border-b border-stone-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/"
              className="text-amber-400 hover:text-amber-300 text-sm"
            >
              OTDB
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-stone-300 text-sm">Handbook</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">
            Understanding Temple Architecture
          </h1>
          <p className="text-stone-400 mt-1 text-sm">
            A glossary of {terms.length} terms covering structural anatomy,
            construction techniques, materials, and engineering systems. Click
            any term to find temples that share that feature.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !activeCategory
                  ? "bg-stone-900 text-white"
                  : "bg-stone-200 text-stone-600 hover:bg-stone-300"
              }`}
            >
              All
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                  activeCategory === cat
                    ? "bg-stone-900 text-white"
                    : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                }`}
              >
                {CATEGORY_META[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Term Groups */}
        {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
          <section key={cat} className="mb-10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-stone-900">
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
          <div className="text-center py-16 text-stone-400">
            <p className="text-lg">No terms match your search.</p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory(null);
              }}
              className="mt-2 text-amber-600 hover:text-amber-700 text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TermCard({ term }: { term: HandbookTerm }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-900 text-sm">{term.name}</h3>
          {term.originalTerm && (
            <p className="text-xs text-stone-400 italic mt-0.5">
              {term.originalTerm}
            </p>
          )}
        </div>
        <Link
          href={`/temples?tag=${encodeURIComponent(term.graphTag)}`}
          className="flex-shrink-0 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 transition-colors"
        >
          View temples
        </Link>
      </div>

      <p className="text-sm text-stone-600 mt-2 leading-relaxed">
        {term.shortDescription}
      </p>

      {term.fullDescription && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-600 hover:text-amber-700 mt-2 font-medium"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
          {expanded && (
            <p className="text-sm text-stone-600 mt-2 leading-relaxed border-t border-stone-100 pt-2">
              {term.fullDescription}
            </p>
          )}
        </>
      )}
    </div>
  );
}
