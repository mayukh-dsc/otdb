"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Temple } from "@/lib/types";
import { formatYear } from "@/lib/utils";
import { FeatureBadgeGroup } from "@/components/FeatureBadge";
import handbookData from "@/data/handbook.json";
import type { HandbookTerm } from "@/lib/types";

const handbook = handbookData as HandbookTerm[];

function getTagFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("tag");
}

export default function TemplesListPage() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    const currentTag = getTagFromUrl();
    setTag(currentTag);

    const url = currentTag
      ? `/api/temples?tag=${encodeURIComponent(currentTag)}`
      : "/api/temples";

    fetch(url)
      .then((r) => r.json())
      .then((data: Temple[]) => {
        setTemples(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const term = tag ? handbook.find((t) => t.graphTag === tag) : null;

  return (
    <div className="min-h-screen bg-stone-50">
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
            <span className="text-stone-300 text-sm">Temples</span>
          </div>
          {term ? (
            <>
              <h1 className="text-2xl font-bold text-white mt-2">
                {term.name}
              </h1>
              <p className="text-stone-400 mt-1 text-sm">
                {term.shortDescription}
              </p>
              <p className="text-amber-400 mt-2 text-sm font-medium">
                {temples.length} temple{temples.length !== 1 ? "s" : ""} with
                this feature
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mt-2">
                All Temples
              </h1>
              <p className="text-stone-400 mt-1 text-sm">
                {temples.length} temples in the database
              </p>
            </>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tag && term && (
          <div className="mb-6 flex items-center gap-3">
            <Link
              href="/temples"
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              Clear filter
            </Link>
            <span className="text-stone-300">|</span>
            <Link
              href="/handbook"
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              Learn more in the Handbook
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : temples.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-lg">No temples found.</p>
            {tag && (
              <p className="text-sm mt-1">
                No temples have been tagged with this feature yet. Data
                enrichment is ongoing.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {temples.map((temple) => (
              <TempleCard key={temple.id} temple={temple} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TempleCard({ temple }: { temple: Temple }) {
  const dateStr = temple.yearBuilt
    ? formatYear(temple.yearBuilt)
    : null;

  const religionColors: Record<string, string> = {
    Hindu: "bg-orange-100 text-orange-800",
    Buddhist: "bg-yellow-100 text-yellow-800",
    Jain: "bg-green-100 text-green-800",
    Other: "bg-blue-100 text-blue-800",
  };

  return (
    <Link
      href={`/temple/${temple.id}`}
      className="block bg-white rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {temple.imageUrl && (
        <div className="h-40 bg-stone-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={temple.imageUrl}
            alt={temple.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-stone-900 text-sm leading-tight">
            {temple.name}
          </h3>
          <span
            className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
              religionColors[temple.religion] || religionColors.Other
            }`}
          >
            {temple.religion}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
          {dateStr && <span>{dateStr}</span>}
          {dateStr && temple.country && <span>·</span>}
          {temple.country && <span>{temple.country}</span>}
        </div>
        {temple.graphTags && temple.graphTags.length > 0 && (
          <div className="mt-3">
            <FeatureBadgeGroup tags={temple.graphTags} maxVisible={3} />
          </div>
        )}
      </div>
    </Link>
  );
}
