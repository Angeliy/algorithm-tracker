---
description: Git 工作流：commit 规范、pre-commit 钩子、分支约定
---

# Git 工作流

## Pre-commit 钩子
Husky 在每次提交前自动运行 `ultracite fix`，格式化所有暂存文件并重新 `git add`。若存在无法自动修复的 lint 问题，提交会被拒绝。

## Commit Message 规范
使用 Conventional Commits 格式：
```
<type>(<scope>): <summary>

# type: feat | fix | refactor | chore | docs | test | style | ci
# scope（可选）: web | server | db | auth | ui | api
```

示例：
- `feat(web): add algorithm difficulty filter`
- `fix(server): handle unauthenticated tRPC calls`
- `chore(db): add createdAt to todo schema`

## 分支命名
- 功能：`feat/<short-description>`
- 修复：`fix/<short-description>`
- 主分支：`main`

## 不提交的内容
- `.env` 文件（已在 `.gitignore`）
- `apps/web/src/routeTree.gen.ts`（自动生成，已在 `.gitignore`）
- `dist/`、`node_modules/`、`.turbo/`
