import { describe, expect, test } from "vitest";

import { getSmtpConfig, isSmtpConfigured } from "./smtp-config";

describe("SMTP config", () => {
  test("parses a complete SMTP environment without exposing secrets", () => {
    const env = {
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "465",
      SMTP_USERNAME: "mailer@example.com",
      SMTP_PASSWORD: "secret-password",
      SMTP_FROM_EMAIL: "from@example.com",
      SMTP_FROM_NAME: "physics-playground",
    };

    expect(isSmtpConfigured(env)).toBe(true);
    expect(getSmtpConfig(env)).toEqual({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      requireTls: false,
      auth: {
        user: "mailer@example.com",
        pass: "secret-password",
      },
      from: {
        email: "from@example.com",
        name: "physics-playground",
      },
    });
  });

  test("treats missing SMTP fields as unconfigured", () => {
    expect(
      isSmtpConfigured({
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "465",
      }),
    ).toBe(false);
    expect(() =>
      getSmtpConfig({
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "465",
      }),
    ).toThrow("SMTP is not fully configured");
  });
});
