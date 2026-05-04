import type { SimulationConcept } from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { ExperimentObjectRole } from "../types";
import { InclinedPlane3D } from "./InclinedPlane3D";
import { Pendulum3D } from "./Pendulum3D";
import { ProjectileMotion3D } from "./ProjectileMotion3D";

const RENDERERS = {
  inclined_plane: InclinedPlane3D,
  pendulum: Pendulum3D,
  projectile_motion: ProjectileMotion3D,
} as const;

const ROLES: Record<keyof typeof RENDERERS, ExperimentObjectRole[]> = {
  inclined_plane: ["moving-object", "surface", "path", "force-vector", "measurement-line"],
  pendulum: ["moving-object", "source", "path", "force-vector"],
  projectile_motion: ["moving-object", "source", "path", "measurement-line"],
};

export function getExperiment3DRenderer(concept: SimulationConcept) {
  return RENDERERS[concept as keyof typeof RENDERERS] ?? null;
}

export function getExperiment3DRoles(concept: SimulationConcept): ExperimentObjectRole[] {
  return ROLES[concept as keyof typeof ROLES] ?? [];
}
