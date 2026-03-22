/**
 * Transform: extract dynasty/ruler information from description and history text.
 * Fills the dynasty column for temples where it is currently empty.
 */

import { openDb } from "../db.js";

interface Row {
  id: string;
  name: string;
  description: string | null;
  history: string | null;
  dynasty: string | null;
  part_of_complex: string | null;
}

const DYNASTY_PATTERNS: [RegExp, string][] = [
  [/\bchola\b/i, "Chola"],
  [/\bpallava\b/i, "Pallava"],
  [/\bchalukya\b/i, "Chalukya"],
  [/\bbadami chalukya/i, "Chalukya of Badami"],
  [/\bwestern chalukya/i, "Western Chalukya"],
  [/\brashtrakuta\b/i, "Rashtrakuta"],
  [/\bhoysala\b/i, "Hoysala"],
  [/\bvijayanagar/i, "Vijayanagara"],
  [/\bpandya\b/i, "Pandya"],
  [/\bnayak/i, "Nayaka"],
  [/\bgupta\b/i, "Gupta"],
  [/\bchandella\b/i, "Chandela"],
  [/\bparamara\b/i, "Paramara"],
  [/\bsolanki\b/i, "Solanki"],
  [/\bpratihara\b/i, "Pratihara"],
  [/\bganga\b/i, "Ganga"],
  [/\beastern ganga/i, "Eastern Ganga"],
  [/\bkakatiya\b/i, "Kakatiya"],
  [/\breddi\b/i, "Reddi"],
  [/\bsilahara\b/i, "Silahara"],
  [/\byadava\b/i, "Yadava"],
  [/\bsatavahana\b/i, "Satavahana"],
  [/\bmaury[ay]/i, "Maurya"],
  [/\bkushan\b/i, "Kushan"],
  [/\bsunga\b/i, "Shunga"],
  [/\bmalla\b/i, "Malla"],
  [/\bmallabhum\b/i, "Malla"],
  [/\blicchavi\b/i, "Licchavi"],
  [/\bthakuri\b/i, "Thakuri"],
  [/\bkhmer\b/i, "Khmer"],
  [/\bangkor/i, "Khmer"],
  [/\bsailendra\b/i, "Sailendra"],
  [/\bmataram\b/i, "Mataram"],
  [/\bsrivijaya/i, "Srivijaya"],
  [/\bmajapahit/i, "Majapahit"],
  [/\bpagan\b/i, "Pagan"],
  [/\bcham\b/i, "Cham"],
  [/\bsikh\b/i, "Sikh"],
  [/\bmaratha\b/i, "Maratha"],
  [/\bbundelkhand/i, "Bundela"],
  [/\btomara?\b/i, "Tomar"],
  [/\bsen\b(?!\w)/i, "Sen"],
  [/\bpala\b/i, "Pala"],
];

/**
 * Score how strongly a dynasty is associated with this temple text.
 * Prioritize mentions in the first 200 characters of history (usually
 * "built by X of Y dynasty") over mentions deep in the text.
 */
function findDynasty(text: string, history: string | null): string | null {
  const scores = new Map<string, number>();

  for (const [pattern, dynasty] of DYNASTY_PATTERNS) {
    let score = 0;

    if (history) {
      const first200 = history.slice(0, 200);
      const histMatches = first200.match(new RegExp(pattern.source, "gi"));
      if (histMatches) score += histMatches.length * 3;

      const restMatches = history.slice(200).match(new RegExp(pattern.source, "gi"));
      if (restMatches) score += restMatches.length;
    }

    const descMatches = text.match(new RegExp(pattern.source, "gi"));
    if (descMatches) score += descMatches.length;

    if (score > 0) {
      scores.set(dynasty, (scores.get(dynasty) || 0) + score);
    }
  }

  if (scores.size === 0) return null;

  let best = "";
  let bestScore = 0;
  for (const [dynasty, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = dynasty;
    }
  }

  return best;
}

export async function run(): Promise<void> {
  const db = openDb();

  const rows = db
    .prepare(
      "SELECT id, name, description, history, dynasty, part_of_complex FROM temples"
    )
    .all() as Row[];

  const update = db.prepare("UPDATE temples SET dynasty = ? WHERE id = ?");

  let updated = 0;

  const batch = db.transaction(() => {
    for (const row of rows) {
      if (row.dynasty && row.dynasty.trim()) continue;

      const text = [row.description || "", row.history || ""].join(" ");
      if (!text.trim()) continue;

      const dynasty = findDynasty(text, row.history);
      if (dynasty) {
        update.run(dynasty, row.id);
        updated++;
      }
    }
  });

  batch();
  console.log(`    Extracted dynasty for ${updated} temples`);
}
