# problem-records — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始任务 |

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo
- specs 路径: specs/2.problem-records/

## 任务列表

### 功能 1: DB Schema

- [x] T-001: 创建 `packages/db/src/schema/problem.ts`（`problems` 表 + `problem_tags` 表 + `difficultyEnum`），更新 `schema/index.ts` 导出，运行 `pnpm db:push` ~15min

### 功能 2: tRPC API

- [x] T-002: 创建 `packages/api/src/routers/problem.ts`，实现 `create`、`update`、`delete` procedure（含标签同步：先全删再全插），注册到 `routers/index.ts` ~30min
- [x] T-003: 在同一 router 添加 `list`（支持 difficulty/tag/isAc 过滤）和 `getById` procedure ~30min

### 功能 3: 前端页面

- [x] T-004: 安装 `react-markdown`；创建 `components/problem-form.tsx` 复用组件（所有字段 + 标签输入），新建 `routes/_auth/problems/new.tsx` 和 `routes/_auth/problems/$id.edit.tsx` 接入表单 ~30min
- [x] T-005: 创建 `routes/_auth/problems/index.tsx`：卡片列表 + 筛选栏（difficulty Select / tag Input / isAc RadioGroup），筛选参数通过 search params 传递 ~30min
- [x] T-006: 创建 `routes/_auth/problems/$id.tsx`：详情展示 + `react-markdown` 渲染笔记 + 编辑跳转 + 删除 AlertDialog ~15min

### 集成测试

- [x] T-007: 冒烟测试：新增→筛选→编辑→详情→删除完整链路，`pnpm check-types` 无错误 ~15min

## 依赖关系

- T-002 依赖 T-001（需先有表）
- T-003 依赖 T-001
- T-004、T-005、T-006 依赖 T-002、T-003
- T-007 依赖 T-001 ~ T-006
- 本 feature 整体依赖 `1.T-004`（登录流程验证完成）

## 风险点

- TanStack Router 文件式路由对嵌套目录有特定命名规范，`_auth/problems/` 下嵌套文件需参考已有路由结构
- 标签"先全删再全插"在标签数量为零时需特殊处理（不 insert 空数组）
