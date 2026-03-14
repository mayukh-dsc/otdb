"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { formatYear } from "@/lib/utils";
import { MIN_YEAR, MAX_YEAR, TimeRange } from "@/lib/types";

interface TimeRangeSliderProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const TOTAL_RANGE = MAX_YEAR - MIN_YEAR;

function yearToPercent(year: number): number {
  return ((year - MIN_YEAR) / TOTAL_RANGE) * 100;
}

function percentToYear(pct: number): number {
  return Math.round(MIN_YEAR + (pct / 100) * TOTAL_RANGE);
}

const TICK_YEARS = [-1000, -500, 0, 500, 1000, 1500, 2000];

export default function TimeRangeSlider({
  value,
  onChange,
}: TimeRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const getYearFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
      );
      return percentToYear(pct);
    },
    []
  );

  const handleMouseDown = useCallback(
    (handle: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = handle;

      const onMove = (me: MouseEvent) => {
        const year = getYearFromEvent(me);
        setLocalValue((prev) => {
          if (dragging.current === "start") {
            const s = Math.min(year, prev.end - 10);
            return { start: Math.max(MIN_YEAR, s), end: prev.end };
          } else {
            const e = Math.max(year, prev.start + 10);
            return { start: prev.start, end: Math.min(MAX_YEAR, e) };
          }
        });
      };

      const onUp = () => {
        dragging.current = null;
        setLocalValue((current) => {
          onChange(current);
          return current;
        });
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [getYearFromEvent, onChange]
  );

  const handleTouchStart = useCallback(
    (handle: "start" | "end") => (e: React.TouchEvent) => {
      e.preventDefault();
      dragging.current = handle;

      const onMove = (te: TouchEvent) => {
        if (!trackRef.current || !te.touches[0]) return;
        const rect = trackRef.current.getBoundingClientRect();
        const pct = Math.max(
          0,
          Math.min(
            100,
            ((te.touches[0].clientX - rect.left) / rect.width) * 100
          )
        );
        const year = percentToYear(pct);
        setLocalValue((prev) => {
          if (dragging.current === "start") {
            const s = Math.min(year, prev.end - 10);
            return { start: Math.max(MIN_YEAR, s), end: prev.end };
          } else {
            const e = Math.max(year, prev.start + 10);
            return { start: prev.start, end: Math.min(MAX_YEAR, e) };
          }
        });
      };

      const onEnd = () => {
        dragging.current = null;
        setLocalValue((current) => {
          onChange(current);
          return current;
        });
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };

      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    },
    [onChange]
  );

  const startPct = yearToPercent(localValue.start);
  const endPct = yearToPercent(localValue.end);

  return (
    <div className="w-full px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-amber-200">
          {formatYear(localValue.start)}
        </span>
        <span className="text-xs text-amber-300/70 uppercase tracking-wider">
          Time Period
        </span>
        <span className="text-sm font-medium text-amber-200">
          {formatYear(localValue.end)}
        </span>
      </div>

      <div className="relative h-10 flex items-center" ref={trackRef}>
        {/* Background track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-stone-700" />

        {/* Active range */}
        <div
          className="absolute h-1.5 rounded-full bg-amber-500"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
          }}
        />

        {/* Tick marks */}
        {TICK_YEARS.map((yr) => (
          <div
            key={yr}
            className="absolute top-7 -translate-x-1/2"
            style={{ left: `${yearToPercent(yr)}%` }}
          >
            <div className="w-px h-2 bg-stone-600 mx-auto" />
            <span className="text-[10px] text-stone-500 block text-center mt-0.5 whitespace-nowrap">
              {formatYear(yr)}
            </span>
          </div>
        ))}

        {/* Start handle */}
        <div
          className="absolute w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{ left: `${startPct}%`, transform: "translateX(-50%)" }}
          onMouseDown={handleMouseDown("start")}
          onTouchStart={handleTouchStart("start")}
          role="slider"
          tabIndex={0}
          aria-label="Start year"
          aria-valuemin={MIN_YEAR}
          aria-valuemax={MAX_YEAR}
          aria-valuenow={localValue.start}
        />

        {/* End handle */}
        <div
          className="absolute w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{ left: `${endPct}%`, transform: "translateX(-50%)" }}
          onMouseDown={handleMouseDown("end")}
          onTouchStart={handleTouchStart("end")}
          role="slider"
          tabIndex={0}
          aria-label="End year"
          aria-valuemin={MIN_YEAR}
          aria-valuemax={MAX_YEAR}
          aria-valuenow={localValue.end}
        />
      </div>
    </div>
  );
}
