"use client";
import { NotFoundPage } from "@/components/not-found-page";
import { useTranslation } from "react-i18next";

export default function GlobalNotFound() {
  const { t } = useTranslation();

  return (
    <NotFoundPage
      title={t("notFound.title")}
      description={t("notFound.description")}
    />
  );
}
