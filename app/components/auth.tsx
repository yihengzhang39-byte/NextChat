import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Path, PRODUCT_BRAND_NAME } from "../constant";
import clsx from "clsx";

const FILING_TEST_CODE = "123456";

export function AuthPage(props: { filingTest?: boolean }) {
  const navigate = useNavigate();
  const filingTest = Boolean(props.filingTest);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const canSendCode = useMemo(() => /^1[3-9]\d{9}$/.test(phone), [phone]);
  const canLogin = canSendCode && /^\d{6}$/.test(code) && acceptedTerms;

  async function sendCode() {
    setMessage("");

    if (filingTest) {
      setMessage(`备案测试验证码为 ${FILING_TEST_CODE}`);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message ?? "验证码发送失败，请稍后重试");
      }
      setMessage(data.message ?? "验证码已发送");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "验证码发送失败，请稍后重试",
      );
    } finally {
      setSending(false);
    }
  }

  async function login() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        filingTest ? "/api/auth/filing-test-login" : "/api/auth/sms/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code, acceptedTerms }),
        },
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message ?? "登录失败");
      }
      navigate(Path.Chat);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={clsx(styles["auth-page"], styles["phone-auth-page"])}>
      <div className={styles["phone-auth-shell"]}>
        <section className={styles["phone-auth-brand"]}>
          <div>
            <div className={styles["phone-auth-kicker"]}>智能问答工作台</div>
            <h1 className={styles["auth-title"]}>{PRODUCT_BRAND_NAME}</h1>
            <p className={styles["auth-tips"]}>
              使用手机号验证码登录，进入安全、合规的智能问答服务。
            </p>
          </div>
          <div className={styles["phone-auth-highlights"]}>
            <span>企业数据隔离</span>
            <span>统一账号入口</span>
            <span>合规审计留痕</span>
          </div>
        </section>

        <section className={styles["phone-auth-card"]}>
          <div className={styles["phone-auth-card-head"]}>
            <h2>{filingTest ? "备案测试专用登录" : "手机号登录"}</h2>
            <span>
              {filingTest ? "验证码固定为 123456" : "验证码 5 分钟内有效"}
            </span>
          </div>

          <div className={styles["phone-auth-form"]}>
            <label className={styles["phone-auth-field"]}>
              <span>手机号</span>
              <input
                value={phone}
                type="tel"
                inputMode="tel"
                maxLength={11}
                placeholder="请输入手机号"
                onChange={(e) => setPhone(e.currentTarget.value.trim())}
              />
            </label>

            <label className={styles["phone-auth-field"]}>
              <span>验证码</span>
              <div className={styles["phone-auth-code"]}>
                <input
                  value={code}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6 位验证码"
                  onChange={(e) => setCode(e.currentTarget.value.trim())}
                />
                <button disabled={!canSendCode || sending} onClick={sendCode}>
                  {sending ? "发送中" : "获取验证码"}
                </button>
              </div>
            </label>

            <label className={styles["phone-auth-policy"]}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.currentTarget.checked)}
              />
              <span>
                我已阅读并同意
                <a
                  href="/#/legal/user-agreement"
                  target="_blank"
                  rel="noreferrer"
                >
                  用户协议
                </a>
                和
                <a
                  href="/#/legal/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  隐私政策
                </a>
              </span>
            </label>

            {message && (
              <div className={styles["phone-auth-message"]}>{message}</div>
            )}

            <IconButton
              className={styles["phone-auth-submit"]}
              text={loading ? "登录中" : "登录"}
              type="primary"
              disabled={!canLogin || loading}
              onClick={login}
            />

            {!filingTest && (
              <button
                className={styles["phone-auth-filing-link"]}
                onClick={() => navigate(Path.FilingTestAuth)}
              >
                备案测试专用
              </button>
            )}
          </div>
        </section>
      </div>
      {filingTest && (
        <IconButton
          className={styles["auth-return"]}
          text="返回"
          onClick={() => navigate(Path.Auth)}
        />
      )}
    </div>
  );
}
