import { Html } from "@react-three/drei";

import type {
  ApparatusMotion,
  ApparatusPart,
  ApparatusPrimitive,
  ApparatusTemplate,
} from "../../../../../../../packages/physics-schema/src/apparatus-kit";

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.max(0, Math.min(1, progress));
}

function interpolatePosition(part: ApparatusPart, progress: number): [number, number, number] {
  if (part.motion?.kind !== "path" || !part.motion.path) {
    return part.position;
  }

  const safeProgress = clampProgress(progress);
  const { from, to } = part.motion.path;
  return [
    from[0] + (to[0] - from[0]) * safeProgress,
    from[1] + (to[1] - from[1]) * safeProgress,
    from[2] + (to[2] - from[2]) * safeProgress,
  ];
}

function applyMotionRotation(
  baseRotation: [number, number, number] | undefined,
  motion: ApparatusMotion | undefined,
  progress: number,
): [number, number, number] | undefined {
  const rotation: [number, number, number] = baseRotation ? [...baseRotation] : [0, 0, 0];
  if (motion?.kind !== "revolute" || !motion.axis) {
    return baseRotation;
  }

  const axisIndex = motion.axis === "x" ? 0 : motion.axis === "y" ? 1 : 2;
  rotation[axisIndex] += clampProgress(progress) * Math.PI * 2 * (motion.revolutions ?? 1);
  return rotation;
}

function renderGeometry(primitive: ApparatusPrimitive) {
  switch (primitive.kind) {
    case "box":
      return <boxGeometry args={primitive.size} />;
    case "sphere":
      return <sphereGeometry args={[primitive.radius, primitive.segments ?? 24, primitive.segments ?? 24]} />;
    case "cylinder":
      return (
        <cylinderGeometry
          args={[primitive.radius, primitive.radius, primitive.depth, primitive.segments ?? 24]}
        />
      );
    case "torus":
      return (
        <torusGeometry args={[primitive.radius, primitive.tube, primitive.segments ?? 32, primitive.segments ?? 32]} />
      );
  }
}

function ApparatusPartMesh(props: {
  part: ApparatusPart;
  playbackProgress: number;
}) {
  const { part, playbackProgress } = props;
  return (
    <mesh
      position={interpolatePosition(part, playbackProgress)}
      rotation={applyMotionRotation(part.rotation, part.motion, playbackProgress)}
      userData={{
        apparatusPartId: part.id,
        apparatusRole: part.role,
        apparatusSourceTags: part.sourceTags ?? [],
      }}
    >
      {renderGeometry(part.primitive)}
      <meshStandardMaterial color={part.color} />
    </mesh>
  );
}

export function PhysicsApparatusScene(props: {
  playbackProgress: number;
  showMeasurements: boolean;
  template: ApparatusTemplate;
}) {
  const visibleParts = props.template.parts.filter(
    (part) => props.showMeasurements || part.role !== "measurement-line",
  );

  return (
    <group>
      <Html>
        <div
          data-roles={props.template.parts.map((part) => part.role).join(",")}
          data-template-id={props.template.id}
          data-testid="apparatus-scene"
          style={{ display: "none" }}
        />
      </Html>
      {visibleParts.map((part) => (
        <ApparatusPartMesh key={part.id} part={part} playbackProgress={props.playbackProgress} />
      ))}
    </group>
  );
}
