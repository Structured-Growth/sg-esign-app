import { NextRequest, NextResponse } from "next/server";
import { getOAuthServiceAccessToken } from "@/core/server/oauth-service-token";
import { resolveRequestUser } from "@/core/server/request-user";

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  const legalApiUrl = process.env.NEXT_PUBLIC_LEGAL_API_URL;
  const documentCode = request.nextUrl.searchParams.get("documentCode");
  const acceptLanguage = request.headers.get("accept-language");

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!legalApiUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_LEGAL_API_URL is not configured." },
      { status: 500 }
    );
  }

  if (!documentCode) {
    return NextResponse.json(
      { error: "documentCode is required." },
      { status: 400 }
    );
  }

  try {
    const serviceAccessToken = await getOAuthServiceAccessToken();
    const searchParams = new URLSearchParams({
      accountId: String(user.id),
      documentCode,
    });

    const response = await fetch(
      `${legalApiUrl}/agreements/check?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${serviceAccessToken}`,
          ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
        },
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(data, "Unable to load agreement.") },
        { status: response.status }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load agreement.",
      },
      { status: 500 }
    );
  }
}

function extractErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.error === "string" && record.error) {
      return record.error;
    }

    if (typeof record.message === "string" && record.message) {
      return record.message;
    }
  }

  return fallback;
}
