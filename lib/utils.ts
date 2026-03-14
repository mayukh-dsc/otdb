import { Temple, TimeRange } from "./types";

export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BC`;
  if (year === 0) return "1 BC";
  return `${year} AD`;
}

export function filterTemplesByTimeRange(
  temples: Temple[],
  range: TimeRange
): Temple[] {
  return temples.filter((t) => {
    const start = t.yearBuilt;
    const end = t.yearBuiltEnd ?? t.yearBuilt;
    return end >= range.start && start <= range.end;
  });
}

export function getWikimediaImageUrl(
  filename: string,
  width: number = 800
): string {
  const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${width}`;
}

export function getReligionColor(religion: string): string {
  switch (religion) {
    case "Hindu":
      return "#e85d26";
    case "Buddhist":
      return "#d4a72c";
    case "Jain":
      return "#2d8659";
    default:
      return "#4a7fb5";
  }
}
