import type { NavigateFunction } from "react-router-dom";
import { Path } from "../constant";
import { useChatStore } from "../store";

let loggingOut = false;

export async function logoutAndRedirect(navigate: NavigateFunction) {
  if (loggingOut) return;
  loggingOut = true;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("[auth] logout request failed", error);
  } finally {
    useChatStore.getState().resetForLogout();
    navigate(Path.Auth, { replace: true });
    loggingOut = false;
  }
}
