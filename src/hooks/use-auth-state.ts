import { useAppSelector } from "@/hooks/use-app-selector";

export function useAuthState() {
  const currentUser = useAppSelector((state) => state.app.currentUser);
  const authMode = useAppSelector((state) => state.app.authMode);
  const authError = useAppSelector((state) => state.app.error);
  const isReady = useAppSelector((state) => state.app.isReady);
  const isAuthenticating = useAppSelector((state) => state.app.isAuthenticating);

  return {
    user: currentUser,
    authMode,
    error: authError,
    isReady,
    isAuthenticating
  };
}
