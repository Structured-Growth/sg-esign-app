import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    authProvider?: string;
    error?: string;
    user: DefaultSession["user"] & {
      id: number;
      orgId: number;
      selectedOrgId?: number;
      primaryUserId: number;
      region: string;
      tags: string[];
      arn: string;
    };
  }
}
