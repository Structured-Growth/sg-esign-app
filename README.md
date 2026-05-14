# sg-partnerships-contracts-app

Next.js application for displaying legal documents and recording user agreement decisions.

## Architecture

- `sg-auth-app` is used as the OAuth provider for interactive login and external bearer-token validation.
- `sg-legal-api` and `sg-account-api` are called only from Next.js server routes.
- Legal/account calls use a server-side OAuth access token received through `client_credentials`.
- `react-i18next` + `i18next` are used for UI localization with a local fallback dictionary and optional translations API.
- The app uses the same main frontend patterns as `sg-organization-admin-web-app`: App Router, MUI, NextAuth, Redux Toolkit, RTK Query.

## Main Flow

1. User opens `/document/[documentCode]`.
2. If `token` exists in the query string, the app validates it against `sg-auth-app` and loads the user profile.
3. If `token` is missing, the app starts OAuth login through `sg-auth-app`.
4. The frontend calls internal Next.js API routes under `/api/agreements/*`.
5. The server routes request or reuse a cached `client_credentials` access token and use it for `sg-legal-api` / `sg-account-api`.
6. The authenticated user is still resolved from NextAuth session or external bearer token, but document read/sign operations are executed with the service token.
7. User accepts or declines the document.
8. The app creates an agreement in `sg-legal-api` with status:
   - `active` for accept
   - `inactive` for decline

## Environment

Use `.env.example` as the baseline. Important variables:

- `NEXT_OAUTH_*` for `sg-auth-app`
- `NEXT_OAUTH_SERVICE_CLIENT_*` if service calls should use a dedicated OAuth client. If omitted, the app reuses `NEXT_OAUTH_CLIENT_*`, which works when that client also has `client_credentials`.
- `NEXT_DEFAULT_LANGUAGE`, `NEXT_AVAILABLE_LANGUAGES`, `NEXT_TRANSLATE_API_*` for i18n
- `NEXT_PUBLIC_LEGAL_API_URL` for `sg-legal-api`
- `NEXT_ACCOUNT_API_URL`, `NEXT_ACCOUNT_GROUP_IDS` for accept flow and group activation

## Commands

```bash
npm install
npm run dev
```
