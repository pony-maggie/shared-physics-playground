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
}) {
  return (
    <aside aria-label="Lesson Flow" className="lesson-rail">
      <span className="panel-kicker">
        {props.language === "zh-CN" ? "课程步骤" : "Lesson Steps"}
      </span>
      <div className="lesson-rail__steps">
        {props.flow.steps.map((step) => (
          <section
            className={`lesson-rail__step${step.id === props.activeStep ? " lesson-rail__step--active" : ""}`}
            key={step.id}
          >
            <h3 className="group-title">{step.title}</h3>
            <p className="panel-copy">{step.prompt}</p>
            {step.measurementKeys ? (
              <dl className="lesson-rail__measurements">
                {step.measurementKeys.map((key) => (
                  <div key={key}>
                    <dt className="data-label">{key}</dt>
                    <dd className="data-value">{formatMeasurement(props.measurements[key])}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        ))}
      </div>
    </aside>
  );
}
