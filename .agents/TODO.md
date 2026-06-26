# TODO

## Immediate (2026-06-26)

- [x] 获取百度文心 Secret Key，补充 `.env` 配置 → **已确认：新版 bce-v3 key 本身就是 Bearer Token，无需 Secret Key**
- [x] `app/constant.ts`: 将 `ernie-5.0` 加入 `baiduModels` + 更新 `Baidu.ChatPath`
- [x] `.env`: 写入 `BAIDU_API_KEY` / `BAIDU_SECRET_KEY`，设 `DEFAULT_MODEL=ernie-5.0@Baidu`
- [x] `app/store/access.ts`: 默认 `provider` 改为 `ServiceProvider.Baidu`
- [x] `yarn dev` 启动验证聊天功能可用
- [x] 验证通过后创建 feature 分支提交 → **直接在 main 提交并推送** (commit 260d9aed)

## Short-term

- [x] 本机 Docker 全栈跑通（postgres + app，localhost:3000，ERNIE 5.0 端到端验证）
- [ ] 让容器启动时自动应用 Prisma 迁移（当前 Dockerfile CMD 只跑 `node server.js`，需手动 `migrate deploy`）
- [ ] 获取讯飞星火最新模型 API Key，切回讯飞作为默认 provider
- [ ] 简化 UI：移除模型切换下拉框，隐藏 Settings 中的 Provider 选择（像 DeepSeek 网页端，只服务单一模型）
- [ ] 替换占位协议和隐私政策内容
- [ ] 配置阿里云短信凭证
- [ ] 修复 ESLint pre-commit hook 的 `unused-imports` 规则 bug（`eslint-rule-composer` 版本兼容问题）

## Later

- Decide whether this fork will regularly sync upstream changes.
- Add project-specific deployment notes.
- Add environment variable documentation based on the final deployment target.
- Document the `.env` setup flow in README or project docs (note: `.env` is gitignored).
