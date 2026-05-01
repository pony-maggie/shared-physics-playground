// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { resetAuthState, useAuthStore } from "./state/auth-store";
import { resetSimulationClientState, useSimulationClient } from "./state/simulation-client";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetAuthState();
  resetSimulationClientState();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.pushState({}, "", "/");
});

function setInitializedAnonymousSession() {
  useAuthStore.setState({
    initialized: true,
    language: "en",
    session: { kind: "anonymous" },
    challenge: null,
    requestStatus: { kind: "idle" },
    verifyStatus: { kind: "idle" },
    devCode: null,
  });
}

describe("App", () => {
  it("serves a fixed demo to anonymous users instead of custom AI generation", async () => {
    setInitializedAnonymousSession();

    render(<App />);

    expect(screen.getByRole("heading", { name: "Physics Lab" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "World Stage" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Object Inspector" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Stage Actions" })).toBeNull();
    expect(screen.queryByLabelText("Create prompt")).toBeNull();
    expect(screen.getByRole("button", { name: "Generate Experiment" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Sign in to generate a custom AI experiment.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play Experiment" })).toBeTruthy();
  });

  it("keeps public snapshot viewing available as a read-only route", async () => {
    setInitializedAnonymousSession();
    window.history.pushState({}, "", "/?snapshot=snapshot-1");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/api/snapshots/snapshot-1")) {
        return new Response(
          JSON.stringify({
            snapshotId: "snapshot-1",
            worldId: "world-1",
            title: "Saved Stage",
            imageDataUrl: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E",
            objectCount: 3,
            createdAt: "2026-04-30T00:00:00.000Z",
          }),
          { status: 200 },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Saved Stage" })).toBeTruthy();
    });
    expect(screen.getByText("objects on stage: 3/3")).toBeTruthy();
    expect(screen.queryByLabelText("Create prompt")).toBeNull();
  });

  it("keeps language switching in the focused lab shell", () => {
    setInitializedAnonymousSession();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "中文" }));

    expect(screen.getByRole("heading", { name: "物理实验室" })).toBeTruthy();
  });

  it("shows a pricing page and records Pro purchase intent", async () => {
    useAuthStore.setState({
      initialized: true,
      language: "en",
      session: {
        kind: "authenticated",
        authToken: "token-1",
        user: {
          userId: "user-free",
          email: "free@example.com",
          access: {
            tier: "free",
            defaultStageSlug: "my-stage",
            maxStages: 1,
            maxObjectsPerStage: 5,
            canCreateStages: false,
            defaultRoomSlug: "my-stage",
            maxOwnedObjects: 5,
            canCreateNamedRooms: false,
          },
        },
      },
      challenge: null,
      requestStatus: { kind: "idle" },
      verifyStatus: { kind: "idle" },
      devCode: null,
    });
    window.history.pushState({}, "", "/pricing");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 202 }),
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Choose your plan" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(screen.queryByText("Recording interest...")).toBeNull();

    await waitFor(() => {
      expect(screen.getByText("Pro checkout is coming soon.")).toBeTruthy();
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/billing/pro-interest",
      expect.objectContaining({
        body: JSON.stringify({
          source: "pricing",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("asks anonymous pricing visitors to sign in before recording Pro interest", async () => {
    setInitializedAnonymousSession();
    window.history.pushState({}, "", "/pricing");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 202 }),
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Choose your plan" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(screen.getByText("Sign in before upgrading to Pro.")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/billing/pro-interest",
      expect.anything(),
    );
  });

  it("does not advertise saved experiments on the pricing page", async () => {
    useAuthStore.setState({
      initialized: true,
      language: "zh-CN",
      session: { kind: "anonymous" },
      challenge: null,
      requestStatus: { kind: "idle" },
      verifyStatus: { kind: "idle" },
      devCode: null,
    });
    window.history.pushState({}, "", "/pricing");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "选择套餐" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/保存|实验库|save|saved|saving|library/i);
  });

  it("hides the save experiment action until saved experiments have a useful retrieval path", async () => {
    useAuthStore.setState({
      initialized: true,
      language: "en",
      session: {
        kind: "authenticated",
        authToken: "token-1",
        user: {
          userId: "user-pro",
          email: "pro@example.com",
          access: {
            tier: "pro",
            defaultStageSlug: "my-stage",
            maxStages: 50,
            maxObjectsPerStage: 10,
            canCreateStages: true,
            defaultRoomSlug: "my-stage",
            maxOwnedObjects: 10,
            canCreateNamedRooms: true,
          },
        },
      },
      challenge: null,
      requestStatus: { kind: "idle" },
      verifyStatus: { kind: "idle" },
      devCode: null,
    });
    useSimulationClient.getState().loadLocalInclinedPlaneDemo();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ simulationId: "simulation-1" }), { status: 201 }),
    );

    render(<App />);

    expect(screen.queryByRole("button", { name: "Save Experiment" })).toBeNull();
    expect(screen.queryByLabelText("Experiment Actions")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets authenticated users choose a nearby built-in experiment when no exact match is found", async () => {
    useAuthStore.setState({
      initialized: true,
      language: "en",
      session: {
        kind: "authenticated",
        authToken: "token-1",
        user: {
          userId: "user-free",
          email: "free@example.com",
          access: {
            tier: "free",
            defaultStageSlug: "my-stage",
            maxStages: 1,
            maxObjectsPerStage: 5,
            canCreateStages: false,
            defaultRoomSlug: "my-stage",
            maxOwnedObjects: 5,
            canCreateNamedRooms: false,
          },
        },
      },
      challenge: null,
      requestStatus: { kind: "idle" },
      verifyStatus: { kind: "idle" },
      devCode: null,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { selectedConcept?: string };

      if (body.selectedConcept === "work_energy") {
        return new Response(
          JSON.stringify({
            plan: {
              concept: "work_energy",
              title: "Work and energy",
              objective: "Observe force and distance.",
              variables: {
                forceN: 25,
                distanceM: 4,
                angleDeg: 0,
                massKg: 2,
              },
              guidingQuestions: ["When does force do work?", "How does work change speed?"],
            },
            measurements: {
              workJ: 100,
              kineticEnergyGainJ: 100,
              finalSpeedMps: 10,
            },
            explanation: "Work changes kinetic energy.",
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          message: "No exact built-in experiment matched. Choose a nearby experiment to continue.",
          suggestions: [
            {
              concept: "inclined_plane",
              title: "Inclined plane and friction",
              reason: "Use this to study force along a slope.",
            },
            {
              concept: "work_energy",
              title: "Work and energy",
              reason: "Use this to study force, distance, and energy.",
            },
          ],
        }),
        { status: 200 },
      );
    });

    render(<App />);

    fireEvent.change(screen.getByLabelText("Physics question"), {
      target: { value: "teach me physics" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Experiment" }));

    expect(await screen.findByText("Closest built-in experiments")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Use Work and energy" }));

    await waitFor(() => {
      expect(screen.getByText("Work and energy")).toBeTruthy();
    });
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "/api/education/simulations/plan",
      expect.objectContaining({
        body: JSON.stringify({
          question: "teach me physics",
          selectedConcept: "work_energy",
          source: "text",
        }),
      }),
    );
  });
});
