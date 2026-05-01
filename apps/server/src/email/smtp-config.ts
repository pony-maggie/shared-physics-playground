type MailEnv = Record<string, string | undefined>;

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    email: string;
    name: string;
  };
};

function read(value: string | undefined): string {
  return value?.trim() ?? "";
}

function readPort(env: MailEnv): number {
  const port = Number.parseInt(read(env.SMTP_PORT), 10);
  return Number.isFinite(port) && port > 0 ? port : 0;
}

export function isSmtpConfigured(env: MailEnv = process.env): boolean {
  return (
    read(env.SMTP_HOST).length > 0 &&
    readPort(env) > 0 &&
    read(env.SMTP_USERNAME).length > 0 &&
    read(env.SMTP_PASSWORD).length > 0 &&
    read(env.SMTP_FROM_EMAIL).length > 0 &&
    read(env.SMTP_FROM_NAME).length > 0
  );
}

export function getSmtpConfig(env: MailEnv = process.env): SmtpConfig {
  if (!isSmtpConfigured(env)) {
    throw new Error("SMTP is not fully configured");
  }

  const port = readPort(env);
  const tlsMode = read(env.SMTP_TLS_MODE || env.TLS_MODE).toLowerCase();
  const secure =
    tlsMode === "ssl" || tlsMode === "implicit" || read(env.SMTP_SECURE).toLowerCase() === "true" || port === 465;

  return {
    host: read(env.SMTP_HOST),
    port,
    secure,
    requireTls: tlsMode === "starttls" || (!secure && port === 587),
    auth: {
      user: read(env.SMTP_USERNAME),
      pass: read(env.SMTP_PASSWORD),
    },
    from: {
      email: read(env.SMTP_FROM_EMAIL),
      name: read(env.SMTP_FROM_NAME),
    },
  };
}
