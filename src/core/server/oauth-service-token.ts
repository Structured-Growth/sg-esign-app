interface ServiceTokenCache {
  accessToken: string;
  expiresAt: number;
}

let serviceTokenCache: ServiceTokenCache | null = null;
let pendingServiceTokenRequest: Promise<string> | null = null;

function readTokenExpiry(payload: Record<string, unknown>) {
  if (typeof payload.expires_in === "number") {
    return Date.now() + payload.expires_in * 1000;
  }

  if (typeof payload.expiresIn === "number") {
    return Date.now() + payload.expiresIn * 1000;
  }

  if (typeof payload.access_token_expires_at === "string") {
    return Date.parse(payload.access_token_expires_at);
  }

  if (typeof payload.accessTokenExpiresAt === "string") {
    return Date.parse(payload.accessTokenExpiresAt);
  }

  return Date.now() + 5 * 60 * 1000;
}

async function requestServiceAccessToken() {
  const tokenUrl = process.env.NEXT_OAUTH_TOKEN_URL;
  const clientId = process.env.NEXT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.NEXT_OAUTH_CLIENT_SECRET;

  if (!tokenUrl) {
    throw new Error("NEXT_OAUTH_TOKEN_URL is not configured.");
  }

  if (!clientId) {
    throw new Error("OAuth service client id is not configured.");
  }

  if (!clientSecret) {
    throw new Error("OAuth service client secret is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString(),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !payload) {
    throw new Error(
      (payload?.error_description as string) ||
        (payload?.error as string) ||
        "Unable to request OAuth service token."
    );
  }

  const accessToken = payload.access_token ?? payload.accessToken;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("OAuth service token response does not contain access token.");
  }

  serviceTokenCache = {
    accessToken,
    expiresAt: readTokenExpiry(payload)
  };

  return serviceTokenCache.accessToken;
}

export async function getOAuthServiceAccessToken() {
  if (serviceTokenCache && Date.now() < serviceTokenCache.expiresAt - 30000) {
    return serviceTokenCache.accessToken;
  }

  if (!pendingServiceTokenRequest) {
    pendingServiceTokenRequest = requestServiceAccessToken().finally(() => {
      pendingServiceTokenRequest = null;
    });
  }

  return pendingServiceTokenRequest;
}
