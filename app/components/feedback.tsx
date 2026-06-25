import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { IconButton } from "./button";
import styles from "./feedback.module.scss";

const FEEDBACK_TYPES = ["体验问题", "模型回答", "合规建议", "功能建议", "其他"];

export function Feedback() {
  const navigate = useNavigate();
  const [type, setType] = useState(FEEDBACK_TYPES[0]);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content,
          contact,
          pageUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message ?? "提交失败");
      }
      setContent("");
      setMessage("已收到反馈，我们会尽快处理。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>意见反馈</h1>
          <p>欢迎反馈拟人化互动服务相关的体验、合规和产品建议。</p>
        </div>
        <IconButton text="返回聊天" onClick={() => navigate(Path.Chat)} />
      </header>

      <main className={styles.panel}>
        <label>
          <span>反馈类型</span>
          <select value={type} onChange={(e) => setType(e.currentTarget.value)}>
            {FEEDBACK_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>反馈内容</span>
          <textarea
            value={content}
            rows={8}
            maxLength={2000}
            placeholder="请描述你遇到的问题、风险或建议"
            onChange={(e) => setContent(e.currentTarget.value)}
          />
        </label>

        <label>
          <span>联系方式</span>
          <input
            value={contact}
            placeholder="可选，手机号/邮箱/微信"
            onChange={(e) => setContact(e.currentTarget.value)}
          />
        </label>

        {message && <div className={styles.message}>{message}</div>}

        <IconButton
          text={submitting ? "提交中" : "提交反馈"}
          type="primary"
          disabled={submitting || content.trim().length === 0}
          onClick={submit}
        />
      </main>
    </div>
  );
}
