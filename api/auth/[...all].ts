import { toNodeHandler } from "better-auth/node";
import { getAuth } from "../_lib/auth";
import { handleRouteError } from "../_lib/http/response";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  try {
    const auth = getAuth();
    return toNodeHandler(auth.handler)(req, res);
  } catch (error) {
    handleRouteError(res, error);
  }
}
