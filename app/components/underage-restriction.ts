import type { NavigateFunction } from "react-router-dom";
import { Path } from "../constant";
import { useChatStore } from "../store";
import { showAlert } from "./ui-lib";

let handling = false;

export async function handleUnderageRestriction(navigate: NavigateFunction) {
  if (handling) return;
  handling = true;
  try {
    await showAlert(
      "暂不符合使用年龄要求",
      "当前实名信息显示您未满18周岁，暂不能使用本服务。",
      "我知道了",
    );
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      useChatStore.getState().resetForLogout();
      navigate(Path.Auth, { replace: true });
    }
  } finally {
    handling = false;
  }
}
