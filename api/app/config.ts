import type { IncomingMessage, ServerResponse } from "node:http";
import { getEnvironmentSnapshot } from "../../server/config/env";
import { sendJson, sendMethodNotAllowed } from "../../server/http/response";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  const env = getEnvironmentSnapshot();
  sendJson(res, 200, {
    authConfigured: env.authConfigured,
    dbConfigured: env.dbConfigured,
    oauthProviders: {
      google: Boolean(env.googleClientId && env.googleClientSecret),
      github: Boolean(env.githubClientId && env.githubClientSecret),
    },
  });
}
