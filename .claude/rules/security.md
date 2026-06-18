---
description: 安全规范：密钥处理、环境变量、敏感文件管控
---

# 安全规范

## 环境变量
- **禁止**硬编码任何密钥、数据库 URL、API Token
- 所有环境变量通过 `@algorithm-tracker/env` 包访问——该包用 Zod 校验，启动时立即失败并给出明确错误
- 前端使用 `@algorithm-tracker/env` 的 client 导出，服务端使用 server 导出
- `.env` 文件已在 `.gitignore` 中排除，不得提交

## 敏感文件
已通过 `.gitignore` 排除的文件类型，严禁提交：
- `.env` / `.env*.local`
- `*.log`
- `dist/`、`node_modules/`

## API 安全
- tRPC protectedProcedure 会校验 session，需要认证的操作必须用 `protectedProcedure`
- CORS 已在服务端限制 origin 为 `env.CORS_ORIGIN`，不得改为 `*`
- 使用 `target="_blank"` 的链接必须加 `rel="noopener noreferrer"`

## 其他
- 不使用 `eval()`、`dangerouslySetInnerHTML`
- 不直接操作 `document.cookie`
