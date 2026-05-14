import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { fetchOAuthUser } from "@/core/server/oauth-user";

const isSecureCookie =
  process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = "sg-esign-app";

async function refreshAccessToken(token: Record<string, unknown>) {
  if (!token["refreshToken"] || !process.env.NEXT_OAUTH_TOKEN_URL) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token["refreshToken"] as string,
    });

    if (process.env.NEXT_OAUTH_CLIENT_ID) {
      body.set("client_id", process.env.NEXT_OAUTH_CLIENT_ID);
    }

    if (process.env.NEXT_OAUTH_CLIENT_SECRET) {
      body.set("client_secret", process.env.NEXT_OAUTH_CLIENT_SECRET);
    }

    const response = await fetch(process.env.NEXT_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });

    const refreshedTokens = await response.json();
    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token ?? refreshedTokens.accessToken,
      refreshToken:
        refreshedTokens.refresh_token ??
        refreshedTokens.refreshToken ??
        token["refreshToken"],
      accessTokenExpiresAt:
        refreshedTokens.access_token_expires_at ??
        refreshedTokens.accessTokenExpiresAt ??
        token["accessTokenExpiresAt"],
      refreshTokenExpiresAt:
        refreshedTokens.refresh_token_expires_at ??
        refreshedTokens.refreshTokenExpiresAt ??
        token["refreshTokenExpiresAt"],
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "external-token",
      name: "external-token",
      credentials: {
        token: {
          label: "Token",
          type: "text",
        },
      },
      async authorize(credentials) {
        const externalToken = credentials?.token;

        if (!externalToken) {
          return null;
        }

        const user = await fetchOAuthUser(externalToken);

        return {
          ...user,
          id: String(user.id),
          authProvider: "external-token",
        };
      },
    }),
    {
      type: "oauth",
      id: "oauth",
      name: "oauth",
      clientId: process.env.NEXT_OAUTH_CLIENT_ID,
      clientSecret: process.env.NEXT_OAUTH_CLIENT_SECRET,
      authorization: process.env.NEXT_OAUTH_AUTH_URL,
      token: process.env.NEXT_OAUTH_TOKEN_URL,
      userinfo: process.env.NEXT_OAUTH_USER_URL,
      profile(profile) {
        return {
          id: profile.id,
          name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
          email: profile.email,
          image: profile.picture,
          ...profile,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      return !!user["arn"];
    },
    async jwt({ token, user, account }) {
      if (user) {
        token["orgId"] = user["orgId"];
        token["selectedOrgId"] = user["selectedOrgId"];
        token["primaryUserId"] = user["primaryUserId"];
        token["region"] = user["region"];
        token["arn"] = user["arn"];
        token["tags"] = user["tags"];
        token["authProvider"] =
          account?.provider ?? user["authProvider"] ?? "oauth";
        token["accessToken"] =
          account?.provider === "oauth"
            ? account?.["access_token"] ?? account?.["accessToken"]
            : undefined;
        token["refreshToken"] =
          account?.provider === "oauth"
            ? account?.["refresh_token"] ?? account?.["refreshToken"]
            : undefined;
        token["accessTokenExpiresAt"] =
          account?.provider === "oauth"
            ? account?.["access_token_expires_at"] ??
              account?.["accessTokenExpiresAt"]
            : undefined;
        token["refreshTokenExpiresAt"] =
          account?.provider === "oauth"
            ? account?.["refresh_token_expires_at"] ??
              account?.["refreshTokenExpiresAt"]
            : undefined;
        return token;
      }

      if (token["authProvider"] !== "oauth") {
        return token;
      }

      if (token["error"] === "RefreshAccessTokenError") {
        return token;
      }

      const accessTokenExpiresAt = Date.parse(
        String(token["accessTokenExpiresAt"] ?? 0)
      );

      if (accessTokenExpiresAt && Date.now() < accessTokenExpiresAt - 30000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = Number(token.sub);
        session.user.orgId = Number(token["orgId"]);
        session.user.selectedOrgId = token["selectedOrgId"]
          ? Number(token["selectedOrgId"])
          : undefined;
        session.user.primaryUserId = Number(token["primaryUserId"]);
        session.user.region = String(token["region"] ?? "");
        session.user.tags = Array.isArray(token["tags"])
          ? token["tags"].map(String)
          : [];
        session.user.arn = String(token["arn"] ?? "");
        session.authProvider = token["authProvider"]
          ? String(token["authProvider"])
          : undefined;
        session.error = token["error"] ? String(token["error"]) : undefined;
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 10,
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureCookie,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: isSecureCookie,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureCookie,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureCookie,
      },
    },
    state: {
      name: `${cookiePrefix}.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureCookie,
      },
    },
    nonce: {
      name: `${cookiePrefix}.nonce`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureCookie,
      },
    },
  },
  secret: process.env.NEXT_AUTH_SECRET,
  debug: false,
};
