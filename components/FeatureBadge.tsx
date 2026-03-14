"use client";

import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
  anatomy: "bg-indigo-50 text-indigo-700 border-indigo-200",
  style: "bg-purple-50 text-purple-700 border-purple-200",
  technique: "bg-sky-50 text-sky-700 border-sky-200",
  material: "bg-amber-50 text-amber-700 border-amber-200",
  water: "bg-cyan-50 text-cyan-700 border-cyan-200",
  plan: "bg-rose-50 text-rose-700 border-rose-200",
  environmental: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  anatomy: "🏛",
  style: "◆",
  technique: "⚙",
  material: "⬡",
  water: "💧",
  plan: "▣",
  environmental: "☀",
};

function getCategoryFromTag(tag: string): string {
  const prefix = tag.split(":")[0];
  const map: Record<string, string> = {
    feature: "anatomy",
    style: "style",
    technique: "technique",
    material: "material",
    water: "water",
    plan: "plan",
    environmental: "environmental",
  };
  return map[prefix] || "technique";
}

function formatTagLabel(tag: string): string {
  const value = tag.split(":").slice(1).join(":");
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface FeatureBadgeProps {
  tag: string;
  count?: number;
  size?: "sm" | "md";
}

export default function FeatureBadge({
  tag,
  count,
  size = "sm",
}: FeatureBadgeProps) {
  const category = getCategoryFromTag(tag);
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.technique;
  const icon = CATEGORY_ICONS[category] || "◈";
  const label = formatTagLabel(tag);

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <Link
      href={`/temples?tag=${encodeURIComponent(tag)}`}
      className={`inline-flex items-center gap-1 rounded-full border ${colors} ${sizeClasses} font-medium hover:opacity-80 transition-opacity whitespace-nowrap`}
    >
      <span className="text-[0.65em]">{icon}</span>
      <span>{label}</span>
      {count !== undefined && (
        <span className="opacity-60 ml-0.5">({count})</span>
      )}
    </Link>
  );
}

interface FeatureBadgeGroupProps {
  tags: string[];
  maxVisible?: number;
  size?: "sm" | "md";
}

export function FeatureBadgeGroup({
  tags,
  maxVisible = 6,
  size = "sm",
}: FeatureBadgeGroupProps) {
  if (!tags || tags.length === 0) return null;

  const visible = tags.slice(0, maxVisible);
  const remaining = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((tag) => (
        <FeatureBadge key={tag} tag={tag} size={size} />
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs text-stone-400">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
