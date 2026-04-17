import { toNodeHandler } from "better-auth/node";
import { getAuth } from "../../server/auth";
import { handleRouteError } from "../../server/http/response";

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
