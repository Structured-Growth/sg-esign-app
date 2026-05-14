import i18n from "i18next";
import HttpApi from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import defaultLanguageSource from "../../public/locales/en-US.json";

type PublicConfig = {
  translateApiUrl: string;
  translateApiClientId: string;
  defaultLanguage: string;
  supportedLngs: string[];
};

let cached: PublicConfig | null = null;
let inflight: Promise<PublicConfig> | null = null;

async function getPublicConfig(): Promise<PublicConfig> {
  if (cached) {
    return cached;
  }

  if (inflight) {
    return inflight;
  }

  inflight = fetch("/api/public-config", {
    credentials: "same-origin"
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`public-config ${response.status}`);
      }

      const data = (await response.json()) as PublicConfig;
      cached = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function initClientI18n() {
  if (typeof window === "undefined" || i18n.isInitialized) {
    return;
  }

  const { translateApiUrl, translateApiClientId, defaultLanguage, supportedLngs } = await getPublicConfig();

  await i18n.use(initReactI18next).use(HttpApi).init({
    backend: {
      loadPath: `${translateApiUrl}/v1/translation-set/${translateApiClientId}/{{lng}}`,
      request: async (_options, url, _payload, callback) => {
        const requestedLanguage = url.split("/").pop()?.toLowerCase() || "";
        const isSupportedLanguage = supportedLngs.some((language) => language.toLowerCase() === requestedLanguage);

        if (!isSupportedLanguage) {
          callback(null, { status: 200, data: defaultLanguageSource });
          return;
        }

        try {
          if (!translateApiUrl || !translateApiClientId) {
            throw new Error("translation API configuration is missing");
          }

          const result = await fetch(url);

          if (!result.ok) {
            throw new Error(`translation request failed with ${result.status}`);
          }

          const data = await result.json();
          callback(null, { status: 200, data });
        } catch (_error) {
          callback(null, { status: 200, data: defaultLanguageSource });
          return;
        }
      }
    },
    supportedLngs,
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    interpolation: {
      escapeValue: false
    }
  });
}

void initClientI18n();

export default i18n;
