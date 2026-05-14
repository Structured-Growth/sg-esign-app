"use client";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { setAuthSession, setAuthStatus } from "@/core/slices/app.slice";
import { useAppDispatch } from "@/hooks/use-app-dispatch";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { AuthUserInterface } from "@/core/interfaces/auth.interface";

function LoaderScreen() {
  const { t } = useTranslation();

  return (
    <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2}>
      <CircularProgress />
      <Typography color="text.secondary">{t("common.preparingSession")}</Typography>
    </Stack>
  );
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const [externalToken, setExternalToken] = useState<string | null | undefined>(undefined);
  const [isProcessingExternalToken, setIsProcessingExternalToken] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const tokenFromQuery = new URLSearchParams(window.location.search).get("token");
    setExternalToken(tokenFromQuery);
  }, []);

  const sessionUser = useMemo(() => {
    if (!session?.user) {
      return null;
    }

    return {
      ...(session.user as AuthUserInterface)
    };
  }, [session?.user]);

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      signOut();
    }
  }, [session?.error]);

  useEffect(() => {
    if (externalToken === undefined || !externalToken || status === "authenticated" || isProcessingExternalToken) {
      return;
    }

    dispatch(
      setAuthStatus({
        isAuthenticating: true,
        isReady: false,
        error: null
      })
    );

    setIsProcessingExternalToken(true);

    signIn("external-token", {
      token: externalToken,
      redirect: false
    })
      .then((result) => {
        if (result?.error) {
          throw new Error(result.error);
        }

        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("token");
          window.location.replace(currentUrl.toString());
        }
      })
      .catch((signInError: Error) => {
        dispatch(
          setAuthStatus({
            error: signInError.message,
            isAuthenticating: false,
            isReady: false
          })
        );
        setExternalToken(null);
      })
      .finally(() => {
        setIsProcessingExternalToken(false);
      });
  }, [dispatch, externalToken, isProcessingExternalToken, status]);

  useEffect(() => {
    if (externalToken === undefined) {
      return;
    }

    if (status === "authenticated" && sessionUser) {
      dispatch(
        setAuthSession({
          user: sessionUser
        })
      );
      return;
    }

    if (isProcessingExternalToken) {
      dispatch(
        setAuthStatus({
          isAuthenticating: true,
          isReady: false,
          error: null
        })
      );
      return;
    }

    if (status === "unauthenticated" && !externalToken) {
      dispatch(
        setAuthStatus({
          isAuthenticating: true,
          isReady: false,
          error: null
        })
      );
      signIn("oauth");
      return;
    }

    if (status === "loading") {
      dispatch(
        setAuthStatus({
          isAuthenticating: true,
          isReady: false,
          error: null
        })
      );
    }
  }, [dispatch, externalToken, isProcessingExternalToken, sessionUser, status]);

  if (status === "loading" || externalToken === undefined || isProcessingExternalToken) {
    return <LoaderScreen />;
  }

  return <>{children}</>;
}
