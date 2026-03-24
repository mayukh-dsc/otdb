"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import { Temple, TimeRange, MIN_YEAR, MAX_YEAR } from "@/lib/types";
import { filterTemplesByTimeRange } from "@/lib/utils";
import {
  SIMILARITY_MODES,
  buildSimilarityEdges,
  getSimilarityGroupKey,
  type SimilarityMode,
} from "@/lib/similarityEdges";
import TimeRangeSlider from "@/components/TimeRangeSlider";
import TempleDetailPanel from "@/components/TempleDetailPanel";
import ComparisonTray from "@/components/ComparisonTray";
import ComparisonModal from "@/components/ComparisonModal";
import { getTempleImageCandidatesFromTemple } from "@/lib/templeImage";

const MapView = lazy(() => import("@/components/MapView"));

export default function Home() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: MIN_YEAR,
    end: MAX_YEAR,
  });
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [similarityMode, setSimilarityMode] = useState<SimilarityMode>("off");
  const [visibleConnectionGroups, setVisibleConnectionGroups] = useState<string[]>([]);
  const [groupFilterInitialized, setGroupFilterInitialized] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [comparedTemples, setComparedTemples] = useState<Temple[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  useEffect(() => {
    fetch("/api/temples")
      .then((r) => r.json())
      .then((data: Temple[]) => {
        setTemples(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredTemples = useMemo(
    () => filterTemplesByTimeRange(temples, timeRange),
    [temples, timeRange]
  );

  const similarityEdges = useMemo(
    () => buildSimilarityEdges(filteredTemples, similarityMode),
    [filteredTemples, similarityMode]
  );

  const connectionGroups = useMemo(() => {
    const counts = new Map<string, { color: string; count: number }>();
    for (const edge of similarityEdges) {
      const existing = counts.get(edge.group);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(edge.group, { color: edge.color, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .map(([group, value]) => ({
        group,
        color: value.color,
        count: value.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [similarityEdges]);

  const allConnectionGroups = useMemo(
    () => connectionGroups.map((g) => g.group),
    [connectionGroups]
  );

  const resolvedVisibleConnectionGroups = useMemo(() => {
    if (similarityMode === "off") return [];

    const validSelected = visibleConnectionGroups.filter((group) =>
      allConnectionGroups.includes(group)
    );

    if (!groupFilterInitialized) {
      return allConnectionGroups;
    }

    return validSelected;
  }, [
    similarityMode,
    visibleConnectionGroups,
    allConnectionGroups,
    groupFilterInitialized,
  ]);

  const connectionFilteredTemples = useMemo(() => {
    if (similarityMode === "off") return filteredTemples;
    if (resolvedVisibleConnectionGroups.length === 0) return [];

    const visible = new Set(resolvedVisibleConnectionGroups);
    return filteredTemples.filter((temple) => {
      const group = getSimilarityGroupKey(temple, similarityMode);
      return !!group && visible.has(group);
    });
  }, [filteredTemples, similarityMode, resolvedVisibleConnectionGroups]);

  const handleSimilarityModeChange = (mode: SimilarityMode) => {
    setSimilarityMode(mode);
    setGroupFilterInitialized(false);
    setVisibleConnectionGroups([]);
  };

  const connectedTemples = useMemo(() => {
    if (!selectedTemple) return [];

    const norm = (v?: string) => (v || "").trim().toLowerCase();

    const isConnected = (candidate: Temple) => {
      if (candidate.id === selectedTemple.id) return false;

      // Prefer current selected mode; fall back to broadly useful associations.
      if (similarityMode === "dynasty") {
        return (
          !!norm(selectedTemple.dynasty) &&
          norm(selectedTemple.dynasty) === norm(candidate.dynasty)
        );
      }
      if (similarityMode === "style") {
        return (
          !!norm(selectedTemple.architecturalStyle) &&
          norm(selectedTemple.architecturalStyle) ===
            norm(candidate.architecturalStyle)
        );
      }
      if (similarityMode === "religion") {
        return norm(selectedTemple.religion) === norm(candidate.religion);
      }
      if (similarityMode === "century") {
        const toCentury = (year: number) =>
          year < 0 ? Math.ceil(Math.abs(year) / 100) : Math.ceil(year / 100);
        return toCentury(selectedTemple.yearBuilt) === toCentury(candidate.yearBuilt);
      }

      return (
        (norm(selectedTemple.dynasty) &&
          norm(selectedTemple.dynasty) === norm(candidate.dynasty)) ||
        (norm(selectedTemple.architecturalStyle) &&
          norm(selectedTemple.architecturalStyle) ===
            norm(candidate.architecturalStyle)) ||
        (norm(selectedTemple.partOfComplex) &&
          norm(selectedTemple.partOfComplex) === norm(candidate.partOfComplex))
      );
    };

    return connectionFilteredTemples.filter(isConnected).slice(0, 20);
  }, [connectionFilteredTemples, selectedTemple, similarityMode]);

  const handleSelectTemple = (temple: Temple) => {
    setSelectedTemple(temple);
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedTemple(null), 300);
  };

  const handleCompareModeToggle = () => {
    setCompareMode((prev) => !prev);
    setComparedTemples([]);
    setComparisonOpen(false);
  };

  const handleSelectTempleForCompare = (temple: Temple) => {
    setComparedTemples((prev) => {
      if (prev.some((t) => t.id === temple.id)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, temple];
    });
  };

  const handleRemoveComparedTemple = (id: string) => {
    setComparedTemples((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length < 2) setComparisonOpen(false);
      return next;
    });
  };

  const comparedTempleIds = useMemo(
    () => new Set(comparedTemples.map((t) => t.id)),
    [comparedTemples]
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="glass-surface flex items-center justify-between px-5 py-3 border-b border-border-subtle z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-wide">
            <span className="text-accent-light">OT</span>
            <span className="text-foreground">DB</span>
          </h1>
          <span className="text-xs text-slate-300 hidden sm:inline font-medium tracking-wider uppercase">
            Old Temples Database
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <span className="text-slate-200 hidden md:inline">
            <span className="text-accent-light font-semibold">
              {connectionFilteredTemples.length}
            </span>
            <span className="text-text-muted">
              {" "}
              / {filteredTemples.length} visible (time) / {temples.length} total
            </span>
          </span>
          <button
            onClick={handleCompareModeToggle}
            className={`zoom-click hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
              compareMode
                ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/30"
                : "glass-card text-slate-200 border-border-subtle hover:text-white hover:bg-surface-raised"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="8" height="18" rx="1" />
              <rect x="14" y="3" width="8" height="18" rx="1" />
            </svg>
            {compareMode ? "Comparing…" : "Compare"}
          </button>
          <nav className="hidden sm:flex items-center gap-1 glass-card rounded-xl p-1">
            <NavLink href="/handbook">Handbook</NavLink>
            <NavLink href="/temples">Browse</NavLink>
          </nav>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="glass-surface border-b border-border-subtle z-20 flex-shrink-0">
        <div className="flex items-center gap-4 px-5">
          <div className="flex-1">
            <TimeRangeSlider value={timeRange} onChange={setTimeRange} />
          </div>
          <div className="hidden sm:flex items-center gap-2 py-2">
            <span className="text-xs text-slate-200 uppercase tracking-wider font-medium whitespace-nowrap">
              Connections
            </span>
            <div className="glass-card flex rounded-xl border border-border-subtle overflow-hidden">
              {SIMILARITY_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleSimilarityModeChange(mode.value)}
                  className={`zoom-click px-2.5 py-1.5 text-xs font-medium transition-all ${
                    similarityMode === mode.value
                      ? "bg-accent text-white shadow-md shadow-violet-500/30"
                      : "text-slate-200 hover:text-white hover:bg-surface-raised"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map + Side Panel */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-slate-950/70">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-text-secondary text-sm">Loading temples...</p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center bg-slate-950/70">
                  <p className="text-text-secondary text-sm">Loading map...</p>
                </div>
              }
            >
              <MapView
                temples={connectionFilteredTemples}
                selectedTempleId={selectedTemple?.id ?? null}
                onSelectTemple={compareMode ? handleSelectTempleForCompare : handleSelectTemple}
                similarityMode={similarityMode}
                visibleConnectionGroups={resolvedVisibleConnectionGroups}
                compareMode={compareMode}
                comparedTempleIds={comparedTempleIds}
              />
            </Suspense>
          )}
        </div>

        {/* Side Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-full sm:w-[420px] glass-surface shadow-2xl z-30 transition-transform duration-300 ease-in-out ${
            panelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <TempleDetailPanel
            temple={selectedTemple}
            onClose={handleClosePanel}
          />
        </div>

        {/* Overlay when panel is open on mobile */}
        {panelOpen && (
          <button
            className="absolute inset-0 bg-black/40 z-20 sm:hidden cursor-default backdrop-blur-sm"
            onClick={handleClosePanel}
            aria-label="Close panel"
            tabIndex={-1}
          />
        )}

        {compareMode && (
          <ComparisonTray
            temples={comparedTemples}
            onRemove={handleRemoveComparedTemple}
            onCompare={() => setComparisonOpen(true)}
            onCancel={handleCompareModeToggle}
          />
        )}

        {comparisonOpen && (
          <ComparisonModal
            temples={comparedTemples}
            onRemove={handleRemoveComparedTemple}
            onClose={() => setComparisonOpen(false)}
          />
        )}

        {selectedTemple && connectedTemples.length > 0 && (
          <div className="absolute left-2.5 right-2.5 sm:left-5 sm:right-5 bottom-16 sm:bottom-4 z-[25]">
            <div className="rounded-2xl border border-cyan-100/20 bg-slate-950/80 backdrop-blur-md shadow-2xl shadow-black/60 px-3 py-2.5 sm:px-3.5 sm:py-3 selection:bg-cyan-300 selection:text-slate-950">
              <div className="flex items-center justify-between mb-2 gap-3">
                <p className="text-[12px] sm:text-xs font-bold tracking-wide text-slate-100 uppercase truncate select-text [text-shadow:0_1px_1px_rgba(0,0,0,0.45)]">
                  Connected Temples of:{" "}
                  <span className="text-cyan-200">{selectedTemple.name}</span>
                </p>
                <span className="text-[11px] text-slate-200/90 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5">
                  {connectedTemples.length} related
                </span>
              </div>
              <div className="rounded-xl border border-white/15 bg-slate-900/70 px-2 py-2">
                <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0.5">
                {connectedTemples.map((temple) => (
                  <ConnectedTempleCard
                    key={temple.id}
                    temple={temple}
                    onSelect={handleSelectTemple}
                  />
                ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile connections (below map on small screens) */}
      <div className="sm:hidden glass-surface border-t border-border-subtle px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <button
          onClick={handleCompareModeToggle}
          className={`zoom-click shrink-0 flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-all ${
            compareMode
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/30"
              : "text-slate-200 glass-card"
          }`}
        >
          {compareMode ? "Exit" : "Compare"}
        </button>
        <span className="text-xs text-slate-200 whitespace-nowrap">Lines:</span>
        {SIMILARITY_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => handleSimilarityModeChange(mode.value)}
            className={`zoom-click px-2 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-all ${
              similarityMode === mode.value
                ? "bg-accent text-white shadow-md shadow-violet-500/30"
                : "text-slate-200 glass-card"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {similarityMode !== "off" && connectionGroups.length > 0 && (
        <div className="glass-surface border-t border-border-subtle z-20 flex-shrink-0 px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
              Connection Groups (Filters map + lines)
            </span>
            <button
              onClick={() =>
                setVisibleConnectionGroups(() => {
                  setGroupFilterInitialized(true);
                  return resolvedVisibleConnectionGroups.length === allConnectionGroups.length
                    ? []
                    : allConnectionGroups;
                })
              }
              className="zoom-click text-[11px] text-cyan-300 hover:text-cyan-200"
            >
              {resolvedVisibleConnectionGroups.length === allConnectionGroups.length
                ? "Hide all groups"
                : "Show all groups"}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {connectionGroups.map((group) => {
              const active = resolvedVisibleConnectionGroups.includes(group.group);
              return (
                <button
                  key={group.group}
                  onClick={() =>
                    setVisibleConnectionGroups((prev) => {
                      setGroupFilterInitialized(true);
                      return prev.includes(group.group)
                        ? prev.filter((g) => g !== group.group)
                        : [...prev, group.group];
                    })
                  }
                  className={`zoom-click shrink-0 flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                    active
                      ? "bg-slate-800/70 border-white/25 text-white"
                      : "bg-slate-900/40 border-white/10 text-slate-400 opacity-60"
                  }`}
                  title={group.group}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="capitalize">
                    {group.group} ({group.count})
                  </span>
                </button>
              );
            })}
          </div>
          {groupFilterInitialized && resolvedVisibleConnectionGroups.length === 0 && (
            <p className="text-[11px] text-slate-400 mt-1">
              No group selected. Map markers and connection lines are hidden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="zoom-hover px-3 py-1.5 rounded-lg text-xs font-medium text-slate-100 hover:text-accent-light hover:bg-accent-muted transition-colors"
    >
      {children}
    </Link>
  );
}

function ConnectedTempleCard({
  temple,
  onSelect,
}: {
  temple: Temple;
  onSelect: (temple: Temple) => void;
}) {
  const candidates = getTempleImageCandidatesFromTemple(temple);
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = candidates[Math.min(srcIndex, Math.max(candidates.length - 1, 0))];

  return (
    <button
      onClick={() => onSelect(temple)}
      className="zoom-hover zoom-click shrink-0 min-w-[230px] sm:min-w-[240px] text-left rounded-xl border border-white/20 bg-slate-800/80 px-2 py-2 hover:bg-slate-700/90 selection:bg-cyan-300 selection:text-slate-950"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-11 w-14 rounded-md overflow-hidden bg-slate-800/70 flex-shrink-0 border border-white/10">
          {!failed && !!src ? (
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
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-500 text-[10px]">
              No img
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{temple.name}</div>
          <div className="text-[11px] text-slate-300 mt-0.5 truncate">
            {temple.dynasty || temple.architecturalStyle || temple.religion}
          </div>
        </div>
      </div>
    </button>
  );
}
