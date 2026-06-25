# TODO

## Immediate (2026-06-26)

- [ ] 获取百度文心 Secret Key，补充 `.env` 配置
- [ ] `app/constant.ts`: 将 `ernie5.0` 加入 `baiduModels` + 更新 `Baidu.ChatPath`
- [ ] `.env`: 写入 `BAIDU_API_KEY` / `BAIDU_SECRET_KEY`，设 `DEFAULT_MODEL=ernie5.0@Baidu`
- [ ] `app/store/access.ts`: 默认 `provider` 改为 `ServiceProvider.Baidu`
- [ ] `yarn dev` 启动验证聊天功能可用
- [ ] 验证通过后创建 feature 分支提交

## Short-term

- [ ] 获取讯飞星火最新模型 API Key，切回讯飞作为默认 provider
- [ ] 简化 UI：移除模型切换下拉框，隐藏 Settings 中的 Provider 选择（像 DeepSeek 网页端，只服务单一模型）
- [ ] 替换占位协议和隐私政策内容
- [ ] 配置阿里云短信凭证

## Later

- Decide whether this fork will regularly sync upstream changes.
- Add project-specific deployment notes.
- Add environment variable documentation based on the final deployment target.
