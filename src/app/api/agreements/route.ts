import { NextRequest, NextResponse } from "next/server";
import { CreateAgreementRequestInterface } from "@/core/interfaces/legal.interface";
import { resolveRequestUser } from "@/core/server/request-user";
import { getOAuthServiceAccessToken } from "@/core/server/oauth-service-token";

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  const legalApiUrl = process.env.NEXT_PUBLIC_LEGAL_API_URL;
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

  try {
    const body = (await request.json()) as CreateAgreementRequestInterface;
    const serviceAccessToken = await getOAuthServiceAccessToken();
    const normalizedBody = {
      ...body,
      accountId: user.id,
      userId: user.primaryUserId,
    };

    const response = await fetch(`${legalApiUrl}/agreements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceAccessToken}`,
        "Content-Type": "application/json",
        ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
      },
      body: JSON.stringify(normalizedBody),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(data, "Unable to create agreement.") },
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
          error instanceof Error
            ? error.message
            : "Unable to create agreement.",
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
