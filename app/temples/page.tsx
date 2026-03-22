"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Temple, HandbookTerm } from "@/lib/types";
import { formatYear } from "@/lib/utils";
import { FeatureBadgeGroup } from "@/components/FeatureBadge";
import handbookData from "@/data/handbook.json";

const handbook = handbookData as HandbookTerm[];

function getTagFromUrl(): string | null {
  if (typeof globalThis.window === "undefined") return null;
  const params = new URLSearchParams(globalThis.window.location.search);
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
    <div className="min-h-screen bg-background">
      <header className="glass-surface border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-6">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <Link
              href="/"
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              OTDB
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300">Temples</span>
          </div>
          {term ? (
            <>
              <h1 className="text-2xl font-bold text-white mt-3 tracking-tight">
                {term.name}
              </h1>
              <p className="text-slate-200 mt-1.5 text-sm max-w-2xl">
                {term.shortDescription}
              </p>
              <p className="text-cyan-300 mt-2 text-sm font-semibold">
                {temples.length} temple{temples.length !== 1 ? "s" : ""} with
                this feature
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mt-3 tracking-tight">
                All Temples
              </h1>
              <p className="text-slate-200 mt-1.5 text-sm">
                {temples.length} temples in the database
              </p>
            </>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6">
        {tag && (
          <div className="mb-6 flex items-center gap-3 glass-card rounded-xl px-4 py-2">
            <Link
              href="/temples"
              className="text-sm text-slate-300 hover:text-slate-100 transition-colors"
            >
              Clear filter
            </Link>
            <span className="text-slate-500">|</span>
            <Link
              href="/handbook"
              className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
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
          <div className="text-center py-20 text-slate-300">
            <p className="text-lg">No temples found.</p>
            {tag && (
              <p className="text-sm mt-1 text-slate-400">
                No temples have been tagged with this feature yet.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
  const [imgSrc, setImgSrc] = useState(`/images/temples/${temple.id}.jpg`);
  const [imgFailed, setImgFailed] = useState(false);
  const dateStr = temple.yearBuilt ? formatYear(temple.yearBuilt) : null;

  const religionColors: Record<string, string> = {
    Hindu: "bg-orange-500/20 text-orange-400",
    Buddhist: "bg-yellow-500/20 text-yellow-400",
    Jain: "bg-green-500/20 text-green-400",
    Other: "bg-blue-500/20 text-blue-400",
  };

  return (
    <Link
      href={`/temple/${temple.id}`}
      className="glass-card zoom-hover block rounded-2xl overflow-hidden hover:border-violet-300/30 transition-all"
    >
      <div className="h-40 bg-slate-900 overflow-hidden">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={temple.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => {
              if (temple.imageUrl && imgSrc !== temple.imageUrl) {
                setImgSrc(temple.imageUrl);
              } else {
                setImgFailed(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-slate-700"
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
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white text-sm leading-tight">
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
        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-300">
          {dateStr && <span>{dateStr}</span>}
          {dateStr && temple.country && <span>&middot;</span>}
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
