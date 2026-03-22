"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Temple, TimeRange, MIN_YEAR, MAX_YEAR } from "@/lib/types";
import { filterTemplesByTimeRange } from "@/lib/utils";
import {
  SIMILARITY_MODES,
  type SimilarityMode,
} from "@/lib/similarityEdges";
import TimeRangeSlider from "@/components/TimeRangeSlider";
import TempleDetailPanel from "@/components/TempleDetailPanel";

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

  const handleSelectTemple = (temple: Temple) => {
    setSelectedTemple(temple);
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedTemple(null), 300);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-surface border-b border-border-subtle z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-wide">
            <span className="text-accent-light">O</span>
            <span className="text-foreground">TDB</span>
          </h1>
          <span className="text-xs text-text-muted hidden sm:inline font-medium tracking-wider uppercase">
            Old Temples Database
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <span className="text-text-secondary hidden md:inline">
            <span className="text-accent-light font-semibold">
              {filteredTemples.length}
            </span>
            <span className="text-text-muted"> / {temples.length} temples</span>
          </span>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink href="/handbook">Handbook</NavLink>
            <NavLink href="/temples">Browse</NavLink>
          </nav>
          <Legend />
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-surface border-b border-border-subtle z-20 flex-shrink-0">
        <div className="flex items-center gap-4 px-5">
          <div className="flex-1">
            <TimeRangeSlider value={timeRange} onChange={setTimeRange} />
          </div>
          <div className="hidden sm:flex items-center gap-2 py-2">
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium whitespace-nowrap">
              Connections
            </span>
            <div className="flex rounded-lg border border-border-subtle overflow-hidden">
              {SIMILARITY_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setSimilarityMode(mode.value)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    similarityMode === mode.value
                      ? "bg-accent text-white"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-raised"
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
            <div className="h-full flex items-center justify-center bg-stone-100">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-text-muted text-sm">Loading temples...</p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center bg-stone-100">
                  <p className="text-text-muted text-sm">Loading map...</p>
                </div>
              }
            >
              <MapView
                temples={filteredTemples}
                selectedTempleId={selectedTemple?.id ?? null}
                onSelectTemple={handleSelectTemple}
                similarityMode={similarityMode}
              />
            </Suspense>
          )}
        </div>

        {/* Side Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-30 transition-transform duration-300 ease-in-out ${
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
      </div>

      {/* Mobile connections (below map on small screens) */}
      <div className="sm:hidden bg-surface border-t border-border-subtle px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <span className="text-xs text-text-muted whitespace-nowrap">Lines:</span>
        {SIMILARITY_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setSimilarityMode(mode.value)}
            className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap transition-colors ${
              similarityMode === mode.value
                ? "bg-accent text-white"
                : "text-text-muted"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
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
    <a
      href={href}
      className="px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-accent-light hover:bg-accent-muted transition-colors"
    >
      {children}
    </a>
  );
}

function Legend() {
  const items = [
    { color: "#e85d26", label: "Hindu" },
    { color: "#d4a72c", label: "Buddhist" },
    { color: "#2d8659", label: "Jain" },
  ];
  return (
    <div className="hidden lg:flex items-center gap-3">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/10"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}
