import React, { useEffect, useMemo, useRef, useState } from "react";

import type {
  InclinedPlaneVariables,
  ProjectileMotionVariables,
  SpringOscillatorVariables,
} from "../../../../../packages/prompt-contracts/src/simulation-spec";
import { t } from "../../i18n";
import type { Language } from "../../state/auth-store";
import type { PlannedSimulation } from "../../state/simulation-client";
import { createExperimentViewerPlayback, ExperimentPlaybackControls, useExperimentPlayback } from "./experiment-playback";

const GenericTemplateExperiment = React.lazy(() => import("./GenericTemplateExperiment"));
const ThreeCourseLabWorkspace = React.lazy(() => import("./ThreeCourseLabWorkspace"));

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

function GuidingQuestions(props: { language: Language; questions: string[] }) {
  return (
    <div className="experiment-questions">
      <h3 className="group-title">{t(props.language, "guidingQuestions")}</h3>
      <ul>
        {props.questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </div>
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

  return (
    <section aria-label="Generated Experiment" className="panel experiment-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(props.language, "experiment")}</span>
        <h2 className="panel-title">{plan.title}</h2>
        <p className="panel-copy">{plan.objective}</p>
      </div>

      <div className="full-3d-lab-workspace">
        <div aria-label="Experiment Controls" className="experiment-tools-rail" role="region">
          <ExperimentPlaybackControls language={props.language} playback={playback} />
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
          <GuidingQuestions language={props.language} questions={plan.guidingQuestions} />
        </div>
        <React.Suspense fallback={<div className="experiment-3d-fallback">Loading 3D...</div>}>
          <ThreeCourseLabWorkspace
            language={props.language}
            measurements={measurements as Record<string, unknown>}
            planned={props.planned}
            playback={createExperimentViewerPlayback(playback)}
          />
        </React.Suspense>
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

  return (
    <section aria-label="Generated Experiment" className="panel experiment-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(props.language, "experiment")}</span>
        <h2 className="panel-title">{plan.title}</h2>
        <p className="panel-copy">{plan.objective}</p>
      </div>

      <div className="full-3d-lab-workspace">
        <div aria-label="Experiment Controls" className="experiment-tools-rail" role="region">
          <ExperimentPlaybackControls language={props.language} playback={playback} />
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
          <GuidingQuestions language={props.language} questions={plan.guidingQuestions} />
        </div>
        <React.Suspense fallback={<div className="experiment-3d-fallback">Loading 3D...</div>}>
          <ThreeCourseLabWorkspace
            language={props.language}
            measurements={measurements as Record<string, unknown>}
            planned={props.planned}
            playback={createExperimentViewerPlayback(playback)}
          />
        </React.Suspense>
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

      <div className="full-3d-lab-workspace">
        <div aria-label="Experiment Controls" className="experiment-tools-rail" role="region">
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
          <GuidingQuestions language={props.language} questions={plan.guidingQuestions} />
        </div>
        <React.Suspense
          fallback={<div className="experiment-3d-fallback">Loading 3D...</div>}
        >
          <ThreeCourseLabWorkspace
            language={props.language}
            measurements={measurements as Record<string, unknown>}
            planned={props.planned}
            playback={{
              isRunning,
              pause: () => {
                if (isRunning) {
                  togglePlayback();
                }
              },
              play: () => {
                if (!isRunning) {
                  togglePlayback();
                }
              },
              progress,
              progressPercent,
              reset: resetPlayback,
            }}
          />
        </React.Suspense>
      </div>

    </section>
  );
}
