import React, { useEffect, useMemo, useRef, useState } from "react";

import type {
  InclinedPlaneVariables,
  ProjectileMotionVariables,
  SpringOscillatorVariables,
} from "../../../../../packages/prompt-contracts/src/simulation-spec";
import { t } from "../../i18n";
import type { Language } from "../../state/auth-store";
import type { PlannedSimulation } from "../../state/simulation-client";
import { ExperimentPlaybackControls, useExperimentPlayback } from "./experiment-playback";

const GenericTemplateExperiment = React.lazy(() => import("./GenericTemplateExperiment"));

type GenericTemplateConcept = Exclude<
  PlannedSimulation["plan"]["concept"],
  "inclined_plane" | "projectile_motion" | "spring_oscillator"
>;

type InclinedPlaneMeasurements = {
  accelerationMps2: number;
  timeToBottomS: number | null;
  finalSpeedMps: number;
  willSlide: boolean;
};

type ProjectileMotionMeasurements = {
  flightTimeS: number;
  rangeM: number;
  maxHeightM: number;
  finalSpeedMps: number;
  willLand: boolean;
};

type SpringOscillatorMeasurements = {
  periodS: number;
  angularFrequencyRadps: number;
  maxSpeedMps: number;
  energyJ: number;
  willOscillate: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function compactNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function VariableSlider(props: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="experiment-slider" htmlFor={props.id}>
      <span className="data-label">{props.label}</span>
      <input
        aria-label={props.label}
        id={props.id}
        max={props.max}
        min={props.min}
        step={props.step}
        type="range"
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <span className="data-value">{`${props.value}${props.unit}`}</span>
    </label>
  );
}

