import { useState } from "react";
import styles from "./feedback.module.scss";

type FeedbackItem = {
  id: string;
  type: string;
  content: string;
  contact?: string | null;
  pageUrl?: string | null;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  user?: { phone: string } | null;
};

const STATUS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function FeedbackAdmin() {
  const [adminToken, setAdminToken] = useState("");
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/feedback", {
        headers: { "x-admin-token": adminToken },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message ?? "加载失败");
      }
      setFeedbacks(data.feedbacks);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string, adminNote?: string) {
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ status, adminNote }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setMessage(data.message ?? "更新失败");
      return;
    }
    setFeedbacks((items) =>
      items.map((item) => (item.id === id ? { ...item, status, adminNote } : item)),
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>反馈管理</h1>
          <p>查看并处理用户提交的体验、合规和产品反馈。</p>
        </div>
      </header>

      <main className={styles.panel}>
        <label>
          <span>管理员令牌</span>
          <div className={styles.row}>
            <input
              value={adminToken}
              type="password"
              placeholder="输入 ADMIN_TOKEN"
              onChange={(e) => setAdminToken(e.currentTarget.value)}
            />
            <button disabled={!adminToken || loading} onClick={load}>
              {loading ? "加载中" : "加载反馈"}
            </button>
          </div>
        </label>

        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.list}>
          {feedbacks.map((item) => (
            <article className={styles.item} key={item.id}>
              <div className={styles.itemHeader}>
                <strong>{item.type}</strong>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p>{item.content}</p>
              <div className={styles.meta}>
                <span>用户：{item.user?.phone ?? "未登录"}</span>
                <span>联系：{item.contact || "-"}</span>
              </div>
              <div className={styles.row}>
                <select
                  value={item.status}
                  onChange={(e) =>
                    updateStatus(item.id, e.currentTarget.value, item.adminNote ?? "")
                  }
                >
                  {STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  defaultValue={item.adminNote ?? ""}
                  placeholder="处理备注"
                  onBlur={(e) => updateStatus(item.id, item.status, e.currentTarget.value)}
                />
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
