# templates-links — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始任务 |

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo
- specs 路径: specs/5.templates-links/

## 任务列表

### 功能 1: DB Schema

- [x] T-001: 创建 `packages/db/src/schema/template.ts`（`templates` + `problem_links` 两张表），更新 `schema/index.ts`，运行 `pnpm db:push` ~15min

### 功能 2: tRPC API

- [x] T-002: 创建 `packages/api/src/routers/template.ts`，实现 `list`（type 过滤 + keyword ilike 搜索）、`create`、`update`、`delete`，注册到 `routers/index.ts` ~30min
- [x] T-003: 创建 `packages/api/src/routers/problemLink.ts`，实现 `add`（含 A<B 排序 + onConflictDoNothing）、`remove`、`getLinked`（OR 双向查询，返回完整 problem 含标签），注册到 `routers/index.ts` ~15min

### 功能 3: 前端页面

- [x] T-004: 创建 `routes/_auth/templates/index.tsx`：按 type 分组展示模板，顶部关键词搜索（debounce），每条模板内联 Dialog 编辑/删除 ~30min
- [x] T-005: 在 `packages/ui` 或 web 下添加模板新增/编辑 Dialog 表单组件（type + code + description 字段） ~15min
- [x] T-006: 扩展 `routes/_auth/problems/$id.tsx`：底部新增"关联题目"区域，含题目搜索下拉、已关联列表、移除按钮，接入 `trpc.problemLink.*` ~30min

### 集成测试

- [x] T-007: 冒烟测试：新增模板→搜索→编辑→删除；A关联B→B详情显示A→从A移除→B不再显示；`pnpm check-types` 无错误 ~15min

## 依赖关系

- T-001 依赖 `2.T-001`（problems 表存在，problem_links 引用它）
- T-002 依赖 T-001
- T-003 依赖 T-001
- T-004、T-005 依赖 T-002
- T-006 依赖 T-003
- T-007 依赖 T-001 ~ T-006

## 风险点

- `problem_links` 的 A < B 字符串排序约定必须在 `add` 和 `remove` 两处都执行，否则会出现查不到记录的 bug
- `Object.groupBy` 是 ES2024 API，若 TypeScript target 不够新，改用 `Array.reduce` 实现分组
- `trpc.problem.list` 扩展名称搜索时注意不要破坏 feature 2 已有的筛选逻辑（追加可选 `keyword` 参数）
