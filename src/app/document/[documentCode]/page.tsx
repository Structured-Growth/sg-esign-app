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
import {
  useAcceptAgreementMutation,
  useCheckAgreementQuery,
} from "@/core/api/legal.api";
import {
  AgreementStatus,
  CheckAgreementResponseInterface,
} from "@/core/interfaces/legal.interface";
import { NotFoundPage } from "@/components/not-found-page";
import { useAuthState } from "@/hooks/use-auth-state";

function renderDocumentText(text: string) {
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);
  const textStyles = {
    fontFamily: "Montserrat, Roboto, Arial, sans-serif",
    fontWeight: 400,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 1,
    color: "rgba(17, 17, 17, 0.84)",
  };

  if (hasHtml) {
    return (
      <Box
        className="document-text"
        dangerouslySetInnerHTML={{ __html: text }}
        sx={textStyles}
      />
    );
  }

  return (
    <Typography
      className="document-text"
      component="div"
      whiteSpace="pre-wrap"
      sx={textStyles}
    >
      {text}
    </Typography>
  );
}

function CompletedState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Stack minHeight="100vh" alignItems="center" justifyContent="center" px={3}>
      <Paper
        elevation={1}
        sx={{ width: "100%", maxWidth: 480, p: 5, borderRadius: 2 }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h5">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function DocumentPage({
  params,
}: {
  params: { documentCode: string };
}) {
  const { t, i18n } = useTranslation();
  const { isReady, isAuthenticating, error: authError, user } = useAuthState();
  const [actionState, setActionState] = useState<AgreementStatus | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptAgreement, acceptAgreementState] = useAcceptAgreementMutation();

  const checkAgreementState = useCheckAgreementQuery(
    {
      accountId: user?.id || 0,
      documentCode: params.documentCode,
    },
    {
      skip: !isReady || !user?.id,
    }
  );

  const resolvedState = useMemo(() => {
    if (actionState) {
      return actionState;
    }

    return checkAgreementState.data?.agreement?.status || null;
  }, [actionState, checkAgreementState.data?.agreement?.status]);
  const isAccepted = resolvedState === "active";
  const isSubmittingAcceptance = acceptAgreementState.isLoading;

  const handleAgreement = async (
    status: AgreementStatus,
    payload: CheckAgreementResponseInterface
  ) => {
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
      date: new Date().toISOString(),
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
            errorData &&
            typeof errorData === "object" &&
            "error" in errorData &&
            typeof errorData.error === "string"
              ? errorData.error
              : t("document.saveErrorWithStatus", {
                  status: String(error.status),
                });

          setAcceptError(message);
        } else {
          setAcceptError(t("document.saveError"));
        }
      }

      return;
    }
  };

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
      <Stack
        minHeight="100vh"
        alignItems="center"
        justifyContent="center"
        spacing={2}
      >
        <CircularProgress />
        <Typography color="text.secondary">
          {t("common.preparingSession")}
        </Typography>
      </Stack>
    );
  }

  if (authError) {
    return (
      <Stack
        minHeight="100vh"
        alignItems="center"
        justifyContent="center"
        px={3}
      >
        <Alert severity="error" sx={{ width: "100%", maxWidth: 480 }}>
          {authError}
        </Alert>
      </Stack>
    );
  }

  if (checkAgreementState.error) {
    if (
      "status" in checkAgreementState.error &&
      checkAgreementState.error.status === 404
    ) {
      return (
        <NotFoundPage
          title={t("notFound.title")}
          description={t("notFound.description")}
        />
      );
    }

    const message =
      "status" in checkAgreementState.error
        ? t("document.loadErrorWithStatus", {
            status: String(checkAgreementState.error.status),
          })
        : t("document.loadError");

    return (
      <Stack
        minHeight="100vh"
        alignItems="center"
        justifyContent="center"
        px={3}
      >
        <Alert severity="error" sx={{ width: "100%", maxWidth: 480 }}>
          {message}
        </Alert>
      </Stack>
    );
  }

  if (checkAgreementState.isLoading || !checkAgreementState.data) {
    return (
      <Stack
        minHeight="100vh"
        alignItems="center"
        justifyContent="center"
        spacing={2}
      >
        <CircularProgress />
        <Typography color="text.secondary">{t("document.loading")}</Typography>
      </Stack>
    );
  }

  const { document } = checkAgreementState.data;
  const signerName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "";
  const signedDate = new Intl.DateTimeFormat(i18n.language || "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(document.date));

  return (
    <Box
      minHeight="100vh"
      px={{ xs: 0, sm: 3 }}
      py={{ xs: 0, sm: 4 }}
      bgcolor="#f4f6f8"
    >
      <Paper
        elevation={1}
        sx={{
          width: "100%",
          maxWidth: 816,
          minHeight: { xs: "100vh", sm: "calc(100vh - 64px)" },
          mx: "auto",
          borderRadius: { xs: 0, sm: 0.5 },
          boxShadow: {
            xs: "none",
            sm: "0 2px 10px rgba(15, 23, 42, 0.14)",
          },
          display: "flex",
          flexDirection: "column",
          p: { xs: 2, sm: 4 },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Stack spacing={{ xs: 2, sm: 3 }}>
            <Typography
              component="h1"
              sx={{
                fontFamily: "Montserrat, Roboto, Arial, sans-serif",
                fontSize: { xs: 20, sm: 36 },
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: 0,
                color: "#111111",
              }}
            >
              {document.title}
            </Typography>

            {renderDocumentText(document.text)}
          </Stack>
        </Box>

        <Stack spacing={2} sx={{ mt: "auto", pt: { xs: 2, sm: 3 } }}>
          {acceptError && <Alert severity="error">{acceptError}</Alert>}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "flex-end" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack spacing={0.25}>
              {signerName ? (
                <Typography
                  sx={{
                    fontFamily: "Montserrat, Roboto, Arial, sans-serif",
                    fontWeight: 400,
                    fontSize: 12,
                    lineHeight: 1,
                    letterSpacing: 0,
                    color: "#111111",
                  }}
                >
                  {signerName}
                </Typography>
              ) : null}
              <Typography
                sx={{
                  fontFamily: "Montserrat, Roboto, Arial, sans-serif",
                  fontWeight: 400,
                  fontSize: 12,
                  lineHeight: 1,
                  letterSpacing: 0,
                  color: "#555555",
                }}
              >
                {signedDate}
              </Typography>
            </Stack>

            <Button
              variant="contained"
              disableElevation
              disabled={isAccepted || acceptAgreementState.isLoading}
              onClick={() => handleAgreement("active", checkAgreementState.data)}
              sx={{
                alignSelf: { xs: "stretch", sm: "auto" },
                width: {
                  xs: "100%",
                  sm: isAccepted ? 310 : 200,
                },
                height: 42,
                minWidth: { sm: isAccepted ? 310 : 200 },
                borderRadius: "12px",
                textTransform: "none",
                fontFamily: "Montserrat, Roboto, Arial, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                lineHeight: 1,
                letterSpacing: 0,
                bgcolor: isAccepted ? "#CFCFCF" : "#0B83D8",
                color: "#FFFFFF",
                "&:hover": {
                  bgcolor: isAccepted ? "#CFCFCF" : "#086fb7",
                },
                "&.Mui-disabled": {
                  bgcolor: isAccepted ? "#CFCFCF" : "#0B83D8",
                  color: "#FFFFFF",
                },
              }}
            >
              {isSubmittingAcceptance ? (
                <CircularProgress size={18} sx={{ color: "#FFFFFF" }} />
              ) : isAccepted ? (
                t("document.acceptedButton")
              ) : (
                t("document.accept")
              )}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
