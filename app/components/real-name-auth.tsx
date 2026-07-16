import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Path, PRODUCT_BRAND_NAME } from "../constant";
import { IconButton } from "./button";
import styles from "./auth.module.scss";
import { logoutAndRedirect } from "./auth-logout";
import { handleUnderageRestriction } from "./underage-restriction";

const reasonMessages: Record<string, string> = {
  invalid_real_name: "请输入正确的真实姓名",
  invalid_id_number: "请输入正确的 18 位居民身份证号码",
  identity_mismatch: "姓名与身份证号码不一致",
  invalid_idcard: "身份证号不符合规则，请重新输入",
  identity_service_unavailable: "实名认证服务暂时不可用，请稍后重试",
  identity_config_error: "实名认证服务配置异常，请联系管理员",
  already_verified: "您已完成实名认证",
  verification_in_progress: "实名认证正在处理中，请稍候",
  rate_limited: "认证操作频繁，请稍后再试",
  id_number_already_bound: "该身份证号码已绑定其他账号",
};

export function RealNameAuthPage() {
  const navigate = useNavigate();
  const [realName, setRealName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const canSubmit = useMemo(
    () =>
      realName.trim().length >= 2 &&
      /^\d{17}[\dXx]$/.test(idNumber.trim()),
    [idNumber, realName],
  );

  async function verify() {
    if (verified) return navigate(Path.Chat);
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/identity/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          realName: realName.trim(),
          idNumber: idNumber.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          reasonMessages[data.reason] ?? data.message ?? "实名认证失败，请稍后重试",
        );
      }
      if (data.reason === "underage_restricted") {
        await handleUnderageRestriction(navigate);
        return;
      }
      setVerified(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "实名认证失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function returnToLogin() {
    if (leaving) return;
    setLeaving(true);
    await logoutAndRedirect(navigate);
  }

  return (
    <div className={clsx(styles["auth-page"], styles["phone-auth-page"])}>
      <div className={styles["phone-auth-shell"]}>
        <section className={styles["phone-auth-brand"]}>
          <div>
            <div className={styles["phone-auth-kicker"]}>账号安全</div>
            <h1 className={styles["auth-title"]}>实名认证</h1>
            <p className={styles["auth-tips"]}>
              完成姓名与居民身份证号码核验后，即可进入{PRODUCT_BRAND_NAME}。
            </p>
          </div>
          <div className={styles["phone-auth-highlights"]}>
            <span>信息加密存储</span>
            <span>账号实名绑定</span>
            <span>聊天访问保护</span>
          </div>
        </section>

        <section className={styles["phone-auth-card"]}>
          <div className={styles["phone-auth-card-head"]}>
            <h2>实名认证</h2>
            <span>当前仅支持中国大陆 18 位居民身份证</span>
          </div>
          <div className={styles["phone-auth-form"]}>
            <label className={styles["phone-auth-field"]}>
              <span>真实姓名</span>
              <input
                value={realName}
                type="text"
                maxLength={50}
                autoComplete="off"
                placeholder="请输入真实姓名"
                disabled={verified}
                onChange={(event) => setRealName(event.currentTarget.value)}
              />
            </label>
            <label className={styles["phone-auth-field"]}>
              <span>身份证号码</span>
              <input
                value={idNumber}
                type="text"
                inputMode="text"
                maxLength={18}
                autoComplete="off"
                placeholder="请输入 18 位身份证号码"
                disabled={verified}
                onChange={(event) => setIdNumber(event.currentTarget.value)}
              />
            </label>
            {message && (
              <div className={styles["phone-auth-message"]}>{message}</div>
            )}
            <IconButton
              className={styles["phone-auth-submit"]}
              text={verified ? "认证成功，进入系统" : loading ? "认证中" : "提交认证"}
              type="primary"
              disabled={loading || (!verified && !canSubmit)}
              onClick={verify}
            />
          </div>
        </section>
      </div>
      <IconButton
        className={styles["auth-return"]}
        text="返回"
        disabled={leaving}
        onClick={returnToLogin}
      />
    </div>
  );
}
