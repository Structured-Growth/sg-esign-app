import { AuthUserInterface } from "@/core/interfaces/auth.interface";

export async function fetchOAuthUser(
  accessToken: string
): Promise<AuthUserInterface> {
  const userUrl = process.env.NEXT_OAUTH_USER_URL;

  if (!userUrl) {
    throw new Error("NEXT_OAUTH_USER_URL is not configured.");
  }

  const response = await fetch(userUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    throw new Error(
      (data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string" &&
        data.error) ||
        (data &&
          typeof data === "object" &&
          "message" in data &&
          typeof data.message === "string" &&
          data.message) ||
        "Unable to load user profile."
    );
  }

  return data as AuthUserInterface;
}
