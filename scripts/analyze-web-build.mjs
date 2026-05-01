#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";
import { init, parse } from "es-module-lexer";

const rootDir = process.cwd();
const distDir = join(rootDir, "apps", "web", "dist");
const indexPath = join(distDir, "index.html");
const assetsDir = join(distDir, "assets");
const args = new Set(process.argv.slice(2));
const outputJson = args.has("--json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function bytesToKib(bytes) {
  return bytes / 1024;
}

function roundKib(bytes) {
  return Number(bytesToKib(bytes).toFixed(2));
}

function displayKib(bytes) {
  return `${bytesToKib(bytes).toFixed(2)} KiB`;
}

function readHtmlAssets(html, tagName, attributeName, requiredAttribute) {
  const tagRegex = new RegExp(`<${tagName}\\b[^>]*>`, "g");
  const attributeRegex = new RegExp(`${attributeName}=["']([^"']+)["']`);
  const requiredRegex = requiredAttribute
    ? new RegExp(`${requiredAttribute.name}=["']${requiredAttribute.value}["']`)
    : null;
  const values = [];

  for (const match of html.matchAll(tagRegex)) {
    const tag = match[0];
    if (requiredRegex && !requiredRegex.test(tag)) {
      continue;
    }

    const attributeMatch = tag.match(attributeRegex);
    if (attributeMatch) {
      values.push(attributeMatch[1]);
    }
  }

  return values;
}

function assetNameFromHref(href) {
  return basename(href.split("?")[0]);
}

function describeHtmlAsset(href, chunkByFile) {
  const file = assetNameFromHref(href);
  const chunk = chunkByFile.get(file);
  return {
    href,
    file,
    known: Boolean(chunk),
    bytes: chunk?.bytes ?? null,
    kib: chunk ? roundKib(chunk.bytes) : null,
    gzipBytes: chunk?.gzipBytes ?? null,
    gzipKib: chunk ? roundKib(chunk.gzipBytes) : null,
  };
}

function normalizeLocalSpecifier(specifier) {
  if (!specifier || !specifier.startsWith("./")) {
    return null;
  }

  const withoutQuery = specifier.slice(2).split("?")[0];
  if (!withoutQuery.endsWith(".js")) {
    return null;
  }

  return basename(withoutQuery);
}

if (!existsSync(indexPath) || !existsSync(assetsDir)) {
  fail('Missing apps/web/dist output. Run "cd apps/web && npm run build" first.');
}

await init;

const html = readFileSync(indexPath, "utf8");
const jsFiles = readdirSync(assetsDir)
  .filter((file) => file.endsWith(".js"))
  .sort();

const chunks = [];
const chunkByFile = new Map();

for (const file of jsFiles) {
  const path = join(assetsDir, file);
  const source = readFileSync(path, "utf8");
  const bytes = statSync(path).size;
  const gzipBytes = gzipSync(source).length;
  const chunk = {
    file,
    bytes,
    kib: roundKib(bytes),
    gzipBytes,
    gzipKib: roundKib(gzipBytes),
    imports: [],
    importedBy: [],
  };

  const [imports] = parse(source);
  for (const imported of imports) {
    const target = normalizeLocalSpecifier(imported.n);
    if (!target) {
      continue;
    }

    chunk.imports.push({
      target,
      kind: imported.d === -1 ? "static" : "dynamic",
    });
  }

  chunks.push(chunk);
  chunkByFile.set(file, chunk);
}

for (const chunk of chunks) {
  for (const imported of chunk.imports) {
    const target = chunkByFile.get(imported.target);
    if (!target) {
      continue;
    }

    target.importedBy.push({
      source: chunk.file,
      kind: imported.kind,
    });
  }
}

const entryScripts = readHtmlAssets(html, "script", "src", {
  name: "type",
  value: "module",
}).map((href) => describeHtmlAsset(href, chunkByFile));

const modulePreloads = readHtmlAssets(html, "link", "href", {
  name: "rel",
  value: "modulepreload",
}).map((href) => describeHtmlAsset(href, chunkByFile));

const sortedChunks = chunks
  .map((chunk) => ({
    ...chunk,
    imports: chunk.imports.sort((left, right) => {
      return `${left.kind}:${left.target}`.localeCompare(`${right.kind}:${right.target}`);
    }),
    importedBy: chunk.importedBy.sort((left, right) => {
      return `${left.kind}:${left.source}`.localeCompare(`${right.kind}:${right.source}`);
    }),
  }))
  .sort((left, right) => right.bytes - left.bytes);

const report = {
  distDir: "apps/web/dist",
  html: {
    entryScripts,
    modulePreloads,
    deferred3dChunksPreloaded: modulePreloads.some((asset) => {
      return asset.file.includes("three-core") || asset.file.includes("react-three");
    }),
  },
  chunks: sortedChunks,
  importGraph: sortedChunks.flatMap((chunk) => {
    return chunk.imports.map((imported) => ({
      source: chunk.file,
      target: imported.target,
      kind: imported.kind,
      targetKnown: chunkByFile.has(imported.target),
    }));
  }),
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log("Web build analysis");
console.log(`Dist: ${report.distDir}`);

console.log("\nHTML entry scripts");
for (const asset of report.html.entryScripts) {
  const size = asset.known ? `${displayKib(asset.bytes)} raw, ${displayKib(asset.gzipBytes)} gzip` : "unknown asset";
  console.log(`- ${asset.file}: ${size}`);
}

console.log("\nHTML modulepreloads");
if (report.html.modulePreloads.length === 0) {
  console.log("- none");
} else {
  for (const asset of report.html.modulePreloads) {
    const size = asset.known ? `${displayKib(asset.bytes)} raw, ${displayKib(asset.gzipBytes)} gzip` : "unknown asset";
    console.log(`- ${asset.file}: ${size}`);
  }
}
console.log(
  `- deferred 3D chunks preloaded: ${report.html.deferred3dChunksPreloaded ? "yes" : "no"}`,
);

console.log("\nJS chunks by raw size");
for (const chunk of report.chunks) {
  console.log(`- ${chunk.file}: ${displayKib(chunk.bytes)} raw, ${displayKib(chunk.gzipBytes)} gzip`);
}

console.log("\nLocal import graph");
if (report.importGraph.length === 0) {
  console.log("- no local JS chunk imports found");
} else {
  for (const edge of report.importGraph) {
    const known = edge.targetKnown ? "" : " (missing target)";
    console.log(`- ${edge.source} -> ${edge.target} [${edge.kind}]${known}`);
  }
}
