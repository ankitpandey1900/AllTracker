import type { IncomingMessage, ServerResponse } from "node:http";
import { fetchTelemetry } from "../../server/data/discovery-repo";
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

    const telemetry = await fetchTelemetry();
    sendJson(res, 200, telemetry);
  } catch (error) {
    handleRouteError(res, error);
  }
}
