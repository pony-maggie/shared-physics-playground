import type { ExperimentObjectRole, ExperimentViewerState } from "../types";

export interface ArticraftStyleOverlayMetadata {
  debugJointOverlay: "hidden" | "measurement";
  debugPartColors: "semantic";
  highlightedRoles: ExperimentObjectRole[];
  roleColorKey: string;
}

export function createArticraftStyleOverlayMetadata(input: {
  availableRoles: ExperimentObjectRole[];
  displayLayers: ExperimentViewerState["displayLayers"];
  focusedRoles: ExperimentObjectRole[];
}): ArticraftStyleOverlayMetadata {
  const focusedRoleSet = new Set(input.focusedRoles);

  return {
    debugJointOverlay: input.displayLayers.measurements ? "measurement" : "hidden",
    debugPartColors: "semantic",
    highlightedRoles: input.focusedRoles,
    roleColorKey: input.availableRoles
      .map((role) => `${role}:${focusedRoleSet.has(role) ? "active" : "available"}`)
      .join(","),
  };
}
