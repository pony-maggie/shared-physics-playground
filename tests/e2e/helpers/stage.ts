import { expect, type Page } from "@playwright/test";

export type StageTestObjectSnapshot = {
  id: string;
  kind: string;
  label: string;
  worldPosition: [number, number, number];
  screenX: number;
  screenY: number;
  depth: number;
  visible: boolean;
};

export type StageTestSnapshot = {
  viewport: {
    width: number;
    height: number;
  };
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  objects: StageTestObjectSnapshot[];
};

export type StageObjectMatcher = {
  id?: string;
  kind?: string;
  label?: string;
};

declare global {
  interface Window {
    __sharedPhysicsPlaygroundStageTest?: StageTestSnapshot | null;
  }
}

function matchesObject(object: StageTestObjectSnapshot, matcher: StageObjectMatcher) {
  return (
    (matcher.id === undefined || object.id === matcher.id) &&
    (matcher.kind === undefined || object.kind === matcher.kind) &&
    (matcher.label === undefined || object.label === matcher.label)
  );
}

export async function getStageSnapshot(page: Page): Promise<StageTestSnapshot> {
  return page.evaluate(() => {
    const snapshot = window.__sharedPhysicsPlaygroundStageTest;

    if (!snapshot) {
      throw new Error("stage test snapshot is unavailable");
    }

    return snapshot;
  });
}

export async function waitForStageSnapshot(page: Page): Promise<StageTestSnapshot> {
  await page.waitForFunction(() => Boolean(window.__sharedPhysicsPlaygroundStageTest));
  return getStageSnapshot(page);
}

export async function waitForStageObject(
  page: Page,
  matcher: StageObjectMatcher,
): Promise<StageTestObjectSnapshot> {
  await page.waitForFunction(
    ({ id, kind, label }) => {
      const snapshot = window.__sharedPhysicsPlaygroundStageTest;

      if (!snapshot) {
        return false;
      }

      return snapshot.objects.some((object) => {
        return (
          (id === undefined || object.id === id) &&
          (kind === undefined || object.kind === kind) &&
          (label === undefined || object.label === label)
        );
      });
    },
    matcher,
  );

  const snapshot = await getStageSnapshot(page);
  const object = snapshot.objects.find((entry) => matchesObject(entry, matcher));

  if (!object) {
    throw new Error(`Unable to find stage object for ${JSON.stringify(matcher)}`);
  }

  return object;
}

export async function moveMouseToStageObject(
  page: Page,
  object: StageTestObjectSnapshot,
): Promise<void> {
  const viewport = page.locator(".stage-viewport");
  const viewportBox = await viewport.boundingBox();

  if (!viewportBox) {
    throw new Error("stage viewport is unavailable");
  }

  await page.mouse.move(
    Math.round(viewportBox.x + object.screenX),
    Math.round(viewportBox.y + object.screenY),
  );
}

export async function hoverStageObject(
  page: Page,
  object: StageTestObjectSnapshot,
): Promise<void> {
  await moveMouseToStageObject(page, object);
  await expect(page.locator(".stage-hover-tag")).toHaveText(object.label);
}

export async function clickStageObject(
  page: Page,
  object: StageTestObjectSnapshot,
): Promise<void> {
  const viewport = page.locator(".stage-viewport");
  const viewportBox = await viewport.boundingBox();

  if (!viewportBox) {
    throw new Error("stage viewport is unavailable");
  }

  await page.mouse.click(
    Math.round(viewportBox.x + object.screenX),
    Math.round(viewportBox.y + object.screenY),
  );
}

export async function dragStageObject(
  page: Page,
  object: StageTestObjectSnapshot,
  delta: { x: number; y: number },
): Promise<void> {
  const viewport = page.locator(".stage-viewport");
  const viewportBox = await viewport.boundingBox();

  if (!viewportBox) {
    throw new Error("stage viewport is unavailable");
  }

  const startX = Math.round(viewportBox.x + object.screenX);
  const startY = Math.round(viewportBox.y + object.screenY);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + delta.x, startY + delta.y, { steps: 8 });
  await page.mouse.up();
}
