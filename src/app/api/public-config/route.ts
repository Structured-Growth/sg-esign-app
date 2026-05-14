import { NextResponse } from "next/server";

export async function GET() {
  const translateApiUrl = process.env.NEXT_TRANSLATE_API_URL || "";
  const translateApiClientId = process.env.NEXT_TRANSLATE_API_CLIENT_ID || "";
  const defaultLanguage = process.env.NEXT_DEFAULT_LANGUAGE || "en-US";
  const availableLanguages =
    process.env.NEXT_AVAILABLE_LANGUAGES || defaultLanguage;

  return NextResponse.json(
    {
      translateApiUrl,
      translateApiClientId,
      defaultLanguage,
      supportedLngs: availableLanguages.split(",").map((item) => item.trim()),
    },
    {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
