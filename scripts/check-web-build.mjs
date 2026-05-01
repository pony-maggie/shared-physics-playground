#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { init, parse } from "es-module-lexer";

const rootDir = process.cwd();
const distDir = join(rootDir, "apps", "web", "dist");
const indexPath = join(distDir, "index.html");
const assetsDir = join(distDir, "assets");

const budgets = [
  {
    label: "index",
    pattern: /^index-[\w-]+\.js$/,
    maxKb: 32,
    required: true,
  },
  {
    label: "GenericTemplateExperiment",
    pattern: /^GenericTemplateExperiment-[\w-]+\.js$/,
    maxKb: 30,
    required: false,
  },
  {
    label: "ExperimentPromptCloud",
    pattern: /^ExperimentPromptCloud-[\w-]+\.js$/,
    maxKb: 20,
    required: false,
  },
  {
    label: "PricingPage",
    pattern: /^PricingPage-[\w-]+\.js$/,
    maxKb: 10,
    required: false,
  },
  {
    label: "PlaygroundCanvas",
    pattern: /^PlaygroundCanvas-[\w-]+\.js$/,
    maxKb: 230,
    required: false,
  },
  {
    label: "app-shared",
    pattern: /^app-shared-[\w-]+\.js$/,
    maxKb: 40,
    required: false,
  },
  {
    label: "realtime-vendor",
    pattern: /^realtime-vendor-[\w-]+\.js$/,
    maxKb: 160,
    required: false,
  },
  {
    label: "react-vendor",
    pattern: /^react-vendor-[\w-]+\.js$/,
    maxKb: 220,
    required: true,
  },
  {
    label: "state-vendor",
    pattern: /^state-vendor-[\w-]+\.js$/,
    maxKb: 10,
    required: false,
  },
  {
    label: "three-core",
    pattern: /^three-core-[\w-]+\.js$/,
    maxKb: 750,
    required: false,
  },
];

const forbiddenHtmlPreloads = ["ExperimentPromptCloud", "GenericTemplateExperiment", "PricingPage", "PlaygroundCanvas", "realtime-vendor", "three-core", "react-three"];
const forbiddenEntryStaticImports = ["ExperimentPromptCloud", "GenericTemplateExperiment", "PricingPage", "PlaygroundCanvas", "realtime-vendor", "three-core", "react-three"];
const failures = [];

function kb(bytes) {
  return bytes / 1024;
}

function formatKb(value) {
  return `${value.toFixed(2)} kB`;
}

function normalizeLocalSpecifier(specifier) {
  if (!specifier || !specifier.startsWith("./")) {
    return null;
  }

  return specifier.slice(2).split("?")[0];
}

if (!existsSync(indexPath)) {
  failures.push(
    `Missing ${indexPath}. Run "cd apps/web && npm run build" before this check.`,
  );
}

if (!existsSync(assetsDir)) {
  failures.push(
    `Missing ${assetsDir}. Run "cd apps/web && npm run build" before this check.`,
  );
}

let html = "";
if (existsSync(indexPath)) {
  html = readFileSync(indexPath, "utf8");
}

const modulePreloadLines = html
  .split(/\r?\n/)
  .filter((line) => line.includes('rel="modulepreload"'));

for (const chunkName of forbiddenHtmlPreloads) {
  const preloaded = modulePreloadLines.some((line) => line.includes(chunkName));
  if (preloaded) {
    failures.push(
      `index.html must not modulepreload ${chunkName}; keep the 3D stage deferred from first load.`,
    );
  }
}

const chunkSummaries = [];
const assetFiles = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
const jsFiles = assetFiles.filter((file) => file.endsWith(".js"));
let entryChunkFile = null;

for (const budget of budgets) {
  const matches = jsFiles.filter((file) => budget.pattern.test(file));
  if (matches.length === 0) {
    if (budget.required) {
      failures.push(`Missing expected ${budget.label} chunk matching ${budget.pattern}.`);
    }
    continue;
  }

  if (matches.length > 1) {
    failures.push(
      `Expected one ${budget.label} chunk, found ${matches.length}: ${matches.join(", ")}.`,
    );
    continue;
  }

  const file = matches[0];
  if (budget.label === "index") {
    entryChunkFile = file;
  }

  const sizeKb = kb(statSync(join(assetsDir, file)).size);
  chunkSummaries.push({
    label: budget.label,
    file,
    sizeKb,
    maxKb: budget.maxKb,
  });

  if (sizeKb > budget.maxKb) {
    failures.push(
      `${budget.label} chunk is ${formatKb(sizeKb)}, above the ${formatKb(
        budget.maxKb,
      )} budget (${file}).`,
    );
  }
}

if (entryChunkFile) {
  await init;

  const entrySource = readFileSync(join(assetsDir, entryChunkFile), "utf8");
  const [imports] = parse(entrySource);
  for (const imported of imports) {
    if (imported.d !== -1) {
      continue;
    }

    const target = normalizeLocalSpecifier(imported.n);
    if (!target) {
      continue;
    }

    for (const chunkName of forbiddenEntryStaticImports) {
      if (target.includes(chunkName)) {
        failures.push(
          `entry chunk must not statically import ${chunkName}; found ${entryChunkFile} -> ${target}.`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Web build performance guardrail failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Web build performance guardrail passed:");
for (const summary of chunkSummaries) {
  console.log(
    `- ${summary.label}: ${formatKb(summary.sizeKb)} / ${formatKb(summary.maxKb)} (${summary.file})`,
  );
}

if (modulePreloadLines.length === 0) {
  console.log("- HTML modulepreload: none");
} else {
  console.log(`- HTML modulepreload: ${modulePreloadLines.length} allowed link(s)`);
}
