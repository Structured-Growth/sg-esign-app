import { createApi } from "@reduxjs/toolkit/query/react";
import { legalQuery } from "@/core/helpers/legal-query";
import {
  AcceptAgreementResponseInterface,
  AgreementInterface,
  CheckAgreementParamsInterface,
  CheckAgreementResponseInterface,
  CreateAgreementRequestInterface,
} from "@/core/interfaces/legal.interface";

export const legalApi = createApi({
  reducerPath: "legalApi",
  baseQuery: legalQuery,
  tagTypes: ["AgreementCheck"],
  endpoints: (builder) => ({
    checkAgreement: builder.query<
      CheckAgreementResponseInterface,
      CheckAgreementParamsInterface
    >({
      query: ({ documentCode }) => ({
        url: "/agreements/check",
        params: {
          documentCode,
        },
      }),
      providesTags: (_result, _error, args) => [
        {
          type: "AgreementCheck",
          id: `${args.accountId}:${args.documentCode}`,
        },
      ],
    }),
    createAgreement: builder.mutation<
      AgreementInterface,
      CreateAgreementRequestInterface
    >({
      query: (body) => ({
        url: "/agreements",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgreementCheck"],
    }),
    acceptAgreement: builder.mutation<
      AcceptAgreementResponseInterface,
      CreateAgreementRequestInterface
    >({
      query: (body) => ({
        url: "/agreements/accept",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgreementCheck"],
    }),
  }),
});

export const {
  useCheckAgreementQuery,
  useCreateAgreementMutation,
  useAcceptAgreementMutation,
} = legalApi;
