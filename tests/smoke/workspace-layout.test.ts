import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

describe('workspace layout', () => {
  it('exposes the expected root scripts and workspace files', () => {
    const packageJson = readJson('package.json') as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toEqual({
      dev: 'pnpm --parallel --filter @playground/web --filter @playground/server dev',
      test: 'NODE_OPTIONS=--localstorage-file=.vitest-localstorage vitest run',
      typecheck: 'pnpm -r typecheck',
      'check:web-build': 'node scripts/check-web-build.mjs',
      'analyze:web-build': 'node scripts/analyze-web-build.mjs',
      e2e: 'playwright test',
      'harness:init': './harness/init.sh',
      'harness:verify': './harness/verify.sh',
      'harness:smoke': './harness/smoke.sh',
    });

    for (const file of [
      'apps/web/package.json',
      'apps/server/package.json',
      'packages/shared/package.json',
      'packages/physics-schema/package.json',
      'packages/prompt-contracts/package.json',
      'scripts/check-web-build.mjs',
      'scripts/analyze-web-build.mjs',
      'vitest.config.ts',
      'playwright.config.ts',
    ]) {
      expect(existsSync(join(root, file))).toBe(true);
    }
  });

  it('keeps the focused physics lab layout in the web shell', () => {
    const styles = readFileSync(join(root, 'apps/web/src/styles.css'), 'utf8');
    const appSource = readFileSync(join(root, 'apps/web/src/App.tsx'), 'utf8');

    expect(styles).toContain('.physics-lab-layout {\n  display: grid;');
    expect(styles).toContain('grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);');
    expect(styles).toContain('.physics-question-panel {\n  position: sticky;');
    expect(styles).toContain('.experiment-panel--empty {\n  min-height: 520px;');
    expect(appSource).not.toContain('PlaygroundCanvas');
    expect(appSource).not.toContain('CreatePanel');
    expect(appSource).not.toContain('SaveWorldButton');
    for (const selector of [
      '.workspace-grid',
      '.stage-panel',
      '.stage-actions-panel',
      '.stage-surface',
      '.stage-canvas',
      '.stage-transform-toolbar',
      '.side-rail',
      '.inspector-shell',
      '.image-preview',
      '.vector-grid',
      '.action-grid',
    ]) {
      expect(styles).not.toContain(selector);
    }
  });

  it('does not keep legacy web stage and create modules in the focused lab', () => {
    const webPackage = readJson('apps/web/package.json') as {
      dependencies?: Record<string, string>;
    };
    const i18nSource = readFileSync(join(root, 'apps/web/src/i18n.ts'), 'utf8');

    for (const path of [
      'apps/web/src/features/create',
      'apps/web/src/features/persistence',
      'apps/web/src/scene',
      'apps/web/src/state/room-client.ts',
      'apps/web/src/state/realtime-room.ts',
      'apps/web/src/state/selection-store.ts',
    ]) {
      expect(existsSync(join(root, path))).toBe(false);
    }

    expect(webPackage.dependencies).not.toHaveProperty('@react-three/drei');
    expect(webPackage.dependencies).not.toHaveProperty('@react-three/fiber');
    expect(webPackage.dependencies).not.toHaveProperty('colyseus.js');
    expect(webPackage.dependencies).not.toHaveProperty('three');
    for (const legacyCopy of [
      'Create Objects',
      'Create From Text',
      'Stage Actions',
      'Selected Object',
      'Queue Upward Impulse',
      '创建物体',
      '舞台操作',
      '当前选中物体',
    ]) {
      expect(i18nSource).not.toContain(legacyCopy);
    }
  });
});
