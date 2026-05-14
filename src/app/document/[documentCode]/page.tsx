"use client";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAcceptAgreementMutation, useCheckAgreementQuery, useCreateAgreementMutation } from "@/core/api/legal.api";
import { AgreementStatus, CheckAgreementResponseInterface } from "@/core/interfaces/legal.interface";
import { useAuthState } from "@/hooks/use-auth-state";

function renderDocumentText(text: string) {
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);

  if (hasHtml) {
    return <Box className="document-text" dangerouslySetInnerHTML={{ __html: text }} />;
  }

  return (
    <Typography className="document-text" component="div" whiteSpace="pre-wrap">
      {text}
    </Typography>
  );
}

function CompletedState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Stack minHeight="100vh" alignItems="center" justifyContent="center" px={3}>
      <Paper elevation={1} sx={{ width: "100%", maxWidth: 480, p: 5, borderRadius: 2 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h5">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function DocumentPage({ params }: { params: { documentCode: string } }) {
  const { t } = useTranslation();
  const { isReady, isAuthenticating, error: authError, user } = useAuthState();
  const [actionState, setActionState] = useState<AgreementStatus | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptAgreement, acceptAgreementState] = useAcceptAgreementMutation();
  const [createAgreement, createAgreementState] = useCreateAgreementMutation();

  const checkAgreementState = useCheckAgreementQuery(
    {
      accountId: user?.id || 0,
      documentCode: params.documentCode
    },
    {
      skip: !isReady || !user?.id
    }
  );

  const resolvedState = useMemo(() => {
    if (actionState) {
      return actionState;
    }

    return checkAgreementState.data?.agreement?.status || null;
  }, [actionState, checkAgreementState.data?.agreement?.status]);

  const handleAgreement = async (status: AgreementStatus, payload: CheckAgreementResponseInterface) => {
    if (!user) {
      return;
    }

    const agreementPayload = {
      orgId: payload.document.orgId,
      region: payload.document.region,
      documentId: payload.document.id,
      accountId: user.id,
      userId: user.primaryUserId,
      status,
      date: new Date().toISOString()
    };

    if (status === "active") {
      setAcceptError(null);

      try {
        await acceptAgreement(agreementPayload).unwrap();
        setActionState(status);
      } catch (error) {
        if (error && typeof error === "object" && "status" in error) {
          const errorData = "data" in error ? error.data : null;
          const message =
            errorData && typeof errorData === "object" && "error" in errorData && typeof errorData.error === "string"
              ? errorData.error
              : t("document.saveErrorWithStatus", { status: String(error.status) });

          setAcceptError(message);
        } else {
          setAcceptError(t("document.saveError"));
        }
      }

      return;
    }

    setAcceptError(null);

    await createAgreement(agreementPayload).unwrap();

    setActionState(status);
  };

  if (resolvedState === "active") {
    return (
      <CompletedState
        title={t("document.signedTitle")}
        description={t("document.signedDescription")}
      />
    );
  }

  if (resolvedState === "inactive") {
    return (
      <CompletedState
        title={t("document.declinedTitle")}
        description={t("document.declinedDescription")}
      />
    );
  }

  if (isAuthenticating || (!isReady && !authError)) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2}>
        <CircularProgress />
        <Typography color="text.secondary">{t("common.preparingSession")}</Typography>
      </Stack>
    );
  }

  if (authError) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center" px={3}>
        <Alert severity="error" sx={{ width: "100%", maxWidth: 480 }}>
          {authError}
        </Alert>
      </Stack>
    );
  }

  if (checkAgreementState.error) {
    const message =
      "status" in checkAgreementState.error
        ? t("document.loadErrorWithStatus", { status: String(checkAgreementState.error.status) })
        : t("document.loadError");

    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center" px={3}>
        <Alert severity="error" sx={{ width: "100%", maxWidth: 480 }}>
          {message}
        </Alert>
      </Stack>
    );
  }

  if (checkAgreementState.isLoading || !checkAgreementState.data) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2}>
        <CircularProgress />
        <Typography color="text.secondary">{t("document.loading")}</Typography>
      </Stack>
    );
  }

  const { document } = checkAgreementState.data;

  return (
    <Box minHeight="100vh" px={{ xs: 2, sm: 3 }} py={{ xs: 2, sm: 4 }} bgcolor="#f4f6f8">
      <Stack spacing={2} maxWidth={960} mx="auto">
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h4">{document.title}</Typography>
            <Typography color="text.secondary">
              {t("document.meta", { code: document.code, version: document.version })}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          {renderDocumentText(document.text)}
        </Paper>

        {acceptError && <Alert severity="error">{acceptError}</Alert>}

        {createAgreementState.error && (
          <Alert severity="error">
            {"status" in createAgreementState.error
              ? t("document.saveErrorWithStatus", { status: String(createAgreementState.error.status) })
              : t("document.saveError")}
          </Alert>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ width: "100%" }}
        >
            <Button
              variant="contained"
              size="large"
              disabled={createAgreementState.isLoading || acceptAgreementState.isLoading}
              onClick={() => handleAgreement("active", checkAgreementState.data)}
              sx={{ minHeight: 52, width: { xs: "100%", sm: "auto" } }}
            >
            {t("document.accept")}
          </Button>
          <Button
              variant="outlined"
              size="large"
              color="inherit"
              disabled={createAgreementState.isLoading || acceptAgreementState.isLoading}
              onClick={() => handleAgreement("inactive", checkAgreementState.data)}
              sx={{ minHeight: 52, width: { xs: "100%", sm: "auto" } }}
            >
            {t("document.decline")}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
