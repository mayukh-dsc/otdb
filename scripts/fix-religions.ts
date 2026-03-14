/**
 * Fix script: infers religion from temple name, deity, and context.
 * Run with: npx tsx scripts/fix-religions.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TempleData {
  name: string;
  religion: string;
  deity?: string;
  description?: string;
  architecturalStyle?: string;
  country?: string;
  [key: string]: unknown;
}

const HINDU_KEYWORDS = [
  "shiva", "vishnu", "krishna", "rama", "hanuman", "ganesh", "ganesha",
  "lakshmi", "parvati", "durga", "kali", "saraswati", "brahma",
  "murugan", "kartikeya", "skanda", "ayyappan", "venkateswara",
  "balaji", "jagannath", "ranganatha", "meenakshi", "kamakshi",
  "sundareswara", "nataraja", "lingam", "linga", "somnat",
  "kedarnath", "badrinath", "dwarkadhish", "tirupati",
  "mahadeva", "mahadev", "iswara", "ishwara", "eswar", "eswara",
  "narasimha", "hayagriva", "varadaraja",
  "hindu temple", "hindu",
  "dravidian", "nagara", "vesara", "hoysala", "chola", "pallava",
  "chalukya", "rashtrakuta", "vijayanagar",
  "gopuram", "vimana", "mandapa", "garbhagriha",
  "temple of", "kovil", "mandir", "devasthan",
  "sun temple",
];

const BUDDHIST_KEYWORDS = [
  "buddha", "buddhist", "stupa", "vihara", "chaitya",
  "borobudur", "pagoda", "wat ", "wat_", "angkor",
  "bayon", "ta prohm", "banteay", "preah", "bagan",
  "mahabodhi", "sanchi", "ajanta", "sarnath",
  "theravada", "mahayana", "zen", "khmer",
  "monastery", "dagoba", "chedi",
];

const JAIN_KEYWORDS = [
  "jain", "jaina", "dilwara", "ranakpur", "palitana",
  "tirthankara", "mahavira", "parshvanath", "adinath",
  "bahubali", "gomateshwara",
];

const CHRISTIAN_KEYWORDS = [
  "church", "cathedral", "basilica", "chapel", "se cathedral",
  "our lady", "st.", "saint", "francis", "christian",
];

function inferReligion(t: TempleData): string {
  const text = [
    t.name,
    t.deity,
    t.description?.slice(0, 500),
    t.architecturalStyle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (CHRISTIAN_KEYWORDS.some((k) => text.includes(k))) return "Other";
  if (JAIN_KEYWORDS.some((k) => text.includes(k))) return "Jain";
  if (BUDDHIST_KEYWORDS.some((k) => text.includes(k))) return "Buddhist";
  if (HINDU_KEYWORDS.some((k) => text.includes(k))) return "Hindu";

  // Default for Indian temples without other indicators
  if (
    t.country === "India" &&
    (text.includes("temple") || text.includes("mandir"))
  ) {
    return "Hindu";
  }

  // Default for SE Asian temples
  if (
    ["Cambodia", "Thailand", "Myanmar", "Laos"].includes(t.country || "")
  ) {
    if (text.includes("temple") || text.includes("wat") || text.includes("pagoda")) {
      return "Buddhist";
    }
  }

  if (t.country === "Indonesia") {
    if (text.includes("candi") || text.includes("prambanan")) return "Hindu";
  }

  return "Hindu"; // most temples in our dataset are Hindu
}

function main() {
  const dataDir = join(__dirname, "..", "data");
  const temples: TempleData[] = JSON.parse(
    readFileSync(join(dataDir, "temples.json"), "utf-8")
  );

  let changed = 0;
  const before: Record<string, number> = {};
  const after: Record<string, number> = {};

  for (const t of temples) {
    before[t.religion] = (before[t.religion] || 0) + 1;

    if (t.religion === "Other") {
      const inferred = inferReligion(t);
      if (inferred !== "Other") {
        t.religion = inferred;
        changed++;
      }
    }

    after[t.religion] = (after[t.religion] || 0) + 1;
  }

  writeFileSync(join(dataDir, "temples.json"), JSON.stringify(temples, null, 2));

  console.log("Before:", before);
  console.log("After:", after);
  console.log(`Changed ${changed} temples`);
}

main();
