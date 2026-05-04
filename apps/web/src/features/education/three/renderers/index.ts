import type { SimulationConcept } from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { ExperimentObjectRole } from "../types";
import {
  Buoyancy3D,
  CircularMotion3D,
  CoulombsLaw3D,
  ElasticCollision3D,
  IdealGas3D,
  LensImaging3D,
  LeverBalance3D,
  OhmsLaw3D,
  RcCircuit3D,
  Refraction3D,
  SpringOscillator3D,
  WaveSpeed3D,
  WorkEnergy3D,
} from "./AdditionalExperiment3D";
import { InclinedPlane3D } from "./InclinedPlane3D";
import { Pendulum3D } from "./Pendulum3D";
import { ProjectileMotion3D } from "./ProjectileMotion3D";

const RENDERERS = {
  buoyancy: Buoyancy3D,
  circular_motion: CircularMotion3D,
  coulombs_law: CoulombsLaw3D,
  elastic_collision: ElasticCollision3D,
  ideal_gas: IdealGas3D,
  inclined_plane: InclinedPlane3D,
  lens_imaging: LensImaging3D,
  lever_balance: LeverBalance3D,
  ohms_law: OhmsLaw3D,
  pendulum: Pendulum3D,
  projectile_motion: ProjectileMotion3D,
  rc_circuit: RcCircuit3D,
  refraction: Refraction3D,
  spring_oscillator: SpringOscillator3D,
  wave_speed: WaveSpeed3D,
  work_energy: WorkEnergy3D,
} as const;

const ROLES: Record<SimulationConcept, ExperimentObjectRole[]> = {
  buoyancy: ["moving-object", "surface", "force-vector", "measurement-line"],
  circular_motion: ["moving-object", "path", "force-vector", "measurement-line"],
  coulombs_law: ["moving-object", "target", "field", "force-vector", "measurement-line"],
  elastic_collision: ["moving-object", "target", "path", "measurement-line"],
  ideal_gas: ["moving-object", "field", "surface", "measurement-line"],
  inclined_plane: ["moving-object", "surface", "path", "force-vector", "measurement-line"],
  lens_imaging: ["moving-object", "target", "field", "measurement-line"],
  lever_balance: ["moving-object", "surface", "force-vector", "measurement-line"],
  ohms_law: ["moving-object", "source", "component", "measurement-line"],
  pendulum: ["moving-object", "source", "path", "force-vector", "measurement-line"],
  projectile_motion: ["moving-object", "source", "path", "measurement-line"],
  rc_circuit: ["moving-object", "source", "component", "measurement-line"],
  refraction: ["moving-object", "surface", "field", "measurement-line"],
  spring_oscillator: ["moving-object", "source", "path", "measurement-line"],
  wave_speed: ["moving-object", "path", "field", "measurement-line"],
  work_energy: ["moving-object", "surface", "force-vector", "measurement-line"],
};

export function getExperiment3DRenderer(concept: SimulationConcept) {
  return RENDERERS[concept as keyof typeof RENDERERS] ?? null;
}

export function getExperiment3DRoles(concept: SimulationConcept): ExperimentObjectRole[] {
  return ROLES[concept] ?? [];
}
