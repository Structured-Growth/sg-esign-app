import type { Metadata } from "next";
import { headers } from "next/headers";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode } from "react";
import "./globals.css";
import Providers from "@/providers/providers";
import { getServerDictionary, resolveServerLanguage } from "@/i18n/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = resolveServerLanguage(headers().get("accept-language"));
  const dictionary = getServerDictionary(language);

  return {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const language = resolveServerLanguage(headers().get("accept-language"));

  return (
    <html lang={language}>
      <body>
        <CssBaseline />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
