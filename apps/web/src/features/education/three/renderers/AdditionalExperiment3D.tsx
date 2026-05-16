import type {
  BuoyancyPlan,
  CircularMotionPlan,
  CoulombsLawPlan,
  ElasticCollisionPlan,
  IdealGasPlan,
  LensImagingPlan,
  LeverBalancePlan,
  OhmsLawPlan,
  RcCircuitPlan,
  RefractionPlan,
  SpringOscillatorPlan,
  WaveSpeedPlan,
  WorkEnergyPlan,
} from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import { getApparatusTemplate } from "../../../../../../../packages/physics-schema/src/apparatus-kit";
import { PhysicsApparatusScene } from "../apparatus/PhysicsApparatusScene";
import type { Experiment3DRendererProps } from "../types";

function shouldShowMeasurementLine(props: Experiment3DRendererProps): boolean {
  return (
    props.viewerState.displayLayers.measurements &&
    props.viewerState.focusedRoles.includes("measurement-line")
  );
}

function MeasurementBar(props: {
  color?: string;
  length: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const color = props.color ?? "#8fa3b8";

  return (
    <mesh position={props.position} rotation={props.rotation}>
      <boxGeometry args={[props.length, 0.025, 0.025]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}

function ForceArrow(props: {
  color?: string;
  length: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const color = props.color ?? "#ff7a90";

  return (
    <group position={props.position} rotation={props.rotation}>
      <mesh position={[props.length / 2, 0, 0]}>
        <boxGeometry args={[props.length, 0.035, 0.035]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[props.length + 0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function ArticraftSkateboardWheelAssembly(props: {
  position: [number, number, number];
  progress: number;
  rotation: [number, number, number];
  scale: number;
}) {
  const wheelSpin = props.progress * Math.PI * 2 * 3;
  const truckXs = [-0.36, 0.36] as const;
  const wheelYs = [-0.28, 0.28] as const;

  return (
    <group
      position={props.position}
      rotation={props.rotation}
      scale={[props.scale, props.scale, props.scale]}
      userData={{
        articraftRecordId: "rec_skateboard_b74cde82df474176b7005c584ba8eb13",
        source: "articraft-skateboard-structure",
      }}
    >
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.92, 0.08, 0.28]} />
        <meshStandardMaterial color="#5fc7ff" emissive="#0ea5e9" emissiveIntensity={0.18} />
      </mesh>
      {truckXs.map((truckX) => (
        <group key={`truck-${truckX}`} position={[truckX, 0.05, 0]}>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.66, 18]} />
            <meshStandardMaterial color="#98a2b3" metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.18, 0.08, 0.08]} />
            <meshStandardMaterial color="#667085" />
          </mesh>
          {wheelYs.map((wheelY) => (
            <mesh key={`wheel-${truckX}-${wheelY}`} position={[0, 0, wheelY]} rotation={[wheelSpin, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.08, 32]} />
              <meshStandardMaterial color="#101828" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function SpringOscillator3D(props: Experiment3DRendererProps<SpringOscillatorPlan>) {
  const amplitude = Math.min(1.3, props.plan.variables.amplitudeM / 2);
  const damping = 1 - props.plan.variables.dampingRatio * 0.55;
  const x = Math.cos(props.playback.progress * Math.PI * 2) * amplitude * damping;
  const apparatusProgress = amplitude > 0 ? (x / Math.max(0.1, amplitude) + 1) / 2 : 0.5;

  return (
    <group>
      <PhysicsApparatusScene
        playbackProgress={apparatusProgress}
        showMeasurements={shouldShowMeasurementLine(props)}
        template={getApparatusTemplate("spring-cart-rig")}
      />
      <mesh position={[x - 0.8, 0.32, 0]}>
        <torusGeometry args={[0.26, 0.025, 8, 12]} />
        <meshStandardMaterial color="#b5bcc8" />
      </mesh>
      <mesh position={[x - 0.25, 0.32, 0]}>
        <torusGeometry args={[0.26, 0.025, 8, 12]} />
        <meshStandardMaterial color="#b5bcc8" />
      </mesh>
      <mesh position={[x + 0.3, 0.32, 0]}>
        <torusGeometry args={[0.26, 0.025, 8, 12]} />
        <meshStandardMaterial color="#b5bcc8" />
      </mesh>
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={Math.max(0.4, amplitude * 1.8)} position={[0.8, 0.9, -0.45]} />
      ) : null}
    </group>
  );
}

export function CircularMotion3D(props: Experiment3DRendererProps<CircularMotionPlan>) {
  const radius = Math.min(1.55, Math.max(0.45, props.plan.variables.radiusM / 6));
  const theta = props.playback.progress * Math.PI * 2;
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;

  return (
    <group>
      <group rotation={[0, -theta, 0]} scale={[radius / 1.2, radius / 1.2, radius / 1.2]}>
        <PhysicsApparatusScene
          playbackProgress={props.playback.progress}
          showMeasurements={shouldShowMeasurementLine(props)}
          template={getApparatusTemplate("circular-wheel-rig")}
        />
      </group>
      <ArticraftSkateboardWheelAssembly
        position={[x, 0.55, z]}
        progress={props.playback.progress}
        rotation={[0, -theta + Math.PI / 2, 0]}
        scale={Math.max(0.8, radius / 1.2)}
      />
      {props.viewerState.displayLayers.forces ? (
        <ForceArrow length={0.75} position={[x, 0.18, z]} rotation={[0, -theta + Math.PI, 0]} />
      ) : null}
    </group>
  );
}

export function ElasticCollision3D(props: Experiment3DRendererProps<ElasticCollisionPlan>) {
  const p = props.playback.progress;
  const massRatio = props.plan.variables.mass2Kg / Math.max(0.1, props.plan.variables.mass1Kg);
  const leftX = -1.8 + Math.min(p, 0.55) * 2.3 - Math.max(0, p - 0.55) * 0.8;
  const rightX = 1.25 + Math.max(0, p - 0.45) * (1.3 / Math.max(0.6, massRatio));

  return (
    <group>
      <MeasurementBar color="#344054" length={4.2} position={[0, -0.38, 0]} />
      <mesh position={[leftX, 0.03, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#5fc7ff" />
      </mesh>
      <mesh position={[rightX, 0.03, 0]}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#9ef0b8" />
      </mesh>
      {props.viewerState.displayLayers.trails ? (
        <MeasurementBar color="#7c88ff" length={Math.max(0.3, p * 2.1)} position={[-1, 0.36, 0]} />
      ) : null}
    </group>
  );
}

export function Buoyancy3D(props: Experiment3DRendererProps<BuoyancyPlan>) {
  const volumeScale = Math.min(0.8, Math.max(0.28, props.plan.variables.objectVolumeL / 300));
  const densityRatio =
    props.plan.variables.objectMassKg / Math.max(0.1, props.plan.variables.objectVolumeL / 1000) /
    props.plan.variables.fluidDensityKgM3;
  const y = densityRatio > 1 ? -0.35 : 0.15;

  return (
    <group>
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[3.2, 1.35, 1.2]} />
        <meshStandardMaterial color="#244e69" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[3.25, 0.025, 1.25]} />
        <meshStandardMaterial color="#5fc7ff" emissive="#5fc7ff" emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[volumeScale, volumeScale, volumeScale]} />
        <meshStandardMaterial color="#f4d35e" />
      </mesh>
      {props.viewerState.displayLayers.forces ? (
        <ForceArrow length={0.72} position={[0, y + 0.45, 0]} rotation={[0, 0, Math.PI / 2]} />
      ) : null}
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={1.35} position={[1.85, -0.35, 0]} rotation={[0, 0, Math.PI / 2]} />
      ) : null}
    </group>
  );
}

export function LeverBalance3D(props: Experiment3DRendererProps<LeverBalancePlan>) {
  const torqueDelta =
    props.plan.variables.rightMassKg * props.plan.variables.rightArmM -
    props.plan.variables.leftMassKg * props.plan.variables.leftArmM;
  const tilt = Math.max(-0.35, Math.min(0.35, torqueDelta / 140));

  return (
    <group>
      <group rotation={[0, 0, -tilt]}>
        <PhysicsApparatusScene
          playbackProgress={Math.min(1, Math.max(0, 0.5 + tilt))}
          showMeasurements={shouldShowMeasurementLine(props)}
          template={getApparatusTemplate("lever-balance-rig")}
        />
      </group>
    </group>
  );
}

export function OhmsLaw3D(props: Experiment3DRendererProps<OhmsLawPlan>) {
  const current = props.plan.variables.voltageV / props.plan.variables.resistanceOhm;
  const glow = Math.min(0.8, Math.max(0.12, current * 3));

  return (
    <group>
      <mesh position={[-1.5, 0, 0]}>
        <boxGeometry args={[0.55, 0.9, 0.35]} />
        <meshStandardMaterial color="#5fc7ff" emissive="#1f95ff" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.15, 0.36, 0.32]} />
        <meshStandardMaterial color="#f4d35e" emissive="#f4d35e" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <torusGeometry args={[1.55, 0.025, 8, 64]} />
        <meshStandardMaterial color="#b5bcc8" />
      </mesh>
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={Math.min(2.4, 0.5 + current * 10)} position={[0, -0.65, 0]} />
      ) : null}
    </group>
  );
}

export function IdealGas3D(props: Experiment3DRendererProps<IdealGasPlan>) {
  const volume = Math.min(2.8, Math.max(1.1, props.plan.variables.volumeL / 160));
  const heat = Math.min(1, Math.max(0.15, (props.plan.variables.temperatureK - 100) / 900));
  const offset = Math.sin(props.playback.progress * Math.PI * 2) * heat * 0.25;

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[volume, volume * 0.72, volume * 0.72]} />
        <meshStandardMaterial color="#344054" transparent opacity={0.26} />
      </mesh>
      {[-0.45, 0.05, 0.45].map((x, index) => (
        <mesh key={x} position={[x + offset * (index + 1), 0.12 * index - 0.15, 0.18 * index]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={index === 1 ? "#9ef0b8" : "#5fc7ff"} />
        </mesh>
      ))}
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={volume} position={[0, -0.78, 0]} />
      ) : null}
    </group>
  );
}

