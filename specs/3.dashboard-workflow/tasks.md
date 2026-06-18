# dashboard-workflow — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始任务 |

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo
- specs 路径: specs/3.dashboard-workflow/

## 任务列表

### 功能 1: 统计 API

- [x] T-001: 安装 `date-fns`（`-F server`）；创建 `packages/api/src/routers/stats.ts`，实现 `getOverview` procedure：total、thisWeek、streak（服务端计算）、dailyTrend（近30天按日聚合），注册到 `routers/index.ts` ~30min

### 功能 2: Dashboard 前端

- [x] T-002: 安装 `recharts`（`-F web`）；重写 `apps/web/src/routes/_auth/dashboard.tsx`，接入 `trpc.stats.getOverview`，渲染3张统计卡片（shadcn Card + lucide 图标） ~15min
- [x] T-003: 在 dashboard 添加30天趋势折线图（recharts LineChart），前端补零逻辑确保30天每天都有数据点 ~30min

### 功能 3: /workflow 页

- [x] T-004: 安装 `mermaid`（`-F web`）；创建 `apps/web/src/routes/workflow.tsx`，useEffect 渲染 init→prd→ai 三阶段 Mermaid 流程图，在 `__root.tsx` header 添加导航链接 ~15min

### 集成测试

- [x] T-005: 手动测试：新增若干题目，验证统计数字准确；访问 /workflow 页图正常渲染；`pnpm check-types` 无错误 ~15min

## 依赖关系

- T-001 依赖 `2.T-001`（problems 表存在）
- T-002、T-003 依赖 T-001
- T-004 独立，无外部依赖
- T-005 依赖 T-001 ~ T-004

## 风险点

- `date-fns` 的 `startOfWeek` 默认周日开始，需传 `{ weekStartsOn: 1 }` 改为周一
- Mermaid 在 Vite 开发模式下有时需要 `optimizeDeps.exclude: ["mermaid"]` 配置，避免 ESM 兼容问题
- recharts 与 React 19 的兼容性：若有 peer dep 警告，使用 `--legacy-peer-deps` 或检查最新版本
