"use client";
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { I18nextProvider } from "react-i18next";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { store } from "@/core/store";
import theme from "@/app/theme";
import AuthProvider from "@/providers/auth-provider";
import i18n from "@/i18n/i18n";
import { LanguageContextProvider } from "@/contexts/language-context";
import { AppI18nProvider } from "@/providers/i18n-provider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <LanguageContextProvider>
        <I18nextProvider i18n={i18n}>
          <AppI18nProvider i18n={i18n}>
            <SessionProvider refetchInterval={10 * 60} refetchOnWindowFocus>
              <ThemeProvider theme={theme}>
                <AppRouterCacheProvider>
                  <AuthProvider>{children}</AuthProvider>
                </AppRouterCacheProvider>
              </ThemeProvider>
            </SessionProvider>
          </AppI18nProvider>
        </I18nextProvider>
      </LanguageContextProvider>
    </Provider>
  );
}
