import { NextRequest, NextResponse } from "next/server";
import { CreateAgreementRequestInterface } from "@/core/interfaces/legal.interface";
import { resolveRequestUser } from "@/core/server/request-user";
import { getOAuthServiceAccessToken } from "@/core/server/oauth-service-token";

interface GroupMemberSearchResponse {
  data?: Array<{
    id: number;
    status?: string;
  }>;
}

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  const legalApiUrl = process.env.NEXT_PUBLIC_LEGAL_API_URL;
  const accountApiUrl = process.env.NEXT_ACCOUNT_API_URL;
  const configuredGroupIds = parseGroupIds(process.env.NEXT_ACCOUNT_GROUP_IDS);
  const acceptLanguage = request.headers.get("accept-language");

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!legalApiUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_LEGAL_API_URL is not configured." }, { status: 500 });
  }

  if (!accountApiUrl) {
    return NextResponse.json({ error: "NEXT_ACCOUNT_API_URL is not configured." }, { status: 500 });
  }

  if (configuredGroupIds.length === 0) {
    return NextResponse.json({ error: "NEXT_ACCOUNT_GROUP_IDS is not configured." }, { status: 500 });
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
    cache: "no-store"
  });

  const agreementData = await readJson(agreementResponse);
  const alreadySigned = isAlreadySignedError(agreementResponse.status, agreementData);
  const createdAgreementId =
    !alreadySigned && agreementResponse.ok && agreementData && typeof agreementData === "object" && "id" in agreementData
      ? Number((agreementData as Record<string, unknown>).id)
      : null;

  if (!agreementResponse.ok && !alreadySigned) {
    return NextResponse.json(
      { error: extractErrorMessage(agreementData, "Unable to create agreement.") },
      { status: agreementResponse.status }
    );
  }

  for (const groupId of configuredGroupIds) {
    const membershipSearchParams = new URLSearchParams({
      "userId[0]": String(body.userId)
    });

    const membershipResponse = await fetch(`${accountApiUrl}/groups/${groupId}/members?${membershipSearchParams.toString()}`, {
      method: "GET",
      headers: buildHeaders(authorization, acceptLanguage, false),
      cache: "no-store"
    });

    const membershipData = (await readJson(membershipResponse)) as GroupMemberSearchResponse | null;

    if (!membershipResponse.ok) {
      await rollbackAgreementIfNeeded(legalApiUrl, authorization, acceptLanguage, createdAgreementId);
      return NextResponse.json(
        { error: extractErrorMessage(membershipData, `Unable to check group ${groupId} membership.`) },
        { status: membershipResponse.status }
      );
    }

    const existingMember = membershipData?.data?.[0];

    if (!existingMember) {
      const createMemberResponse = await fetch(`${accountApiUrl}/groups/${groupId}/members`, {
        method: "POST",
        headers: buildHeaders(authorization, acceptLanguage),
        body: JSON.stringify({
          userId: body.userId,
          status: "active"
        }),
        cache: "no-store"
      });

      const createMemberData = await readJson(createMemberResponse);

      if (!createMemberResponse.ok) {
        await rollbackAgreementIfNeeded(legalApiUrl, authorization, acceptLanguage, createdAgreementId);
        return NextResponse.json(
          { error: extractErrorMessage(createMemberData, `Unable to add user to group ${groupId}.`) },
          { status: createMemberResponse.status }
        );
      }

      continue;
    }

    if (existingMember.status !== "active") {
      const updateMemberResponse = await fetch(`${accountApiUrl}/groups/${groupId}/members/${existingMember.id}`, {
        method: "PUT",
        headers: buildHeaders(authorization, acceptLanguage),
        body: JSON.stringify({
          status: "active"
        }),
        cache: "no-store"
      });

      const updateMemberData = await readJson(updateMemberResponse);

      if (!updateMemberResponse.ok) {
        await rollbackAgreementIfNeeded(legalApiUrl, authorization, acceptLanguage, createdAgreementId);
        return NextResponse.json(
          { error: extractErrorMessage(updateMemberData, `Unable to activate group ${groupId} membership.`) },
          { status: updateMemberResponse.status }
        );
      }
    }
  }

  return NextResponse.json(
    {
      agreement: agreementData,
      alreadySigned,
      groupIds: configuredGroupIds
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

function parseGroupIds(rawValue?: string) {
  return (rawValue || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function buildHeaders(authorization: string, acceptLanguage: string | null, includeJsonContentType = true) {
  return {
    Authorization: authorization,
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {})
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

  const documentIdErrors = (data as { validation?: { documentId?: unknown } })?.validation?.documentId;

  return (
    Array.isArray(documentIdErrors) &&
    documentIdErrors.some((item) => typeof item === "string" && item.includes("already been signed"))
  );
}

async function rollbackAgreementIfNeeded(
  legalApiUrl: string,
  authorization: string,
  acceptLanguage: string | null,
  agreementId: number | null
) {
  if (!agreementId) {
    return;
  }

  try {
    await fetch(`${legalApiUrl}/agreements/${agreementId}`, {
      method: "DELETE",
      headers: buildHeaders(authorization, acceptLanguage, false),
      cache: "no-store"
    });
  } catch {
    // Best-effort compensation. The original group-membership error is still the primary failure.
  }
}
