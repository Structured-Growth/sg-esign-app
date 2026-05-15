import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function resolveServerLanguage(acceptLanguageHeader?: string | null) {
  if (!acceptLanguageHeader) {
    return getFallbackLanguage();
  }

  const candidates = acceptLanguageHeader
    .split(",")
    .map((item) => item.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean) as string[];

  for (const candidate of candidates) {
    const resolvedLanguage = resolveSupportedLanguage(candidate, false);
    if (resolvedLanguage) {
      return resolvedLanguage;
    }
  }

  return getFallbackLanguage();
}

export function getServerDictionary(language: string) {
  const resolvedLanguage =
    resolveSupportedLanguage(language) || getFallbackLanguage();

  const dictionary =
    loadDictionary(resolvedLanguage) || loadDictionary(getFallbackLanguage());

  if (!dictionary) {
    throw new Error(
      `Missing locale dictionary for "${resolvedLanguage}" and fallback "${getFallbackLanguage()}". ` +
        "Check NEXT_DEFAULT_LANGUAGE, NEXT_AVAILABLE_LANGUAGES, and public/locales/*.json."
    );
  }

  return dictionary;
}

function normalizeBaseLanguage(language: string) {
  return language.split("-")[0].toLowerCase();
}

function getFallbackLanguage() {
  return process.env.NEXT_DEFAULT_LANGUAGE || "en-US";
}

function getSupportedLanguages() {
  const fallback = getFallbackLanguage();
  const configured = process.env.NEXT_AVAILABLE_LANGUAGES || fallback;

  return configured
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveSupportedLanguage(language: string, useFallback = true) {
  const fallback = getFallbackLanguage();
  const supported = getSupportedLanguages();
  const compact = language.trim().replace("_", "-");
  const exactMatch = supported.find(
    (item) => item.toLowerCase() === compact.toLowerCase()
  );

  if (exactMatch) {
    return exactMatch;
  }

  const normalizedLanguage = normalizeBaseLanguage(compact);
  const baseMatch = supported.find(
    (item) => normalizeBaseLanguage(item) === normalizedLanguage
  );

  if (baseMatch) {
    return baseMatch;
  }

  return useFallback ? fallback : undefined;
}

function loadDictionary(language: string) {
  const dictionaryPath = path.join(
    process.cwd(),
    "public",
    "locales",
    `${language}.json`
  );

  if (!existsSync(dictionaryPath)) {
    return undefined;
  }

  return JSON.parse(readFileSync(dictionaryPath, "utf-8")) as {
    metadata: {
      title: string;
      description: string;
    };
  } & Record<string, unknown>;
}
