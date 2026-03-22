/**
 * Client-side feature flags.
 * Set via environment variables at build time (NEXT_PUBLIC_ prefix).
 * Defaults are the new optimized behavior; set to "false" to revert.
 */
export const flags = {
  useSummaryApi: process.env.NEXT_PUBLIC_USE_SUMMARY_API !== "false",
  enableSimilarityGating: process.env.NEXT_PUBLIC_SIMILARITY_GATING !== "false",
} as const;
