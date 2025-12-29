import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type AdminSession = {
  id: number;
  email: string;
  name: string | null;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminSession: AdminSession | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let adminSession: AdminSession | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Try to get admin session from cookie
  try {
    const adminSessionCookie = opts.req.cookies?.admin_session;
    if (adminSessionCookie) {
      adminSession = JSON.parse(adminSessionCookie);
    }
  } catch (error) {
    adminSession = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminSession,
  };
}
