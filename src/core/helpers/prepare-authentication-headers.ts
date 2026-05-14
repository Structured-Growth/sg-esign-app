import i18n from "@/i18n/i18n";

export function prepareAuthenticationHeaders(headers: Headers) {
  const fallbackLng = i18n.options.fallbackLng;
  const fallbackLocale = Array.isArray(fallbackLng) ? fallbackLng[0] : typeof fallbackLng === "string" ? fallbackLng : "en-US";
  const locale = i18n.language || fallbackLocale;

  headers.set("Accept-Language", locale);

  return headers;
}
