"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Temple } from "@/lib/types";
import { formatYear } from "@/lib/utils";
import { getTempleImageCandidatesFromTemple } from "@/lib/templeImage";

interface ComparisonModalProps {
  temples: Temple[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

interface ComparisonRow {
  label: string;
  key: string;
  getValue: (t: Temple) => string;
}

const ROWS: ComparisonRow[] = [
  { label: "Religion", key: "religion", getValue: (t) => t.religion },
  {
    label: "Country / State",
    key: "country",
    getValue: (t) => [t.country, t.state].filter(Boolean).join(", "),
  },
  {
    label: "Year Built",
    key: "year",
    getValue: (t) => {
      if (!t.yearBuilt) return "—";
      let s = formatYear(t.yearBuilt);
      if (t.yearBuiltApproximate) s += " (approx.)";
      if (t.yearBuiltEnd) s += ` – ${formatYear(t.yearBuiltEnd)}`;
      return s;
    },
  },
  {
    label: "Style",
    key: "style",
    getValue: (t) => t.architecturalStyle || "—",
  },
  { label: "Dynasty", key: "dynasty", getValue: (t) => t.dynasty || "—" },
  {
    label: "Commissioned By",
    key: "commissioned",
    getValue: (t) => t.commissionedBy || "—",
  },
  { label: "Deity", key: "deity", getValue: (t) => t.deity || "—" },
  { label: "Material", key: "material", getValue: (t) => t.material || "—" },
  {
    label: "Height (m)",
    key: "height",
    getValue: (t) => (t.heightMeters != null ? `${t.heightMeters}` : "—"),
  },
  {
    label: "Heritage Status",
    key: "heritage",
    getValue: (t) => t.heritageStatus || "—",
  },
  {
    label: "Condition",
    key: "condition",
    getValue: (t) => t.currentCondition || "—",
  },
  {
    label: "Part of Complex",
    key: "complex",
    getValue: (t) => t.partOfComplex || "—",
  },
];

function HeaderImage({ temple }: { temple: Temple }) {
  const candidates = getTempleImageCandidatesFromTemple(temple);
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = candidates[Math.min(srcIndex, Math.max(candidates.length - 1, 0))];

  if (failed || !src) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs bg-slate-800/60">
        No image
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={temple.name}
      className="h-full w-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (srcIndex < candidates.length - 1) {
          setSrcIndex((i) => i + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

export default function ComparisonModal({
  temples,
  onRemove,
  onClose,
}: ComparisonModalProps) {
  const diffRows = useMemo(() => {
    const set = new Set<string>();
    for (const row of ROWS) {
      const values = temples.map((t) => row.getValue(t));
      if (new Set(values).size > 1) set.add(row.key);
    }
    return set;
  }, [temples]);

  const colCount = temples.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close comparison"
        tabIndex={-1}
      />
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Temple Comparison
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Close comparison"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <div
            className="min-w-[420px]"
            style={{
              display: "grid",
              gridTemplateColumns:
                colCount === 2 ? "100px 1fr 1fr" : "100px 1fr 1fr 1fr",
            }}
          >
            {/* Header row — label column blank + temple columns */}
            <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-white/10 p-2" />
            {temples.map((temple, i) => (
              <div
                key={temple.id}
                className="sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-white/10 p-3 text-center"
              >
                <div className="relative">
                  <div className="mx-auto w-full h-24 sm:h-28 rounded-lg overflow-hidden border border-white/10 mb-2">
                    <HeaderImage temple={temple} />
                  </div>
                  <button
                    onClick={() => onRemove(temple.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-700/90 hover:bg-red-600/90 flex items-center justify-center text-slate-300 hover:text-white transition-colors border border-white/10"
                    aria-label={`Remove ${temple.name}`}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M1 1l6 6M7 1L1 7" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-white truncate">
                    {temple.name}
                  </h3>
                </div>
                {temple.alternateName && (
                  <p className="text-[10px] text-slate-400 truncate">
                    {temple.alternateName}
                  </p>
                )}
              </div>
            ))}

            {/* Attribute rows */}
            {ROWS.map((row) => {
              const isDiff = diffRows.has(row.key);
              return (
                <div key={row.key} className="contents">
                  <div
                    className={`px-3 py-2.5 text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-white/5 flex items-center ${
                      isDiff ? "bg-cyan-950/20" : ""
                    }`}
                  >
                    {row.label}
                  </div>
                  {temples.map((temple) => {
                    const value = row.getValue(temple);
                    return (
                      <div
                        key={`${row.key}-${temple.id}`}
                        className={`px-3 py-2.5 text-xs sm:text-sm text-slate-200 border-b border-white/5 flex items-center ${
                          isDiff ? "bg-cyan-950/20" : ""
                        } ${value === "—" ? "text-slate-500" : ""}`}
                      >
                        {value}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Footer row — view full detail links */}
            <div className="px-3 py-3 border-t border-white/10" />
            {temples.map((temple) => (
              <div
                key={`link-${temple.id}`}
                className="px-3 py-3 border-t border-white/10 flex items-center justify-center"
              >
                <Link
                  href={`/temple/${temple.id}`}
                  className="zoom-hover text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  View full detail &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
