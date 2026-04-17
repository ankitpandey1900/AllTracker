function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function hasEvery(values: Array<string | undefined>): boolean {
  return values.every((value) => typeof value === "string" && value.length > 0);
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function getTrustedOrigins(): string[] {
  return (readEnv("BETTER_AUTH_TRUSTED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getEnvironmentSnapshot() {
  const databaseUrl = readEnv("DATABASE_URL");
  const betterAuthSecret = readEnv("BETTER_AUTH_SECRET");
  const betterAuthUrl = readEnv("BETTER_AUTH_URL");
  const googleClientId = readEnv("GOOGLE_CLIENT_ID");
  const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const githubClientId = readEnv("GITHUB_CLIENT_ID");
  const githubClientSecret = readEnv("GITHUB_CLIENT_SECRET");

  const requiredAuthKeys = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
  ];

  const missing = requiredAuthKeys.filter((key) => !readEnv(key));

  const dbConfigured = hasEvery([databaseUrl]);
  const authConfigured = missing.length === 0;

  return {
    databaseUrl,
    betterAuthSecret,
    betterAuthUrl,
    googleClientId,
    googleClientSecret,
    githubClientId,
    githubClientSecret,
    trustedOrigins: getTrustedOrigins(),
    dbConfigured,
    authConfigured,
    missing,
  };
}

export function assertDatabaseConfigured(): string {
  const env = getEnvironmentSnapshot();
  if (!env.dbConfigured || !env.databaseUrl) {
    throw new ConfigurationError(
      "Database is not configured. Set DATABASE_URL before using server-backed data.",
    );
  }
  return env.databaseUrl;
}

export function assertAuthConfigured() {
  const env = getEnvironmentSnapshot();
  if (!env.authConfigured) {
    throw new ConfigurationError(
      "Better Auth is not configured yet. Set the OAuth and Better Auth environment variables first.",
    );
  }
  return {
    databaseUrl: env.databaseUrl as string,
    betterAuthSecret: env.betterAuthSecret as string,
    betterAuthUrl: env.betterAuthUrl as string,
    googleClientId: env.googleClientId as string,
    googleClientSecret: env.googleClientSecret as string,
    githubClientId: env.githubClientId as string,
    githubClientSecret: env.githubClientSecret as string,
    trustedOrigins: env.trustedOrigins,
  };
}
