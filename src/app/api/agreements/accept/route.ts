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

  const requestBody = (await request.json()) as CreateAgreementRequestInterface;
  const serviceAccessToken = await getOAuthServiceAccessToken();
  const authorization = `Bearer ${serviceAccessToken}`;
  const body = {
    ...requestBody,
    accountId: user.id,
    userId: user.primaryUserId,
  };

  const agreementResponse = await fetch(`${legalApiUrl}/agreements`, {
    method: "POST",
    headers: buildHeaders(authorization, acceptLanguage),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const agreementData = await readJson(agreementResponse);
  const alreadySigned = isAlreadySignedError(
    agreementResponse.status,
    agreementData
  );

  if (!agreementResponse.ok && !alreadySigned) {
    return NextResponse.json(
      {
        error: extractErrorMessage(
          agreementData,
          "Unable to create agreement."
        ),
      },
      { status: agreementResponse.status }
    );
  }

  return NextResponse.json(
    {
      agreement: agreementData,
      alreadySigned,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function buildHeaders(
  authorization: string,
  acceptLanguage: string | null,
  includeJsonContentType = true
) {
  return {
    Authorization: authorization,
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
  };
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
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

function isAlreadySignedError(status: number, data: unknown) {
  if (status !== 422) return false;

  const documentIdErrors = (data as { validation?: { documentId?: unknown } })
    ?.validation?.documentId;

  return (
    Array.isArray(documentIdErrors) &&
    documentIdErrors.some(
      (item) => typeof item === "string" && item.includes("already been signed")
    )
  );
}