export function WorkEnergy3D(props: Experiment3DRendererProps<WorkEnergyPlan>) {
  const angle = (props.plan.variables.angleDeg * Math.PI) / 180;
  const x = -1.6 + props.playback.progress * 3.2;

  return (
    <group>
      <MeasurementBar color="#344054" length={4.1} position={[0, -0.42, 0]} />
      <mesh position={[x, 0, 0]}>
        <boxGeometry args={[0.62, 0.45, 0.45]} />
        <meshStandardMaterial color="#5fc7ff" />
      </mesh>
      {props.viewerState.displayLayers.forces ? (
        <ForceArrow length={1.05} position={[x + 0.25, 0.42, 0]} rotation={[0, 0, angle]} />
      ) : null}
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={3.2} position={[0, -0.72, 0]} />
      ) : null}
    </group>
  );
}

export function WaveSpeed3D(props: Experiment3DRendererProps<WaveSpeedPlan>) {
  const wavelength = Math.min(1.6, Math.max(0.45, props.plan.variables.wavelengthM / 3));
  const phase = props.playback.progress * Math.PI * 2;

  return (
    <group>
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => (
        <mesh key={x} position={[x, Math.sin(x / wavelength + phase) * 0.45, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#5fc7ff" />
        </mesh>
      ))}
      {props.viewerState.displayLayers.trails ? (
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[1.55, 0.012, 8, 64]} />
          <meshStandardMaterial color="#7c88ff" emissive="#1f2aff" emissiveIntensity={0.2} />
        </mesh>
      ) : null}
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={wavelength} position={[0, -0.8, 0]} />
      ) : null}
    </group>
  );
}

