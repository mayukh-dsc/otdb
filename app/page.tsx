"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Temple, TimeRange, MIN_YEAR, MAX_YEAR } from "@/lib/types";
import { filterTemplesByTimeRange } from "@/lib/utils";
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-stone-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-stone-900 border-b border-stone-700 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-amber-400 tracking-wide">
            OTDB
          </h1>
          <span className="text-xs text-stone-400 hidden sm:inline">
            Old Temples Database
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-stone-400">
          <span>
            Showing{" "}
            <span className="text-amber-400 font-medium">
              {filteredTemples.length}
            </span>{" "}
            of {temples.length} temples
          </span>
          <a
            href="/handbook"
            className="hidden sm:inline text-stone-400 hover:text-amber-400 transition-colors"
          >
            Handbook
          </a>
          <a
            href="/temples"
            className="hidden sm:inline text-stone-400 hover:text-amber-400 transition-colors"
          >
            Browse
          </a>
          <Legend />
        </div>
      </header>

      {/* Time Slider */}
      <div className="bg-stone-800 border-b border-stone-700 z-20 flex-shrink-0">
        <TimeRangeSlider value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Map + Side Panel */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-stone-100">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-stone-500 text-sm">Loading temples...</p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center bg-stone-100">
                  <p className="text-stone-500 text-sm">Loading map...</p>
                </div>
              }
            >
              <MapView
                temples={filteredTemples}
                selectedTempleId={selectedTemple?.id ?? null}
                onSelectTemple={handleSelectTemple}
              />
            </Suspense>
          )}
        </div>

        {/* Side Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-30 transition-transform duration-300 ease-in-out ${
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
            className="absolute inset-0 bg-black/30 z-20 sm:hidden cursor-default"
            onClick={handleClosePanel}
            aria-label="Close panel"
            tabIndex={-1}
          />
        )}
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { color: "#e85d26", label: "Hindu" },
    { color: "#d4a72c", label: "Buddhist" },
    { color: "#2d8659", label: "Jain" },
  ];
  return (
    <div className="hidden md:flex items-center gap-3">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-stone-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
