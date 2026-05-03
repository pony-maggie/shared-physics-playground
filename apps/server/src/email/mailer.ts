import nodemailer from "nodemailer";

import { getSmtpConfig, isSmtpConfigured, type SmtpConfig } from "./smtp-config";

export type LoginCodeEmailInput = {
  email: string;
  code: string;
};

export type ProInterestEmailInput = {
  currentTier: string;
  ipAddress: string;
  occurredAt: string;
  operatorEmail?: string;
  source: string;
  userEmail: string | null;
  userId: string | null;
};

type Transport = {
  sendMail: (payload: Record<string, unknown>) => Promise<unknown>;
};

type MailerFactoryInput = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  transportFactory?: (config: SmtpConfig) => Transport;
};

type ResendConfig = {
  apiKey: string;
  from: {
    email: string;
    name: string;
  };
};

type EmailMessage = {
  html: string;
  subject: string;
  text: string;
};

type EmailDeliveryInput = EmailMessage & {
  to: string;
};

function read(value: string | undefined): string {
  return value?.trim() ?? "";
}

function formatFrom(input: { email: string; name: string }): string {
  return `"${input.name}" <${input.email}>`;
}

function mailProvider(env: Record<string, string | undefined>): "resend" | "smtp" {
  return read(env.MAIL_PROVIDER).toLowerCase() === "resend" || read(env.RESEND_API_KEY).length > 0
    ? "resend"
    : "smtp";
}

function getResendConfig(env: Record<string, string | undefined>): ResendConfig {
  const apiKey = read(env.RESEND_API_KEY);
  const email = read(env.RESEND_FROM_EMAIL || env.MAIL_FROM_EMAIL || env.SMTP_FROM_EMAIL);
  const name = read(env.RESEND_FROM_NAME || env.MAIL_FROM_NAME || env.SMTP_FROM_NAME);

  if (!apiKey || !email || !name) {
    throw new Error("Resend is not fully configured");
  }

  return {
    apiKey,
    from: {
      email,
      name,
    },
  };
}

function isResendConfigured(env: Record<string, string | undefined>): boolean {
  try {
    getResendConfig(env);
    return true;
  } catch {
    return false;
  }
}

export function isMailerConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return mailProvider(env) === "resend" ? isResendConfigured(env) : isSmtpConfigured(env);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderLoginCodeEmail(input: LoginCodeEmailInput) {
  const code = escapeHtml(input.code);

  return {
    subject: "Your Shared Physics Playground verification code",
    text: `Your Shared Physics Playground verification code is ${input.code}. It expires in 10 minutes.`,
    html: `<p>Your Shared Physics Playground verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  };
}

export function renderProInterestEmail(input: ProInterestEmailInput) {
  const userEmail = input.userEmail ?? "anonymous visitor";
  const userId = input.userId ?? "unknown";
  const safeUserEmail = escapeHtml(userEmail);
  const safeUserId = escapeHtml(userId);
  const safeTier = escapeHtml(input.currentTier);
  const safeSource = escapeHtml(input.source);
  const safeIpAddress = escapeHtml(input.ipAddress);
  const safeOccurredAt = escapeHtml(input.occurredAt);

  return {
    subject: `Pro upgrade request: ${userEmail}`,
    text: [
      "A user wants to upgrade to Pro.",
      `User: ${userEmail}`,
      `User ID: ${userId}`,
      `Current tier: ${input.currentTier}`,
      `Source: ${input.source}`,
      `IP address: ${input.ipAddress}`,
      `Occurred at: ${input.occurredAt}`,
    ].join("\n"),
    html: [
      "<p>A user wants to upgrade to <strong>Pro</strong>.</p>",
      "<ul>",
      `<li>User: ${safeUserEmail}</li>`,
      `<li>User ID: ${safeUserId}</li>`,
      `<li>Current tier: ${safeTier}</li>`,
      `<li>Source: ${safeSource}</li>`,
      `<li>IP address: ${safeIpAddress}</li>`,
      `<li>Occurred at: ${safeOccurredAt}</li>`,
      "</ul>",
    ].join(""),
  };
}

export function createMailer({
  env = process.env,
  fetchImpl = fetch,
  transportFactory = (config) =>
    nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTls,
      auth: config.auth,
    }),
}: MailerFactoryInput = {}) {
  if (mailProvider(env) === "resend") {
    const config = getResendConfig(env);

    async function sendResendEmail(input: EmailDeliveryInput) {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: formatFrom(config.from),
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend email failed with status ${response.status}`);
      }
    }

    return {
      async sendLoginCode(input: LoginCodeEmailInput) {
        const message = renderLoginCodeEmail(input);

        await sendResendEmail({
          to: input.email,
          ...message,
        });
      },
      async sendProInterest(input: ProInterestEmailInput & { operatorEmail: string }) {
        const message = renderProInterestEmail(input);

        await sendResendEmail({
          to: input.operatorEmail,
          ...message,
        });
      },
    };
  }

  const config = getSmtpConfig(env);
  const transport = transportFactory(config);

  return {
    async sendLoginCode(input: LoginCodeEmailInput) {
      const message = renderLoginCodeEmail(input);

      await transport.sendMail({
        from: formatFrom(config.from),
        to: input.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
    async sendProInterest(input: ProInterestEmailInput & { operatorEmail: string }) {
      const message = renderProInterestEmail(input);

      await transport.sendMail({
        from: formatFrom(config.from),
        to: input.operatorEmail,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}
