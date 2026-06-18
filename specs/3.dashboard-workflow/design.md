# dashboard-workflow — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: tRPC API（packages/api）、前端路由（apps/web）

## 功能模块设计

### 模块 1: 统计 tRPC Router

新建 `packages/api/src/routers/stats.ts`，注册到 `routers/index.ts`。

**`stats.getOverview` procedure（protectedProcedure）**

返回结构：
```typescript
{
  total: number,
  thisWeek: number,
  streak: number,
  dailyTrend: Array<{ date: string; count: number }>,  // 近30天，每天一条
}
```

**查询实现思路：**

```typescript
// total
const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(problems);

// thisWeek（当前自然周 Mon 00:00 ~ Sun 23:59）
const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
const thisWeek = await db.select({ count: sql<number>`count(*)` })
  .from(problems)
  .where(gte(problems.date, format(monday, "yyyy-MM-dd")));

// dailyTrend：按 date 分组聚合
const grouped = await db.select({
  date: problems.date,
  count: sql<number>`count(*)`,
}).from(problems)
  .where(gte(problems.date, format(subDays(new Date(), 29), "yyyy-MM-dd")))
  .groupBy(problems.date);

// 前端补全零值（或在 API 层 fill gaps）

// streak：取所有 distinct date，在 API 层计算
const dates = await db.selectDistinct({ date: problems.date })
  .from(problems)
  .orderBy(desc(problems.date));
// 从今天或昨天起，连续倒推直到断开
```

日期计算引入 `date-fns`（轻量，已被很多 shadcn 项目使用；若未安装则 `pnpm add date-fns -F server`）。

### 模块 2: Dashboard 前端

改写 `apps/web/src/routes/_auth/dashboard.tsx`：

- `useQuery(trpc.stats.getOverview.queryOptions())`
- 三张统计卡片：使用 shadcn `<Card>`，图标用 `lucide-react`
- 折线图：`pnpm add recharts -F web`

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// dailyTrend 补零（API 返回30天有数据的行，前端 fill 零值）
const filled = fillGaps(data.dailyTrend, 30);  // 工具函数，生成连续30天数组

<ResponsiveContainer width="100%" height={200}>
  <LineChart data={filled}>
    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
    <YAxis allowDecimals={false} />
    <Tooltip />
    <Line type="monotone" dataKey="count" dot={false} />
  </LineChart>
</ResponsiveContainer>
```

### 模块 3: /workflow 前端页面

新建 `apps/web/src/routes/workflow.tsx`（公开路由，无需登录）：

- 安装 `mermaid`：`pnpm add mermaid -F web`
- 使用 `useEffect` 在客户端渲染 Mermaid（Mermaid 不支持 SSR）

```tsx
import mermaid from "mermaid";
import { useEffect, useRef } from "react";

const DIAGRAM = `
flowchart LR
  A[🔧 /dean:init\n初始化项目] --> B[📋 /dean:prd\n需求→Specs]
  B --> C[🤖 /dean:ai\nSpecs→代码]
  C --> D{验收}
  D -->|通过| E[✅ 交付]
  D -->|变更| B
`;

export function WorkflowPage() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    if (ref.current) mermaid.run({ nodes: [ref.current] });
  }, []);
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-8 text-2xl font-bold">AI 辅助开发工作流</h1>
      <div className="mermaid" ref={ref}>{DIAGRAM}</div>
    </div>
  );
}
```

路由注册：`/workflow`（不在 `_auth/` 下，无需登录即可访问）。

## 安全考虑

- `stats.getOverview` 使用 `protectedProcedure`
- /workflow 为公开静态展示页，无敏感数据

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| 折线图 | recharts | React 友好，轻量，shadcn 官方推荐方案 |
| 日期计算 | date-fns | 轻量、tree-shakeable，streak/week 计算方便 |
| Mermaid 渲染 | useEffect 客户端运行 | Mermaid 不支持 SSR，需浏览器环境 |
| streak 计算位置 | API 层（服务端） | 避免将全量 date 传到客户端再计算 |
