import { expect, test } from "@playwright/test";

import { planSimulation } from "../../apps/server/src/education/simulation-planner";

const AUTH_TOKEN_STORAGE_KEY = "shared-physics-playground:auth-token";

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
  const experimentPanel = page.getByRole("region", { name: "Generated Experiment" });
  await expect(experimentPanel.getByRole("heading", { name: "斜面与摩擦" }).first()).toBeVisible();
  await expect(page.getByText(/acceleration:/)).toBeVisible();
  await expect(experimentPanel.getByRole("button", { name: "Play Experiment" })).toBeVisible();
  const viewer = experimentPanel.getByTestId("experiment-3d-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAttribute("data-concept", "inclined_plane");
  await expect(viewer).toHaveAttribute("data-debug-part-colors", "semantic");
  await expect(viewer).toHaveAttribute("data-debug-joint-overlay", "measurement");
  await expect(page.locator(".experiment-diagram")).toHaveCount(0);

  await expect(viewer).toHaveAttribute("data-running", "false");

  await page.getByRole("button", { name: "Play Experiment" }).click();
  await expect(page.getByRole("button", { name: "Pause Experiment" })).toBeVisible();
  await expect(viewer).toHaveAttribute("data-running", "true");
  await expect.poll(async () => Number(await viewer.getAttribute("data-playback-progress"))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await viewer.getAttribute("data-playback-progress")), {
    timeout: 3000,
  }).toBe(100);

  await page.getByRole("button", { name: "Reset Experiment" }).click();
  await expect(page.getByRole("button", { name: "Play Experiment" })).toBeVisible();
  await expect(viewer).toHaveAttribute("data-playback-progress", "0");
});

test("focused lab shell keeps language switching", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "中文" }).click();

  await expect(page.getByText("物理游乐场")).toBeVisible();
  await expect(page.getByRole("heading", { name: "物理实验室" })).toBeVisible();
  await expect(page.getByLabel("创建提示")).toHaveCount(0);
});

test("authenticated browser flow can generate every built-in experiment", async ({ page }) => {
  await page.addInitScript(
    ({ storageKey }) => {
      window.localStorage.setItem(storageKey, "browser-token");
    },
    { storageKey: AUTH_TOKEN_STORAGE_KEY },
  );
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        user: {
          userId: "browser-user",
          email: "browser@example.com",
          access: {
            tier: "pro",
            defaultStageSlug: "browser-stage",
            maxStages: 50,
            maxObjectsPerStage: 10,
            canCreateStages: true,
            defaultRoomSlug: "browser-stage",
            maxOwnedObjects: 10,
            canCreateNamedRooms: true,
          },
        },
      }),
    });
  });
  await page.route("**/api/education/simulations/plan", async (route) => {
    const body = route.request().postDataJSON() as {
      question?: string;
      selectedConcept?: string;
    };
    const planned = planSimulation(body.question ?? "", {
      selectedConcept: body.selectedConcept,
      suggestWhenUnsupported: true,
    });

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(planned),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();

  const experiments = [
    ["Inclined plane", "Inclined plane and friction", "inclined_plane"],
    ["Projectile motion", "Projectile motion", "projectile_motion"],
    ["Spring oscillator", "Spring oscillator", "spring_oscillator"],
    ["Pendulum", "Pendulum period", "pendulum"],
    ["Circular motion", "Circular motion", "circular_motion"],
    ["Elastic collision", "Elastic collision", "elastic_collision"],
    ["Buoyancy", "Buoyancy and floating", "buoyancy"],
    ["Lever balance", "Lever balance", "lever_balance"],
    ["Ohm's law", "Ohm's law circuit", "ohms_law"],
    ["Ideal gas", "Ideal gas pressure", "ideal_gas"],
    ["Work and energy", "Work and energy", "work_energy"],
    ["Wave speed", "Wave speed", "wave_speed"],
    ["Refraction", "Refraction", "refraction"],
    ["Lens imaging", "Lens imaging", "lens_imaging"],
    ["Coulomb force", "Coulomb force", "coulombs_law"],
    ["RC circuit", "RC circuit charging", "rc_circuit"],
  ] as const;

  for (const [chipLabel, experimentTitle, concept] of experiments) {
    await page.getByRole("button", { name: chipLabel }).click();
    await page.getByRole("button", { name: "Generate Experiment" }).click();

    const experimentPanel = page.getByRole("region", { name: "Generated Experiment" });
    await expect(experimentPanel.getByRole("heading", { name: experimentTitle }).first()).toBeVisible();
    await expect(experimentPanel.getByRole("button", { name: "Play Experiment" })).toBeVisible();
    const viewer = experimentPanel.getByTestId("experiment-3d-viewer");
    await expect(viewer).toBeVisible();
    await expect(viewer).toHaveAttribute("data-concept", concept);
    await expect(viewer).toHaveAttribute("data-debug-part-colors", "semantic");
    await expect(experimentPanel.locator(".experiment-diagram")).toHaveCount(0);
    await expect(experimentPanel.locator('[data-testid="experiment-motion-marker"]')).toHaveCount(0);
    await expect(experimentPanel.getByRole("button", { name: "Change angle" })).toHaveCount(0);

    await experimentPanel.getByRole("button", { name: "Play Experiment" }).click();
    await expect(experimentPanel.getByRole("button", { name: "Pause Experiment" })).toBeVisible();
    await expect(viewer).toHaveAttribute("data-running", "true");
    await experimentPanel.getByRole("button", { name: "Reset Experiment" }).click();
  }
});
