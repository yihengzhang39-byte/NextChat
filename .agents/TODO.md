# TODO

## Production domain verification (2026-07-21)

- [ ] Confirm `iflyfuture.com` DNS resolves to `47.99.218.161`, ports 80/443 are open, Nginx uses `server_name iflyfuture.com`, HTTPS is valid, and HTTP redirects to HTTPS.
- [ ] Open the production formal login, filing-test login, and real-name pages; confirm the bottom `苏ICP备2026049699号-1` link opens the MIIT filing site without obscuring controls on desktop or mobile.
- [ ] Confirm domain login, real-name verification, and chat work with the existing relative API paths.

## Mock age-profile follow-up (2026-07-16)

- [ ] In a non-production local environment only, manually verify the configured Mock adult and minor profiles, including the common Shanghai birthday calculation and underage logout flow.
- [ ] Confirm that production, Aliyun Market, formal SMS, filing-test login, invalid Mock configuration, and non-placeholder identity input continue to use strict normal validation.
- [ ] Confirm placeholder verification stores no identity ciphertext, HMAC, last-four, real-name verification timestamp, or provider request ID.

## Adult access follow-up (2026-07-16)

- [ ] Apply `20260716130000_add_adult_chat_access` after existing Prisma migrations and run Prisma Client generation locally.
- [ ] Manually verify adult, minor, Shanghai birthday-boundary, and Feb 29 age outcomes through both formal SMS and filing-test login.
- [ ] Verify one underage alert/logout only, repeated login interception, and 403 `underage_restricted` responses for Iflytek and ChatSession/ChatFile APIs.
- [ ] Verify the ten preseeded filing-test accounts enter chat directly while a non-preseeded filing-test phone still completes real-name and age checks.

## Real-name verification follow-up (2026-07-15)

- [x] Select the 贵州数据宝 Aliyun Market ID two-element verification provider.
- [x] Implement the real `IdentityVerificationProvider` and map vendor errors to internal results. Production credentials still need local configuration.
- [ ] Rebuild the app, submit one real verification manually, and inspect the safe provider failure diagnostics if it does not verify.
- [ ] Complete real name/ID consistency integration testing and disable Mock in production.
- [ ] Complete security/privacy compliance review.
- [ ] Reinitialize the database, apply migrations/generate Prisma Client, and run local verification for the full flow.

## Immediate (2026-06-26)

- [x] 获取百度文心 Secret Key，补充 `.env` 配置 → **已确认：新版 bce-v3 key 本身就是 Bearer Token，无需 Secret Key**
- [x] `app/constant.ts`: 将 `ernie-5.0` 加入 `baiduModels` + 更新 `Baidu.ChatPath`
- [x] `.env`: 写入 `BAIDU_API_KEY` / `BAIDU_SECRET_KEY`，设 `DEFAULT_MODEL=ernie-5.0@Baidu`
- [x] `app/store/access.ts`: 默认 `provider` 改为 `ServiceProvider.Baidu`
- [x] `yarn dev` 启动验证聊天功能可用
- [x] 验证通过后创建 feature 分支提交 → **直接在 main 提交并推送** (commit 260d9aed)

## Short-term

- [x] 本机 Docker 全栈跑通（postgres + app，localhost:3000，ERNIE 5.0 端到端验证）
- [x] ERNIE 5.0 图片上传（多模态）+ 上传失败 base64 兜底
- [x] 品牌化：文案/元数据/manifest 改为 星跃 Chat，替换全套 logo 与 favicon
- [x] 替换占位协议和隐私政策内容（`public/docs/*.md`，源 docx 在仓库根目录）
- [ ] **logo 源图升级**：当前 `星跃icon.png` 仅 43×40，大尺寸 PWA 图标（192/512）模糊，需 ≥512px 源图重新生成
- [ ] 让容器启动时自动应用 Prisma 迁移（当前 Dockerfile CMD 只跑 `node server.js`，需手动 `migrate deploy`）
- [x] 接入讯飞图像理解 WebSocket API（服务端签名代理，已对齐 imagev4 请求结构并修复空响应收尾）
- [ ] 用户运行 Docker 重建并在真实网页上传图片验证 `image@Iflytek` 图片问答
- [ ] 获取/确认讯飞文本聊天模型能力，再决定是否把普通文本默认链路从 Baidu 切到 Iflytek
- [ ] 简化 UI：移除模型切换下拉框，隐藏 Settings 中的 Provider 选择（像 DeepSeek 网页端，只服务单一模型）
- [ ] 填写生产阿里云短信 AccessKey 并本地验证真实短信发送
- [ ] 修复 ESLint pre-commit hook 的 `unused-imports` 规则 bug（`eslint-rule-composer` 版本兼容问题）

## Later

- Decide whether this fork will regularly sync upstream changes.
- Add project-specific deployment notes.
- Add environment variable documentation based on the final deployment target.
- Document the `.env` setup flow in README or project docs (note: `.env` is gitignored).

## Real-name verification follow-up

- [ ] Apply migration 20260716090000_add_identity_verification_attempts.
- [ ] Manually validate results 1, 2, SYSTEM_042, service failure, and rate limiting in deployment.
- [ ] Run parser tests and Docker build in deployment; Codex made no real provider call.

## Local identity validation follow-up

- [ ] Rebuild deployment and verify a valid local ID passes validation and reaches the configured provider.
- [ ] Verify invalid format, date, and checksum values remain blocked locally without a provider call.
