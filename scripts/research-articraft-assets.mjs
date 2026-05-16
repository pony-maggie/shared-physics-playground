import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_ARTICRAFT_ROOT = "/Users/malu/Documents/research/open-source/articraft-main";

export const GROUP_DEFINITIONS = {
  circular_motion: {
    priorityTerms: ["skateboard", "wheelchair", "wheelbarrow", "scooter", "toy_car", "toy car"],
    terms: [
      "wheel",
      "fan",
      "rotary",
      "shaft",
      "observation_wheel",
      "observation wheel",
      "skateboard",
      "wheelchair",
      "wheelbarrow",
      "scooter",
    ],
    whyUseful:
      "Rotating parts, axles, or circular travel can support angular velocity, centripetal force, and rolling-motion experiments.",
  },
  inclined_plane: {
    terms: ["ramp", "drawbridge", "inclined", "loading ramp"],
    whyUseful:
      "Sloped planes or hinged ramps can support normal-force, friction, and work-on-an-incline experiments.",
  },
  spring_oscillator: {
    terms: ["slider", "cartesian_stage", "cartesian stage", "gantry", "carriage", "linear axis"],
    whyUseful:
      "Linear guide, carriage, and slider structures can stand in for constrained spring-mass oscillator rigs.",
  },
  lever_balance: {
    terms: ["lever", "wheelbarrow", "trunnion", "seesaw", "pivot"],
    whyUseful:
      "Pivoted beams, handles, and load arms can support torque, balance, and mechanical-advantage experiments.",
  },
  lens_imaging: {
    terms: ["camera_lens", "camera lens", "microscope", "lens"],
    whyUseful:
      "camera lens barrels and microscope assemblies can provide inspectable optics apparatus for imaging and ray experiments.",
  },
};

const DERIVED_CONCEPT_TERMS = [
  { term: "skateboard", concepts: ["work_energy"] },
  { term: "wheelbarrow", concepts: ["work_energy"] },
  { term: "scooter", concepts: ["work_energy"] },
  { term: "ramp", concepts: ["work_energy"] },
];

const CURATED_RECORD_SCORE_BOOSTS = {
  rec_skateboard_b74cde82df474176b7005c584ba8eb13: {
    circular_motion: 100,
  },
};

function normalizeText(value) {
  return String(value ?? "").toLowerCase().replaceAll("-", "_");
}

function recordSearchText(record) {
  return [
    record.categorySlug,
    record.title,
    record.promptPreview,
    record.recordId,
  ]
    .map(normalizeText)
    .join(" ");
}

function includesTerm(searchText, term) {
  const normalizedTerm = normalizeText(term);
  return searchText.includes(normalizedTerm) || searchText.includes(normalizedTerm.replaceAll("_", " "));
}

export function scoreRecordForConcepts(record) {
  const searchText = recordSearchText(record);
  const matchedGroups = [];

  for (const [groupId, definition] of Object.entries(GROUP_DEFINITIONS)) {
    const matchedTerms = definition.terms.filter((term) => includesTerm(searchText, term));
    if (matchedTerms.length > 0) {
      const priorityMatches = (definition.priorityTerms ?? []).filter((term) =>
        includesTerm(searchText, term),
      );
      matchedGroups.push({
        groupId,
        matchedTerms,
        score:
          matchedTerms.length +
          priorityMatches.length * 5 +
          (CURATED_RECORD_SCORE_BOOSTS[record.recordId]?.[groupId] ?? 0),
        whyUseful: definition.whyUseful,
      });
    }
  }

  return matchedGroups.sort((a, b) => b.score - a.score || a.groupId.localeCompare(b.groupId));
}

function deriveConcepts(record, primaryConcept) {
  const concepts = new Set([primaryConcept]);
  const searchText = recordSearchText(record);

  for (const derived of DERIVED_CONCEPT_TERMS) {
    if (includesTerm(searchText, derived.term)) {
      for (const concept of derived.concepts) {
        concepts.add(concept);
      }
    }
  }

  return Array.from(concepts);
}

function materializationCommand(sourceRoot, recordId) {
  return `cd ${sourceRoot} && just compile data/records/${recordId}`;
}

function toCandidate(record, match, sourceRoot) {
  return {
    recordId: record.recordId,
    recordPath: record.recordPath,
    categorySlug: record.categorySlug,
    title: record.title,
    promptPreview: record.promptPreview,
    concepts: deriveConcepts(record, match.groupId),
    matchedTerms: match.matchedTerms,
    whyUseful: match.whyUseful,
    materializationCommand: materializationCommand(sourceRoot, record.recordId),
    runtimeDecision: "candidate",
  };
}

export function buildCandidateManifest(records, options = {}) {
  const sourceRoot = options.sourceRoot ?? DEFAULT_ARTICRAFT_ROOT;
  const perCategoryLimit = options.perCategoryLimit ?? 3;
  const perGroupLimit = options.perGroupLimit ?? 24;
  const groups = Object.fromEntries(Object.keys(GROUP_DEFINITIONS).map((groupId) => [groupId, []]));

  for (const record of records) {
    for (const match of scoreRecordForConcepts(record)) {
      groups[match.groupId].push({
        ...toCandidate(record, match, sourceRoot),
        score: match.score,
      });
    }
  }

  for (const [groupId, candidates] of Object.entries(groups)) {
    const categoryCounts = new Map();
    const diverseCandidates = [];

    for (const candidate of candidates.sort(
      (a, b) => b.score - a.score || a.recordId.localeCompare(b.recordId),
    )) {
      const categoryCount = categoryCounts.get(candidate.categorySlug) ?? 0;
      if (categoryCount >= perCategoryLimit) {
        continue;
      }

      categoryCounts.set(candidate.categorySlug, categoryCount + 1);
      diverseCandidates.push(candidate);
      if (diverseCandidates.length >= perGroupLimit) {
        break;
      }
    }

    groups[groupId] = diverseCandidates.map(({ score, ...candidate }) => candidate);
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot,
    note:
      "Read-only shortlist from Articraft source records. Candidates are not production dependencies until explicitly materialized and reviewed.",
    groups,
  };
}

export function readArticraftRecords(sourceRoot = DEFAULT_ARTICRAFT_ROOT) {
  const recordsRoot = path.join(sourceRoot, "data", "records");
  if (!existsSync(recordsRoot)) {
    throw new Error(`Articraft records directory not found: ${recordsRoot}`);
  }

  return readdirSync(recordsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const recordPath = path.join(recordsRoot, entry.name);
      const recordJsonPath = path.join(recordPath, "record.json");
      if (!existsSync(recordJsonPath)) {
        return [];
      }

      const raw = JSON.parse(readFileSync(recordJsonPath, "utf8"));
      return [
        {
          recordId: raw.record_id ?? entry.name,
          recordPath,
          categorySlug: raw.category_slug ?? "",
          title: raw.display?.title ?? "",
          promptPreview: raw.display?.prompt_preview ?? "",
        },
      ];
    });
}

function parseArgs(argv) {
  const options = {
    sourceRoot: DEFAULT_ARTICRAFT_ROOT,
    perGroupLimit: 24,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      options.sourceRoot = argv[index + 1];
      index += 1;
    } else if (arg === "--limit") {
      options.perGroupLimit = Number(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const options = parseArgs(process.argv.slice(2));
  const records = readArticraftRecords(options.sourceRoot);
  const manifest = buildCandidateManifest(records, options);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}
