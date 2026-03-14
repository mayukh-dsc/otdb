export const PIPELINE_CONFIG = {
  userAgent: "OTDB-TempleDatabase/2.0 (educational project; https://github.com/otdb)",

  sources: {
    asi: {
      enabled: true,
      priority: 1,
      rateLimitMs: 500,
      retries: 3,
      baseUrls: [
        "https://asi.nic.in",
        "https://tspasibhopal.nic.in",
      ],
    },
    wikidata: {
      enabled: true,
      priority: 2,
      rateLimitMs: 200,
      retries: 2,
      endpoint: "https://query.wikidata.org/sparql",
    },
    wikipedia: {
      enabled: true,
      priority: 3,
      rateLimitMs: 300,
      retries: 2,
      endpoint: "https://en.wikipedia.org/w/api.php",
    },
    commons: {
      enabled: true,
      priority: 4,
      rateLimitMs: 300,
      retries: 2,
      endpoint: "https://commons.wikimedia.org/w/api.php",
    },
    "data-gov": {
      enabled: false, // enable when datasets are identified
      priority: 5,
      rateLimitMs: 500,
      retries: 2,
      endpoint: "https://data.gov.in/resource",
    },
  },

  versioning: {
    stateFile: "data/pipeline-state.json",
  },
} as const;

export type SourceName = keyof typeof PIPELINE_CONFIG.sources;

export const SOURCE_PRIORITY: SourceName[] = [
  "asi",
  "wikidata",
  "wikipedia",
  "commons",
  "data-gov",
];
