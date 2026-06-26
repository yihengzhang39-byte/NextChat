import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Path } from "../constant";
import { Markdown } from "./markdown";
import styles from "./legal-doc.module.scss";

const LEGAL_DOCS: Record<string, { path: string; fallbackTitle: string }> = {
  "user-agreement": {
    path: "/docs/user-agreement.md",
    fallbackTitle: "用户协议",
  },
  "privacy-policy": {
    path: "/docs/privacy-policy.md",
    fallbackTitle: "隐私政策",
  },
};

function getMarkdownTitle(content: string, fallback: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

export function LegalDocument() {
  const navigate = useNavigate();
  const { doc = "" } = useParams();
  const docConfig = LEGAL_DOCS[doc];
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!docConfig) {
      setContent("");
      setError("文档不存在");
      return;
    }

    setLoading(true);
    setError("");
    fetch(docConfig.path)
      .then((res) => {
        if (!res.ok) {
          throw new Error("文档加载失败");
        }
        return res.text();
      })
      .then(setContent)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "文档加载失败"),
      )
      .finally(() => setLoading(false));
  }, [docConfig]);

  const title = useMemo(
    () => getMarkdownTitle(content, docConfig?.fallbackTitle ?? "法律文档"),
    [content, docConfig?.fallbackTitle],
  );

  return (
    <div className={styles["legal-page"]}>
      <div className={styles["legal-header"]}>
        <button
          className={styles["legal-back"]}
          onClick={() => navigate(Path.Auth)}
        >
          返回登录
        </button>
        <div className={styles["legal-title"]}>{title}</div>
      </div>

      <main className={styles["legal-content"]}>
        {error ? (
          <div className={styles["legal-state"]}>{error}</div>
        ) : (
          <Markdown content={content} loading={loading} fontSize={15} />
        )}
      </main>
    </div>
  );
}
