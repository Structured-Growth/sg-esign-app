import { NextRequest, NextResponse } from "next/server";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { CreateAgreementRequestInterface } from "@/core/interfaces/legal.interface";
import { resolveRequestUser } from "@/core/server/request-user";
import { getOAuthServiceAccessToken } from "@/core/server/oauth-service-token";

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  const legalApiUrl = process.env.NEXT_PUBLIC_LEGAL_API_URL;
  const eventBusName = process.env.NEXT_EVENTBUS_NAME;
  const eventSource = process.env.NEXT_APP_PREFIX;
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

  if (!eventBusName) {
    return NextResponse.json(
      { error: "NEXT_EVENTBUS_NAME is not configured." },
      { status: 500 }
    );
  }

  if (!eventSource) {
    return NextResponse.json(
      { error: "NEXT_APP_PREFIX is not configured." },
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
  const createdAgreementId =
    !alreadySigned &&
    agreementResponse.ok &&
    agreementData &&
    typeof agreementData === "object" &&
    "id" in agreementData
      ? Number((agreementData as Record<string, unknown>).id)
      : null;

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

  try {
    await enqueueGroupMembershipSync({
      eventBusName,
      eventSource,
      region: body.region,
      orgId: body.orgId,
      accountId: body.accountId,
      userId: body.userId,
      agreementId: createdAgreementId,
      alreadySigned,
      language: acceptLanguage,
    });
  } catch (error) {
    await rollbackAgreementIfNeeded(
      legalApiUrl,
      authorization,
      acceptLanguage,
      createdAgreementId
    );

    return NextResponse.json(
      {
        error: extractErrorMessage(
          error,
          "Unable to queue group membership synchronization."
        ),
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      agreement: agreementData,
      alreadySigned,
      queueSubject: buildEventArn({
        appPrefix: eventSource,
        region: body.region,
        orgId: body.orgId,
        accountId: body.accountId,
      }),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

async function enqueueGroupMembershipSync(params: {
  eventBusName: string;
  eventSource: string;
  region: string;
  orgId: number;
  accountId: number;
  userId: number;
  agreementId: number | null;
  alreadySigned: boolean;
  language: string | null;
}) {
  const region = process.env.AWS_DEFAULT_REGION;

  if (!region) {
    throw new Error("AWS region is not configured.");
  }

  const client = new EventBridgeClient({ region });

  const response = await client.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: params.eventBusName,
          Source: params.eventSource,
          DetailType: buildEventArn({
            appPrefix: params.eventSource,
            region: params.region,
            orgId: params.orgId,
            accountId: params.accountId,
          }),
          Detail: JSON.stringify({
            accountId: params.accountId,
            userId: params.userId,
            agreementId: params.agreementId,
            alreadySigned: params.alreadySigned,
            language: params.language,
            requestedAt: new Date().toISOString(),
          }),
        },
      ],
    })
  );

  if ((response.FailedEntryCount || 0) > 0) {
    throw new Error("EventBridge rejected one or more entries.");
  }
}

function buildEventArn(params: {
  appPrefix: string;
  region: string;
  orgId: number;
  accountId: number;
}) {
  return `${params.appPrefix}:${params.region}:${params.orgId}:${params.accountId}:events/agreements/accepted`;
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
      cache: "no-store",
    });
  } catch {
    // Best-effort compensation. The original queueing error is still the primary failure.
  }
}