export function Refraction3D(props: Experiment3DRendererProps<RefractionPlan>) {
  const incident = (props.plan.variables.incidentAngleDeg * Math.PI) / 180;
  const refracted = Math.asin(
    Math.min(0.98, (props.plan.variables.refractiveIndex1 / props.plan.variables.refractiveIndex2) * Math.sin(incident)),
  );

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.5, 0.04, 1.4]} />
        <meshStandardMaterial color="#5fc7ff" transparent opacity={0.5} />
      </mesh>
      <MeasurementBar color="#7c88ff" length={1.7} position={[-0.6, 0.65, 0]} rotation={[0, 0, -incident]} />
      <MeasurementBar color="#9ef0b8" length={1.7} position={[0.55, -0.55, 0]} rotation={[0, 0, refracted]} />
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={1.2} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
      ) : null}
    </group>
  );
}

export function LensImaging3D(props: Experiment3DRendererProps<LensImagingPlan>) {
  const focal = Math.min(1.2, Math.max(0.35, props.plan.variables.focalLengthCm / 80));
  const imageDistance =
    (props.plan.variables.focalLengthCm * props.plan.variables.objectDistanceCm) /
    Math.max(1, props.plan.variables.objectDistanceCm - props.plan.variables.focalLengthCm);
  const imageX = Math.min(1.8, Math.max(0.55, imageDistance / 120));

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial color="#5fc7ff" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[0.25, 1.7, 0.25]}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#5fc7ff" transparent opacity={0.45} />
      </mesh>
      <ForceArrow color="#7c88ff" length={0.95} position={[-1.45, -0.45, 0]} rotation={[0, 0, Math.PI / 2]} />
      <ForceArrow color="#9ef0b8" length={0.65} position={[imageX, 0.35, 0]} rotation={[0, 0, -Math.PI / 2]} />
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={focal * 2} position={[0, -0.9, 0]} />
      ) : null}
    </group>
  );
}

