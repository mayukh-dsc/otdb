/**
 * Pipeline orchestrator. Single entry point for all data enrichment.
 *
 * Usage:
 *   npx tsx scripts/pipeline/run.ts                    # full run
 *   npx tsx scripts/pipeline/run.ts --source asi       # single source
 *   npx tsx scripts/pipeline/run.ts --dry-run          # preview changes
 *   npx tsx scripts/pipeline/run.ts --force            # ignore lastRun timestamps
 *   npx tsx scripts/pipeline/run.ts --temple q916943   # single temple
 *   npx tsx scripts/pipeline/run.ts --export-json      # regenerate temples.json from DB
 */

import { initDb, closeDb, getTempleCount } from "./db.js";
import { SOURCE_PRIORITY, PIPELINE_CONFIG, type SourceName } from "./config.js";
import {
  readState,
  writeState,
  recordSourceRun,
  addChangelog,
} from "./version.js";

interface CliArgs {
  source?: SourceName;
  dryRun: boolean;
  force: boolean;
  temple?: string;
  exportJson: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    force: false,
    exportJson: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--source":
        result.source = args[++i] as SourceName;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--force":
        result.force = true;
        break;
      case "--temple":
        result.temple = args[++i];
        break;
      case "--export-json":
        result.exportJson = true;
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  return result;
}

async function runSource(
  name: SourceName,
  _args: CliArgs
): Promise<number> {
  const config = PIPELINE_CONFIG.sources[name];
  if (!config.enabled) {
    console.log(`  [${name}] Skipped (disabled in config)`);
    return 0;
  }

  console.log(`  [${name}] Running (priority ${config.priority})...`);

  try {
    // Dynamic import of the source module
    const mod = await import(`./sources/${name}.js`);
    if (typeof mod.run === "function") {
      const updated = await mod.run(_args);
      console.log(`  [${name}] Updated ${updated} temples`);
      return updated;
    } else {
      console.log(`  [${name}] Source module not yet implemented`);
      return 0;
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("Cannot find module") ||
        err.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      console.log(`  [${name}] Source module not yet implemented`);
      return 0;
    }
    console.error(`  [${name}] Error:`, err);
    return 0;
  }
}

async function runTransform(name: string): Promise<void> {
  console.log(`  [transform:${name}] Running...`);
  try {
    const mod = await import(`./transforms/${name}.js`);
    if (typeof mod.run === "function") {
      await mod.run();
      console.log(`  [transform:${name}] Done`);
    } else {
      console.log(`  [transform:${name}] Not yet implemented`);
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("Cannot find module") ||
        err.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      console.log(`  [transform:${name}] Not yet implemented`);
      return;
    }
    console.error(`  [transform:${name}] Error:`, err);
  }
}

async function main() {
  const args = parseArgs();
  const state = readState();

  console.log(`\nOTDB Pipeline v${state.dataVersion}`);
  console.log(`Schema v${state.schemaVersion}`);
  console.log("─".repeat(50));

  if (args.dryRun) {
    console.log("DRY RUN — no changes will be written\n");
  }

  const db = initDb();
  const countBefore = getTempleCount(db);
  console.log(`Database: ${countBefore} temples\n`);

  // Determine which sources to run
  const sources: SourceName[] = args.source
    ? [args.source]
    : SOURCE_PRIORITY;

  // Run sources
  console.log("Sources:");
  let totalUpdated = 0;
  for (const source of sources) {
    const updated = await runSource(source, args);
    totalUpdated += updated;
    if (!args.dryRun && updated > 0) {
      recordSourceRun(state, source, updated);
    }
  }

  // Run transforms
  console.log("\nTransforms:");
  await runTransform("extract-engineering");
  await runTransform("generate-graph-tags");

  if (args.exportJson) {
    await runTransform("export-json");
  }

  // Update state
  const countAfter = getTempleCount(db);
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Temples: ${countAfter} (${countAfter - countBefore} new)`);
  console.log(`Fields updated across ${totalUpdated} temples`);

  if (!args.dryRun && totalUpdated > 0) {
    state.lastFullRun = new Date().toISOString();
    addChangelog(state, `Pipeline run: ${totalUpdated} temples updated`);
    writeState(state);
    console.log(`Version bumped to ${state.dataVersion}`);
  }

  closeDb();
  console.log("Done.\n");
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  closeDb();
  process.exit(1);
});
