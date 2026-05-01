import { expect, type Page } from "@playwright/test";

let emailCounter = 0;

export function getUniqueFreeEmail(prefix: string): string {
  emailCounter += 1;
  return `playground-free+${prefix}-${Date.now()}-${emailCounter}@example.com`;
}

export function getUniqueE2eEmail(prefix: string): string {
  emailCounter += 1;
  return `playground-e2e+${prefix}-${Date.now()}-${emailCounter}@example.com`;
}

export function solveChallenge(prompt: string): string {
  const match = prompt.match(/(\d+)\s*\+\s*(\d+)/);

  if (!match) {
    throw new Error(`Unable to parse challenge prompt: ${prompt}`);
  }

  return String(Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10));
}

async function openSignInPanel(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function signInAsFreeUser(page: Page, email: string) {
  await signInWithVisibleDevCode(page, email);
}

export async function signInWithVisibleDevCode(page: Page, email: string) {
  await openSignInPanel(page);

  await page.getByLabel("Email").fill(email);
  const challengeInput = page.getByLabel("Human check");
  await expect(challengeInput).toHaveAttribute("placeholder", /.+/);
  const challengePrompt = await challengeInput.getAttribute("placeholder");
  expect(challengePrompt).toBeTruthy();
  await page.getByLabel("Human check").fill(solveChallenge(challengePrompt!));
  await page.getByRole("button", { name: "Send Code" }).click();

  const devCodeText = await page
    .locator(".feedback-banner")
    .filter({ hasText: "development code:" })
    .textContent();
  const codeMatch = devCodeText?.match(/(\d{6})/);
  expect(codeMatch?.[1]).toBeTruthy();

  await page.getByLabel("Verification code").fill(codeMatch![1]);
  await page.getByRole("button", { name: "Verify And Enter" }).click();
  await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
}
