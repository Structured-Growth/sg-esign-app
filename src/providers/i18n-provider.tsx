"use client";
import React, { useEffect, useState } from "react";
import type { i18n as I18nInstance } from "i18next";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useContextLanguage } from "@/contexts/language-context";

export function AppI18nProvider({
  children,
  i18n,
}: {
  children: React.ReactNode;
  i18n: I18nInstance;
}) {
  const [loading, setLoading] = useState(true);
  const { setLanguage } = useContextLanguage();

  useEffect(() => {
    let alive = true;

    (async () => {
      if (typeof window === "undefined") {
        return;
      }

      await waitI18nReady(i18n);
      if (!alive) {
        return;
      }

      const options = i18n.options ?? {};
      const fallback = Array.isArray(options.fallbackLng)
        ? options.fallbackLng[0]
        : typeof options.fallbackLng === "string"
        ? options.fallbackLng
        : "en-US";
      const supported = (options.supportedLngs as string[] | undefined) ?? [];
      const raw = (
        navigator.languages?.[0] ||
        navigator.language ||
        fallback
      ).toLowerCase();
      const base = raw.split("-")[0];
      const exactMatch = supported.find((item) => item.toLowerCase() === raw);
      const baseMatch = supported.find(
        (item) => item.split("-")[0]?.toLowerCase() === base
      );
      const selected = exactMatch || baseMatch || fallback;

      await i18n.changeLanguage(selected);
      if (!alive) {
        return;
      }

      setLanguage(selected);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [i18n, setLanguage]);

  if (loading) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Stack>
    );
  }

  return <>{children}</>;
}

function waitI18nReady(i18n: I18nInstance) {
  if (i18n.isInitialized) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const onInit = () => {
      i18n.off("initialized", onInit);
      resolve();
    };

    i18n.on("initialized", onInit);
  });
}
