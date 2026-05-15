import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query";
import { signOut } from "next-auth/react";
import { prepareAuthenticationHeaders } from "@/core/helpers/prepare-authentication-headers";
import { resetAuth } from "@/core/slices/app.slice";

export const createAuthenticatedBaseQuery = (
  baseUrl: string
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
  const baseQuery = fetchBaseQuery({
    baseUrl,
    responseHandler: "json",
    prepareHeaders: prepareAuthenticationHeaders,
  });

  return async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      api.dispatch(resetAuth());

      if (typeof window !== "undefined") {
        signOut();
      }
    }

    return result;
  };
};
