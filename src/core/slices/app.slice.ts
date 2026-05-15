import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { AuthUserInterface } from "@/core/interfaces/auth.interface";

type AuthMode = "session" | null;

interface AppState {
  currentUser: AuthUserInterface | null;
  authMode: AuthMode;
  isReady: boolean;
  isAuthenticating: boolean;
  error: string | null;
}

const initialState: AppState = {
  currentUser: null,
  authMode: null,
  isReady: false,
  isAuthenticating: true,
  error: null,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setAuthSession: (
      state,
      action: PayloadAction<{
        user: AuthUserInterface;
      }>
    ) => {
      state.currentUser = action.payload.user;
      state.authMode = "session";
      state.isReady = true;
      state.isAuthenticating = false;
      state.error = null;
    },
    setAuthStatus: (
      state,
      action: PayloadAction<{
        isReady?: boolean;
        isAuthenticating?: boolean;
        error?: string | null;
      }>
    ) => {
      if (action.payload.isReady !== undefined) {
        state.isReady = action.payload.isReady;
      }
      if (action.payload.isAuthenticating !== undefined) {
        state.isAuthenticating = action.payload.isAuthenticating;
      }
      if (action.payload.error !== undefined) {
        state.error = action.payload.error;
      }
    },
    resetAuth: (state) => {
      state.currentUser = null;
      state.authMode = null;
      state.isReady = false;
      state.isAuthenticating = false;
      state.error = null;
    },
  },
});

export const { resetAuth, setAuthSession, setAuthStatus } = appSlice.actions;

export default appSlice.reducer;
