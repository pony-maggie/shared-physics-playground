import type { Language } from "../../state/auth-store";
import type { LessonFlow, LessonStepId } from "./lesson-flow";

function formatMeasurement(value: unknown): string {
  if (typeof value === "number") {
    return String(Math.round(value * 100) / 100);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string") {
    return value;
  }
  return "—";
}

export function LessonRail(props: {
  activeStep: LessonStepId;
  flow: LessonFlow;
  language: Language;
  measurements: Record<string, unknown>;
  onStepChange: (stepId: LessonStepId, focusRoles: string[]) => void;
  onVariation: (variables: Record<string, number>) => void;
}) {
  const active = props.flow.steps.find((step) => step.id === props.activeStep) ?? props.flow.steps[0];

  return (
    <aside aria-label="Lesson Flow" className="lesson-rail">
      <div className="lesson-rail__steps">
        {props.flow.steps.map((step) => (
          <button
            className={`lesson-rail__step${step.id === active.id ? " lesson-rail__step--active" : ""}`}
            key={step.id}
            type="button"
            onClick={() => props.onStepChange(step.id, step.focusRoles)}
          >
            {step.title}
          </button>
        ))}
      </div>
      <div className="lesson-rail__body">
        <span className="panel-kicker">
          {props.language === "zh-CN" ? "课程步骤" : "Lesson Step"}
        </span>
        <h3 className="group-title">{active.title}</h3>
        <p className="panel-copy">{active.prompt}</p>
        {active.measurementKeys ? (
          <dl className="lesson-rail__measurements">
            {active.measurementKeys.map((key) => (
              <div key={key}>
                <dt className="data-label">{key}</dt>
                <dd className="data-value">{formatMeasurement(props.measurements[key])}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {active.variation ? (
          <button
            className="tool-button tool-button--primary"
            type="button"
            onClick={() => props.onVariation(active.variation?.variables ?? {})}
          >
            {active.variation.label}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
