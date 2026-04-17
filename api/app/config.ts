import type { IncomingMessage, ServerResponse } from "node:http";
import { getEnvironmentSnapshot } from "../../server/config/env";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../../server/http/response";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const env = getEnvironmentSnapshot();
    sendJson(res, 200, {
      authConfigured: env.authConfigured,
      dbConfigured: env.dbConfigured,
      missing: env.missing,
      oauthProviders: {
        google: Boolean(env.googleClientId && env.googleClientSecret),
        github: Boolean(env.githubClientId && env.githubClientSecret),
      },
    });
  } catch (error) {
    handleRouteError(res, error);
  }
}
