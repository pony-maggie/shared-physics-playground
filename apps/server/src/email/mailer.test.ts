import { describe, expect, test } from "vitest";

import { createMailer, renderLoginCodeEmail, renderProInterestEmail } from "./mailer";

const smtpEnv = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USERNAME: "mailer@example.com",
  SMTP_PASSWORD: "secret-password",
  SMTP_FROM_EMAIL: "from@example.com",
  SMTP_FROM_NAME: "physics-playground",
};

describe("SMTP mailer", () => {
  test("sends login-code email through the configured transport", async () => {
    const sentMessages: Array<Record<string, unknown>> = [];
    const mailer = createMailer({
      env: smtpEnv,
      transportFactory: (config) => ({
        async sendMail(payload) {
          sentMessages.push({ config, payload });
        },
      }),
    });

    await mailer.sendLoginCode({
      email: "tester@example.com",
      code: "123456",
    });

    expect(sentMessages).toEqual([
      {
        config: expect.objectContaining({
          host: "smtp.example.com",
          port: 587,
          secure: false,
          requireTls: true,
        }),
        payload: expect.objectContaining({
          from: "\"physics-playground\" <from@example.com>",
          to: "tester@example.com",
          subject: "Your Shared Physics Playground verification code",
          text: "Your Shared Physics Playground verification code is 123456. It expires in 10 minutes.",
        }),
      },
    ]);
  });

  test("escapes the HTML verification code body", () => {
    const message = renderLoginCodeEmail({
      email: "tester@example.com",
      code: "<123&456>",
    });

    expect(message.html).toContain("&lt;123&amp;456&gt;");
  });

  test("sends Pro purchase interest email to the operator", async () => {
    const sentMessages: Array<Record<string, unknown>> = [];
    const mailer = createMailer({
      env: smtpEnv,
      transportFactory: (config) => ({
        async sendMail(payload) {
          sentMessages.push({ config, payload });
        },
      }),
    });

    await mailer.sendProInterest({
      currentTier: "free",
      ipAddress: "203.0.113.12",
      occurredAt: "2026-05-01T08:00:00.000Z",
      operatorEmail: "machengyu519@gmail.com",
      source: "pricing",
      userEmail: "free@example.com",
      userId: "user-free",
    });

    expect(sentMessages).toEqual([
      {
        config: expect.objectContaining({
          host: "smtp.example.com",
        }),
        payload: expect.objectContaining({
          from: "\"physics-playground\" <from@example.com>",
          to: "machengyu519@gmail.com",
          subject: "Pro upgrade request: free@example.com",
          text: expect.stringContaining("free@example.com"),
        }),
      },
    ]);
    expect(String(sentMessages[0]?.payload?.text)).toContain("user-free");
    expect(String(sentMessages[0]?.payload?.text)).toContain("203.0.113.12");
    expect(String(sentMessages[0]?.payload?.text)).toContain("2026-05-01T08:00:00.000Z");
  });

  test("escapes Pro purchase interest email HTML", () => {
    const message = renderProInterestEmail({
      currentTier: "<free>",
      ipAddress: "<203.0.113.12>",
      occurredAt: "2026-05-01T08:00:00.000Z",
      source: "<pricing>",
      userEmail: "<buyer@example.com>",
      userId: "<user-1>",
    });

    expect(message.html).toContain("&lt;buyer@example.com&gt;");
    expect(message.html).toContain("&lt;203.0.113.12&gt;");
    expect(message.html).toContain("&lt;pricing&gt;");
  });
});
