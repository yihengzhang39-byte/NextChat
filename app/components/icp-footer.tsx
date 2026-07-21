import styles from "./auth.module.scss";

export function IcpFooter() {
  return (
    <footer className={styles["icp-footer"]}>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        苏ICP备2026049699号-1
      </a>
    </footer>
  );
}
