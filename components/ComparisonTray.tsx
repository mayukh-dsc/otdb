"use client";

import { useState } from "react";
import { Temple } from "@/lib/types";
import { getTempleImageCandidatesFromTemple } from "@/lib/templeImage";

interface ComparisonTrayProps {
  temples: Temple[];
  onRemove: (id: string) => void;
  onCompare: () => void;
  onCancel: () => void;
}

function SlotImage({ temple }: { temple: Temple }) {
  const candidates = getTempleImageCandidatesFromTemple(temple);
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = candidates[Math.min(srcIndex, Math.max(candidates.length - 1, 0))];

  if (failed || !src) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-500 text-[9px]">
        No img
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

export default function ComparisonTray({
  temples,
  onRemove,
  onCompare,
  onCancel,
}: ComparisonTrayProps) {
  const slots = Array.from({ length: 3 }, (_, i) => temples[i] ?? null);

  return (
    <div className="absolute left-2.5 right-2.5 sm:left-5 sm:right-5 bottom-3 sm:bottom-4 z-[35]">
      <div className="rounded-2xl border border-cyan-200/20 bg-slate-950/85 backdrop-blur-lg shadow-2xl shadow-black/60 px-3 py-3 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between mb-2.5 gap-3">
          <p className="text-[12px] sm:text-xs font-bold tracking-wide text-slate-100 uppercase [text-shadow:0_1px_1px_rgba(0,0,0,0.45)]">
            Select up to 3 temples to compare
          </p>
          <button
            onClick={onCancel}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            Cancel
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 flex gap-2">
            {slots.map((temple, i) =>
              temple ? (
                <div
                  key={temple.id}
                  className="flex-1 min-w-0 flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-slate-800/70 px-2 py-1.5"
                >
                  <span className="shrink-0 w-5 h-5 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="h-8 w-10 rounded-md overflow-hidden bg-slate-800/70 shrink-0 border border-white/10">
                    <SlotImage temple={temple} />
                  </div>
                  <span className="text-xs text-white font-medium truncate min-w-0">
                    {temple.name}
                  </span>
                  <button
                    onClick={() => onRemove(temple.id)}
                    className="shrink-0 ml-auto w-5 h-5 rounded-full hover:bg-slate-600/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    aria-label={`Remove ${temple.name}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 2l6 6M8 2l-6 6" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div
                  key={`empty-${i}`}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-2 py-3 text-slate-500"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M6 2v8M2 6h8" />
                  </svg>
                  <span className="text-[11px]">Click map</span>
                </div>
              )
            )}
          </div>
          <button
            onClick={onCompare}
            disabled={temples.length < 2}
            className={`zoom-click shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              temples.length >= 2
                ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-md shadow-cyan-900/30 hover:from-violet-400 hover:to-cyan-400"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            Compare{temples.length >= 2 ? ` (${temples.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