function ProjectileMotionExperiment(props: {
  language: Language;
  planned: PlannedSimulation & { plan: { concept: "projectile_motion" } };
  onVariablesChange: (variables: Partial<ProjectileMotionVariables>) => void;
}) {
  const { plan, measurements } = props.planned;
  const projectileMeasurements = measurements as ProjectileMotionMeasurements;
  const variables = plan.variables;
  const playback = useExperimentPlayback(Math.max(900, Math.min(5000, projectileMeasurements.flightTimeS * 1000)), [
    variables.gravityMps2,
    variables.launchAngleDeg,
    variables.launchHeightM,
    variables.launchSpeedMps,
  ]);
  const angleRad = (variables.launchAngleDeg * Math.PI) / 180;
  const rangeWidth = clamp(86 + projectileMeasurements.rangeM * 2.2, 90, 238);
  const launchY = 140 - clamp(variables.launchHeightM * 2.4, 0, 42);
  const gravityLift = clamp((9.81 - variables.gravityMps2) * 1.8, -20, 24);
  const arcHeight = clamp(
    24 + variables.launchSpeedMps * Math.sin(angleRad) * 2.1 + variables.launchHeightM * 1.4 + gravityLift,
    18,
    112,
  );
  const landingX = 46 + rangeWidth;
  const controlX = 46 + rangeWidth / 2;
  const controlY = launchY - arcHeight;
  const motionX = (1 - playback.progress) ** 2 * 46 + 2 * (1 - playback.progress) * playback.progress * controlX + playback.progress ** 2 * landingX;
  const motionY = (1 - playback.progress) ** 2 * launchY + 2 * (1 - playback.progress) * playback.progress * controlY + playback.progress ** 2 * 140;
  const projectilePath = `M 46 ${compactNumber(launchY)} Q ${compactNumber(controlX)} ${compactNumber(controlY)} ${compactNumber(landingX)} 140`;
  const motionSignature = [
    "projectile",
    compactNumber(variables.launchAngleDeg),
    compactNumber(variables.launchSpeedMps),
    compactNumber(variables.launchHeightM),
    compactNumber(variables.gravityMps2),
    compactNumber(rangeWidth),
    compactNumber(arcHeight),
    compactNumber(launchY),
  ].join(":");

  return (
    <section aria-label="Generated Experiment" className="panel experiment-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(props.language, "experiment")}</span>
        <h2 className="panel-title">{plan.title}</h2>
        <p className="panel-copy">{plan.objective}</p>
      </div>

      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={plan.title}>
        <path
          d={projectilePath}
          fill="none"
          stroke="#7c88ff"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <circle
          cx={motionX}
          cy={motionY}
          data-motion-signature={motionSignature}
          data-progress={String(playback.progressPercent)}
          data-running={String(playback.isRunning)}
          data-testid="experiment-motion-marker"
          r="10"
          fill="#5fc7ff"
        />
        <circle cx={landingX} cy="140" r="10" fill="#9ef0b8" />
        <line x1="35" x2="290" y1="150" y2="150" stroke="#344054" strokeWidth="2" />
      </svg>

      <ExperimentPlaybackControls language={props.language} playback={playback} />

      <div className="experiment-grid">
        <div className="experiment-controls">
          <VariableSlider
            id="launch-angle"
            label={t(props.language, "launchAngle")}
            max={85}
            min={5}
            step={1}
            unit="°"
            value={variables.launchAngleDeg}
            onChange={(launchAngleDeg) => props.onVariablesChange({ launchAngleDeg })}
          />
          <VariableSlider
            id="launch-speed"
            label={t(props.language, "launchSpeed")}
            max={60}
            min={1}
            step={1}
            unit="m/s"
            value={variables.launchSpeedMps}
            onChange={(launchSpeedMps) => props.onVariablesChange({ launchSpeedMps })}
          />
          <VariableSlider
            id="launch-height"
            label={t(props.language, "launchHeight")}
            max={20}
            min={0}
            step={0.5}
            unit="m"
            value={variables.launchHeightM}
            onChange={(launchHeightM) => props.onVariablesChange({ launchHeightM })}
          />
          <VariableSlider
            id="gravity"
            label={t(props.language, "gravity")}
            max={20}
            min={1}
            step={0.01}
            unit="m/s²"
            value={variables.gravityMps2}
            onChange={(gravityMps2) => props.onVariablesChange({ gravityMps2 })}
          />
        </div>

        <div className="experiment-results">
          <p className="data-value">{t(props.language, "range", { value: projectileMeasurements.rangeM })}</p>
          <p className="data-value">{t(props.language, "flightTime", { value: projectileMeasurements.flightTimeS })}</p>
          <p className="data-value">{t(props.language, "maxHeight", { value: projectileMeasurements.maxHeightM })}</p>
          <p className="data-value">{t(props.language, "finalSpeed", { value: projectileMeasurements.finalSpeedMps })}</p>
          <p className="panel-copy">{props.planned.explanation}</p>
        </div>
      </div>

      <div className="experiment-questions">
        <h3 className="group-title">{t(props.language, "guidingQuestions")}</h3>
        <ul>
          {plan.guidingQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SpringOscillatorExperiment(props: {
  language: Language;
  planned: PlannedSimulation & { plan: { concept: "spring_oscillator" } };
  onVariablesChange: (variables: Partial<SpringOscillatorVariables>) => void;
}) {
  const { plan, measurements } = props.planned;
  const springMeasurements = measurements as SpringOscillatorMeasurements;
  const variables = plan.variables;
  const playback = useExperimentPlayback(Math.max(900, Math.min(4000, springMeasurements.periodS * 1000)), [
    variables.amplitudeM,
    variables.dampingRatio,
    variables.massKg,
    variables.springConstantNpm,
  ]);
  const amplitudePx = clamp(8 + variables.amplitudeM * 7, 10, 46);
  const dampingScale = clamp(1 - variables.dampingRatio * playback.progress, 0.25, 1);
  const massX = 215 + amplitudePx * dampingScale * Math.cos(playback.progress * Math.PI * 2);
  const springEndX = clamp(massX, 180, 260);
  const springPath = `M 35 90 C 55 65 75 115 95 90 S 135 65 155 90 S ${compactNumber(springEndX - 20)} 115 ${compactNumber(springEndX)} 90`;
  const motionSignature = [
    "spring",
    compactNumber(variables.massKg),
    compactNumber(variables.springConstantNpm),
    compactNumber(variables.amplitudeM),
    compactNumber(variables.dampingRatio),
    compactNumber(amplitudePx),
  ].join(":");

  return (
    <section aria-label="Generated Experiment" className="panel experiment-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(props.language, "experiment")}</span>
        <h2 className="panel-title">{plan.title}</h2>
        <p className="panel-copy">{plan.objective}</p>
      </div>

      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={plan.title}>
        <line x1="35" x2="35" y1="55" y2="125" stroke="#344054" strokeWidth="8" />
        <path
          d={springPath}
          fill="none"
          stroke="#7c88ff"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <rect
          x={massX}
          y="65"
          width="54"
          height="50"
          rx="6"
          fill="#5fc7ff"
          data-motion-signature={motionSignature}
          data-progress={String(playback.progressPercent)}
          data-running={String(playback.isRunning)}
          data-testid="experiment-motion-marker"
        />
        <line x1="30" x2="290" y1="130" y2="130" stroke="#344054" strokeWidth="2" />
      </svg>

      <ExperimentPlaybackControls language={props.language} playback={playback} />

      <div className="experiment-grid">
        <div className="experiment-controls">
          <VariableSlider
            id="spring-mass"
            label={t(props.language, "mass")}
            max={20}
            min={0.1}
            step={0.1}
            unit="kg"
            value={variables.massKg}
            onChange={(massKg) => props.onVariablesChange({ massKg })}
          />
          <VariableSlider
            id="spring-constant"
            label={t(props.language, "springConstant")}
            max={500}
            min={1}
            step={1}
            unit="N/m"
            value={variables.springConstantNpm}
            onChange={(springConstantNpm) => props.onVariablesChange({ springConstantNpm })}
          />
          <VariableSlider
            id="amplitude"
            label={t(props.language, "amplitude")}
            max={5}
            min={0.05}
            step={0.05}
            unit="m"
            value={variables.amplitudeM}
            onChange={(amplitudeM) => props.onVariablesChange({ amplitudeM })}
          />
          <VariableSlider
            id="damping"
            label={t(props.language, "damping")}
            max={1}
            min={0}
            step={0.01}
            unit=""
            value={variables.dampingRatio}
            onChange={(dampingRatio) => props.onVariablesChange({ dampingRatio })}
          />
        </div>

        <div className="experiment-results">
          <p className="data-value">{t(props.language, "period", { value: springMeasurements.periodS })}</p>
          <p className="data-value">{t(props.language, "angularFrequency", { value: springMeasurements.angularFrequencyRadps })}</p>
          <p className="data-value">{t(props.language, "maxSpeed", { value: springMeasurements.maxSpeedMps })}</p>
          <p className="data-value">{t(props.language, "energy", { value: springMeasurements.energyJ })}</p>
          <p className="panel-copy">{props.planned.explanation}</p>
        </div>
      </div>

      <div className="experiment-questions">
        <h3 className="group-title">{t(props.language, "guidingQuestions")}</h3>
        <ul>
          {plan.guidingQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function InclinedPlaneExperiment(props: {
  language: Language;
  planned: PlannedSimulation;
  onVariablesChange: (
    variables:
      | Partial<InclinedPlaneVariables>
      | Partial<ProjectileMotionVariables>
      | Partial<SpringOscillatorVariables>
      | Record<string, number>,
  ) => void;
}) {
  const { plan, measurements } = props.planned;

  if (plan.concept === "projectile_motion") {
    return (
      <ProjectileMotionExperiment
        language={props.language}
        planned={props.planned as PlannedSimulation & { plan: { concept: "projectile_motion" } }}
        onVariablesChange={props.onVariablesChange}
      />
    );
  }

  if (plan.concept === "spring_oscillator") {
    return (
      <SpringOscillatorExperiment
        language={props.language}
        planned={props.planned as PlannedSimulation & { plan: { concept: "spring_oscillator" } }}
        onVariablesChange={props.onVariablesChange}
      />
    );
  }

  if (
    plan.concept === "pendulum" ||
    plan.concept === "circular_motion" ||
    plan.concept === "elastic_collision" ||
    plan.concept === "buoyancy" ||
    plan.concept === "lever_balance" ||
    plan.concept === "ohms_law" ||
    plan.concept === "ideal_gas" ||
    plan.concept === "work_energy" ||
    plan.concept === "wave_speed" ||
    plan.concept === "refraction" ||
    plan.concept === "lens_imaging" ||
    plan.concept === "coulombs_law" ||
    plan.concept === "rc_circuit"
  ) {
    return (
      <React.Suspense
        fallback={
          <section aria-label="Generated Experiment" className="panel experiment-panel">
            <p className="panel-copy">Loading experiment...</p>
          </section>
        }
      >
        <GenericTemplateExperiment
          language={props.language}
          planned={props.planned as PlannedSimulation & { plan: { concept: GenericTemplateConcept } }}
          onVariablesChange={(variables) => props.onVariablesChange(variables)}
        />
      </React.Suspense>
    );
  }

  const variables = plan.variables;
  const inclinedMeasurements = measurements as InclinedPlaneMeasurements;
  const rampStart = { x: 40, y: 140 };
  const rampEnd = { x: 280, y: 110 - variables.angleDeg };
  const rampStrokeWidth = 8;
  const ballRadius = 14;
  const ballClearance = ballRadius + rampStrokeWidth / 2;
  const rampDx = rampEnd.x - rampStart.x;
  const rampDy = rampEnd.y - rampStart.y;
  const rampLength = Math.hypot(rampDx, rampDy);
  const surfaceNormal = {
    x: rampDy / rampLength,
    y: -rampDx / rampLength,
  };
  const ballPathStart = 0.88;
  const ballPathEnd = 0.15;
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const durationMs = useMemo(() => {
    if (!inclinedMeasurements.timeToBottomS) {
      return 1200;
    }

    return Math.max(700, Math.min(5000, inclinedMeasurements.timeToBottomS * 1000));
  }, [inclinedMeasurements.timeToBottomS]);
  const ballRampProgress = ballPathStart + (ballPathEnd - ballPathStart) * progress;
  const ballSurfacePoint = {
    x: rampStart.x + rampDx * ballRampProgress,
    y: rampStart.y + rampDy * ballRampProgress,
  };
  const ballX = ballSurfacePoint.x + surfaceNormal.x * ballClearance;
  const ballY = ballSurfacePoint.y + surfaceNormal.y * ballClearance;
  const progressPercent = Math.round(progress * 100);

  useEffect(() => {
    setIsRunning(false);
    progressRef.current = 0;
    setProgress(0);
  }, [
    variables.angleDeg,
    variables.frictionCoefficient,
    variables.lengthM,
    variables.massKg,
  ]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const startTime = performance.now() - progressRef.current * durationMs;

    function tick(now: number) {
      const nextProgress = Math.min(1, (now - startTime) / durationMs);
      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        setIsRunning(false);
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [durationMs, isRunning]);

  function togglePlayback() {
    if (!inclinedMeasurements.willSlide) {
      return;
    }

    if (progress >= 1) {
      progressRef.current = 0;
      setProgress(0);
    }

    setIsRunning((value) => !value);
  }

  function resetPlayback() {
    setIsRunning(false);
    progressRef.current = 0;
    setProgress(0);
  }

  return (
    <section aria-label="Generated Experiment" className="panel experiment-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(props.language, "experiment")}</span>
        <h2 className="panel-title">{plan.title}</h2>
        <p className="panel-copy">{plan.objective}</p>
      </div>

      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={plan.title}>
        <line
          x1={rampStart.x}
          x2={rampEnd.x}
          y1={rampStart.y}
          y2={rampEnd.y}
          stroke="#7c88ff"
          strokeLinecap="round"
          strokeWidth={rampStrokeWidth}
        />
        <circle
          cx={ballX}
          cy={ballY}
          data-progress={String(progressPercent)}
          data-running={String(isRunning)}
          data-testid="rolling-ball"
          r={ballRadius}
          fill="#5fc7ff"
        />
        <line x1="40" x2="285" y1="148" y2="148" stroke="#344054" strokeWidth="2" />
      </svg>

      <div className="button-cluster experiment-playback">
        <button
          className="tool-button tool-button--primary"
          disabled={!inclinedMeasurements.willSlide}
          type="button"
          onClick={togglePlayback}
        >
          {isRunning
            ? t(props.language, "pauseExperiment")
            : t(props.language, "playExperiment")}
        </button>
        <button className="tool-button" type="button" onClick={resetPlayback}>
          {t(props.language, "resetExperiment")}
        </button>
        <span className="status-inline__meta">
          {t(props.language, "experimentProgress", { value: progressPercent })}
        </span>
      </div>

      <div className="experiment-grid">
        <div className="experiment-controls">
          <VariableSlider
            id="angle"
            label={t(props.language, "angle")}
            max={60}
            min={5}
            step={1}
            unit="°"
            value={variables.angleDeg}
            onChange={(angleDeg) => props.onVariablesChange({ angleDeg })}
          />
          <VariableSlider
            id="friction"
            label={t(props.language, "friction")}
            max={0.8}
            min={0}
            step={0.01}
            unit=""
            value={variables.frictionCoefficient}
            onChange={(frictionCoefficient) => props.onVariablesChange({ frictionCoefficient })}
          />
          <VariableSlider
            id="length"
            label={t(props.language, "length")}
            max={20}
            min={1}
            step={0.5}
            unit="m"
            value={variables.lengthM}
            onChange={(lengthM) => props.onVariablesChange({ lengthM })}
          />
          <VariableSlider
            id="mass"
            label={t(props.language, "mass")}
            max={20}
            min={0.1}
            step={0.1}
            unit="kg"
            value={variables.massKg}
            onChange={(massKg) => props.onVariablesChange({ massKg })}
          />
        </div>

        <div className="experiment-results">
          <p className="data-value">
            {t(props.language, "acceleration", { value: inclinedMeasurements.accelerationMps2 })}
          </p>
          <p className="data-value">
            {inclinedMeasurements.timeToBottomS === null
              ? t(props.language, "willNotSlide")
              : t(props.language, "timeToBottom", { value: inclinedMeasurements.timeToBottomS })}
          </p>
          <p className="data-value">
            {t(props.language, "finalSpeed", { value: inclinedMeasurements.finalSpeedMps })}
          </p>
          <p className="panel-copy">{props.planned.explanation}</p>
        </div>
      </div>

      <div className="experiment-questions">
        <h3 className="group-title">{t(props.language, "guidingQuestions")}</h3>
        <ul>
          {plan.guidingQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
