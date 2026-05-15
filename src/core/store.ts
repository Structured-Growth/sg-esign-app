import { configureStore } from "@reduxjs/toolkit";
import { legalApi } from "@/core/api/legal.api";
import appSlice from "@/core/slices/app.slice";

export const store = configureStore({
  reducer: {
    app: appSlice,
    [legalApi.reducerPath]: legalApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(legalApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
