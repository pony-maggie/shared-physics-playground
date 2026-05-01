import { useState } from "react";

import type { AuthSession, Language } from "../../state/auth-store";
import { t } from "../../i18n";

export type ProInterestStatus = "idle" | "submitting" | "recorded" | "login-required" | "error";

function PricingLanguageToggle(props: {
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  return (
    <div className="language-toggle" role="group" aria-label="Language switcher">
      <button
        className={`tool-button tool-button--utility${props.language === "en" ? " tool-button--active" : ""}`}
        type="button"
        onClick={() => props.onLanguageChange("en")}
      >
        EN
      </button>
      <button
        className={`tool-button tool-button--utility${props.language === "zh-CN" ? " tool-button--active" : ""}`}
        type="button"
        onClick={() => props.onLanguageChange("zh-CN")}
      >
        中文
      </button>
    </div>
  );
}

export default function PricingPage(props: {
  language: Language;
  session: AuthSession;
  onLanguageChange: (language: Language) => void;
}) {
  const [proInterestStatus, setProInterestStatus] = useState<ProInterestStatus>("idle");

  async function recordProInterest() {
    if (props.session.kind !== "authenticated") {
      setProInterestStatus("login-required");
      return;
    }

    if (proInterestStatus === "recorded" || proInterestStatus === "submitting") {
      setProInterestStatus("recorded");
      return;
    }

    setProInterestStatus("submitting");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.session.authToken}`,
      };

      const response = await globalThis.fetch("/api/billing/pro-interest", {
        body: JSON.stringify({
          source: "pricing",
        }),
        headers,
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("failed to record Pro interest");
      }

      setProInterestStatus("recorded");
    } catch {
      setProInterestStatus("error");
    }
  }

  return (
    <main className="app-shell app-shell--lab">
      <section aria-label="Status Bar" className="status-bar status-bar--lab">
        <div className="status-hero">
          <span className="status-kicker">{t(props.language, "sharedRoom")}</span>
          <h1 className="status-title">{t(props.language, "pricingTitle")}</h1>
          <p className="status-subtitle">{t(props.language, "pricingSubtitle")}</p>
        </div>
        <section aria-label="Account" className="status-group status-group--compact">
          <span className="status-kicker">{t(props.language, "language")}</span>
          <div className="utility-strip">
            <PricingLanguageToggle language={props.language} onLanguageChange={props.onLanguageChange} />
            <a className="tool-button tool-button--utility" href="/">
              {t(props.language, "backToLab")}
            </a>
          </div>
        </section>
      </section>

      <section aria-label="Pricing" className="pricing-layout">
        <article className="panel plan-card">
          <div className="panel-title-row">
            <span className="panel-kicker">{t(props.language, "freePlanKicker")}</span>
            <h2 className="panel-title">{t(props.language, "freePlanTitle")}</h2>
            <p className="plan-price">{t(props.language, "freePlanPrice")}</p>
          </div>
          <ul className="plan-list">
            <li>{t(props.language, "freePlanFeatureOne")}</li>
            <li>{t(props.language, "freePlanFeatureTwo")}</li>
            <li>{t(props.language, "freePlanFeatureThree")}</li>
          </ul>
          {props.session.kind === "authenticated" && props.session.user.access.tier === "free" ? (
            <p className="feedback-banner">{t(props.language, "currentPlan")}</p>
          ) : null}
        </article>

        <article className="panel plan-card plan-card--featured">
          <div className="panel-title-row">
            <span className="panel-kicker">{t(props.language, "proPlanKicker")}</span>
            <h2 className="panel-title">{t(props.language, "proPlanTitle")}</h2>
            <p className="plan-price">{t(props.language, "proPlanPrice")}</p>
          </div>
          <ul className="plan-list">
            <li>{t(props.language, "proPlanFeatureOne")}</li>
            <li>{t(props.language, "proPlanFeatureTwo")}</li>
            <li>{t(props.language, "proPlanFeatureThree")}</li>
          </ul>
          <button
            className="tool-button tool-button--primary"
            disabled={proInterestStatus === "submitting"}
            type="button"
            onClick={() => {
              void recordProInterest();
            }}
          >
            {t(props.language, "upgradeToPro")}
          </button>
          {proInterestStatus === "login-required" ? (
            <p className="feedback-banner">{t(props.language, "signInBeforePro")}</p>
          ) : null}
          {proInterestStatus === "recorded" ? (
            <p className="feedback-banner">{t(props.language, "proComingSoon")}</p>
          ) : null}
          {proInterestStatus === "error" ? (
            <p className="feedback-banner feedback-banner--error">{t(props.language, "proInterestFailed")}</p>
          ) : null}
        </article>
      </section>
    </main>
  );
}