export function CoulombsLaw3D(props: Experiment3DRendererProps<CoulombsLawPlan>) {
  const distance = Math.min(2.2, Math.max(0.65, props.plan.variables.distanceM / 12));
  const attractive = props.plan.variables.charge1MicroC * props.plan.variables.charge2MicroC < 0;

  return (
    <group>
      <mesh position={[-distance / 2, 0, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color={props.plan.variables.charge1MicroC >= 0 ? "#ff7a90" : "#5fc7ff"} />
      </mesh>
      <mesh position={[distance / 2, 0, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color={props.plan.variables.charge2MicroC >= 0 ? "#ff7a90" : "#5fc7ff"} />
      </mesh>
      {props.viewerState.displayLayers.forces ? (
        <>
          <ForceArrow length={0.55} position={[-distance / 2, 0.38, 0]} rotation={[0, 0, attractive ? 0 : Math.PI]} />
          <ForceArrow length={0.55} position={[distance / 2, -0.38, 0]} rotation={[0, 0, attractive ? Math.PI : 0]} />
        </>
      ) : null}
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={distance} position={[0, -0.75, 0]} />
      ) : null}
    </group>
  );
}

export function RcCircuit3D(props: Experiment3DRendererProps<RcCircuitPlan>) {
  const tauMs = (props.plan.variables.resistanceOhm * props.plan.variables.capacitanceMicroF) / 1000;
  const charge = 1 - Math.exp(-props.plan.variables.timeMs / Math.max(1, tauMs));

  return (
    <group>
      <mesh position={[-1.45, 0, 0]}>
        <boxGeometry args={[0.55, 0.9, 0.34]} />
        <meshStandardMaterial color="#5fc7ff" emissive="#1f95ff" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0.1, 0.55, 0]}>
        <boxGeometry args={[2.2, 0.035, 0.035]} />
        <meshStandardMaterial color="#b5bcc8" />
      </mesh>
      <mesh position={[0.1, -0.55, 0]}>
        <boxGeometry args={[2.2, 0.035, 0.035]} />
        <meshStandardMaterial color="#b5bcc8" />
      </mesh>
      <mesh position={[0.9, 0, 0]}>
        <boxGeometry args={[0.08, 0.8, 0.28]} />
        <meshStandardMaterial color="#f4d35e" emissive="#f4d35e" emissiveIntensity={charge * 0.6} />
      </mesh>
      <mesh position={[1.12, 0, 0]}>
        <boxGeometry args={[0.08, 0.8, 0.28]} />
        <meshStandardMaterial color="#f4d35e" emissive="#f4d35e" emissiveIntensity={charge * 0.6} />
      </mesh>
      {shouldShowMeasurementLine(props) ? (
        <MeasurementBar length={Math.max(0.25, charge * 1.5)} position={[0.1, -0.9, 0]} />
      ) : null}
    </group>
  );
}
