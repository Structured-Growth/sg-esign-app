import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/core/server/auth-options";
import { AuthUserInterface } from "@/core/interfaces/auth.interface";

export async function resolveRequestUser(request: NextRequest): Promise<AuthUserInterface | null> {
  void request;
  const session = await getServerSession(authOptions);

  if (session?.user) {
    return session.user as AuthUserInterface;
  }

  return null;
}
