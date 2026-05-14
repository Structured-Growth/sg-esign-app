"use client";

import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2} px={3}>
      <Typography variant="h4" textAlign="center">{t("home.title")}</Typography>
      <Typography color="text.secondary" textAlign="center" maxWidth={520}>
        {t("home.description")}
      </Typography>
      <Typography color="text.secondary" textAlign="center">
        {t("home.routeLabel")} <Link href="/document/example-code">/document/[documentCode]</Link>
      </Typography>
    </Stack>
  );
}
