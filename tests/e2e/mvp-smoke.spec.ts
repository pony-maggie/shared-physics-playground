import { expect, test } from "@playwright/test";

test("guest can try the fixed inclined-plane demo without custom generation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Physics Playground")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Physics Lab" })).toBeVisible();
  await expect(page.getByRole("region", { name: "World Stage" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Object Inspector" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Stage Actions" })).toHaveCount(0);
  await expect(page.getByLabel("Create prompt")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create From Text" })).toHaveCount(0);

  await expect(page.getByRole("button", { name: "Generate Experiment" })).toBeDisabled();
  await expect(page.getByText("Sign in to generate a custom AI experiment.")).toBeVisible();
  await expect(page.getByRole("group", { name: "Supported experiments" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Projectile motion" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refraction" })).toBeVisible();
  await page.getByRole("button", { name: "Projectile motion" }).click();
  await expect(page.getByLabel("Physics question")).toHaveValue("How far will a ball fly if I launch it upward?");
  await expect(page.getByText("斜面与摩擦")).toBeVisible();
  await expect(page.getByText(/acceleration:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Experiment" })).toBeVisible();

  const ball = page.getByTestId("rolling-ball");
  await expect(ball).toHaveAttribute("data-running", "false");

  await page.getByRole("button", { name: "Play Experiment" }).click();
  await expect(page.getByRole("button", { name: "Pause Experiment" })).toBeVisible();
  await expect(ball).toHaveAttribute("data-running", "true");
  await expect.poll(async () => Number(await ball.getAttribute("data-progress"))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await ball.getAttribute("data-progress")), {
    timeout: 3000,
  }).toBe(100);

  const contactGeometry = await page.locator(".experiment-diagram").evaluate((diagram) => {
    const ramp = diagram.querySelector("line");
    const rollingBall = diagram.querySelector('[data-testid="rolling-ball"]');

    if (!ramp || !rollingBall) {
      throw new Error("Inclined-plane geometry is missing from the experiment diagram.");
    }

    const x1 = Number(ramp.getAttribute("x1"));
    const y1 = Number(ramp.getAttribute("y1"));
    const x2 = Number(ramp.getAttribute("x2"));
    const y2 = Number(ramp.getAttribute("y2"));
    const cx = Number(rollingBall.getAttribute("cx"));
    const cy = Number(rollingBall.getAttribute("cy"));
    const radius = Number(rollingBall.getAttribute("r"));
    const rampStrokeWidth = Number(ramp.getAttribute("stroke-width"));
    const centerLineDistance =
      Math.abs((y2 - y1) * cx - (x2 - x1) * cy + x2 * y1 - y2 * x1) /
      Math.hypot(y2 - y1, x2 - x1);

    return {
      centerLineDistance,
      minimumClearance: radius + rampStrokeWidth / 2,
    };
  });

  expect(contactGeometry.centerLineDistance).toBeGreaterThanOrEqual(
    contactGeometry.minimumClearance - 0.25,
  );

  await page.getByRole("button", { name: "Reset Experiment" }).click();
  await expect(page.getByRole("button", { name: "Play Experiment" })).toBeVisible();
  await expect(ball).toHaveAttribute("data-progress", "0");
});

test("focused lab shell keeps language switching", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "中文" }).click();

  await expect(page.getByText("物理游乐场")).toBeVisible();
  await expect(page.getByRole("heading", { name: "物理实验室" })).toBeVisible();
  await expect(page.getByLabel("创建提示")).toHaveCount(0);
});
