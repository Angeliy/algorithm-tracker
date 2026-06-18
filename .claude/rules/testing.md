---
description: 测试规范（当前项目尚未配置测试框架）
---

# 测试

## 当前状态
项目尚未配置测试框架（`package.json` 中无 vitest/jest 依赖）。Husky pre-commit 钩子运行 `pnpm test`，该命令目前未定义，需后续补充。

## 建议引入（待实施）
- **单元/组件测试**：Vitest + React Testing Library（适配 Vite 工具链）
- **E2E 测试**：Playwright

## 测试文件命名（参考规范）
- 单元测试：`*.test.ts` / `*.test.tsx`，与被测文件同目录
- 集成测试：放在 `tests/` 目录

## 约束
- 测试断言必须在 `it()` 或 `test()` 块内
- 不提交带 `.only` 或 `.skip` 的测试
- async 测试使用 `async/await`，不用 `done` 回调
