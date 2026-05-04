import type { SimulationConcept } from "../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { LessonStepId } from "../lesson-flow";
import { getExperiment3DRoles } from "./renderers";
import type { ExperimentDisplayLayers, ExperimentObjectRole } from "./types";

function isExperimentRole(role: string, availableRoles: ExperimentObjectRole[]): role is ExperimentObjectRole {
  return availableRoles.includes(role as ExperimentObjectRole);
}

export function deriveFocusedRoles(
  concept: SimulationConcept,
  requestedRoles: string[],
): ExperimentObjectRole[] {
  const availableRoles = getExperiment3DRoles(concept);
  const filteredRoles = requestedRoles.filter((role) => isExperimentRole(role, availableRoles));

  if (filteredRoles.length > 0) {
    return Array.from(new Set(filteredRoles));
  }

  if (availableRoles.includes("moving-object")) {
    return ["moving-object"];
  }

  return availableRoles.slice(0, 1);
}

function displayLayerKey(displayLayers: ExperimentDisplayLayers): string {
  return Object.entries(displayLayers)
    .filter(([, enabled]) => enabled)
    .map(([layer]) => layer)
    .sort()
    .join(",");
}

export function createExperimentVisualMetadata(input: {
  activeStep: LessonStepId;
  concept: SimulationConcept;
  displayLayers: ExperimentDisplayLayers;
  requestedRoles: string[];
}) {
  const availableRoles = getExperiment3DRoles(input.concept);
  const focusedRoles = deriveFocusedRoles(input.concept, input.requestedRoles);

  return {
    activeStep: input.activeStep,
    availableRoles,
    concept: input.concept,
    displayLayerKey: displayLayerKey(input.displayLayers),
    focusedRoles,
    focusKey: `${input.concept}:${input.activeStep}:${focusedRoles.join("+")}`,
  };
}
