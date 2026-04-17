import { toNodeHandler } from "better-auth/node";
import { getAuth } from "../_lib/auth/index.js";
import { handleRouteError } from "../_lib/http/response.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  const auth = getAuth();
  return toNodeHandler(auth)(req, res);
}
