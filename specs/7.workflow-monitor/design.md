# workflow-monitor — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-19 | v1   | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: `.claude/commands/dean/ai.md`（技能）、后端 Hono endpoint、前端 React 组件

---

## 功能模块设计

### 模块 1: workflow-status.json 状态文件

**文件路径**：`specs/workflow-status.json`（相对于项目根目录）

**JSON Schema：**
```json
{
  "node": "M3",
  "nodeLabel": "执行 Task",
  "featureId": 6,
  "featureName": "leetcode-sync",
  "featureProgress": "6/6",
  "taskId": "T-004",
  "taskTitle": "同步 Service (runSync)",
  "taskProgress": "4/7",
  "status": "in_progress",
  "updatedAt": "2026-06-19T10:30:00.000Z"
}
```

**TypeScript 类型**（在 `apps/server/src/services/workflow-status.ts` 中定义）：
```ts
export type WorkflowStatus = {
  node: string;          // "M1" | "M2" | ... | "M7" | "idle"
  nodeLabel: string;     // 节点名称，如 "初始化"
  featureId?: number;
  featureName?: string;
  featureProgress?: string; // e.g. "2/6"
  taskId?: string;       // e.g. "T-003"
  taskTitle?: string;
  taskProgress?: string; // e.g. "3/7"
  status: "idle" | "in_progress" | "completed";
  updatedAt: string;     // ISO 8601
};

export const IDLE_STATUS: WorkflowStatus = {
  node: "idle",
  nodeLabel: "",
  status: "idle",
  updatedAt: new Date().toISOString(),
};
```

**写入时机**（由 `/dean:ai` 技能负责）：
- M1 开始：`{ node:"M1", nodeLabel:"初始化", status:"in_progress", ... }`
- M1 完成：`{ node:"M1", nodeLabel:"初始化", status:"completed", ... }`
- M2-M6 同理
- M7 完成后：写 `IDLE_STATUS` 重置

---

### 模块 2: 后端 SSE Endpoint

**文件**：`apps/server/src/app.ts`（新增路由）

**接口**：`GET /api/workflow/stream`

**实现思路：**
```ts
import { readFileSync, watch } from "node:fs";
import { streamSSE } from "hono/streaming";

const STATUS_FILE = path.resolve(process.cwd(), "specs/workflow-status.json");

app.get("/api/workflow/stream", (c) => {
  return streamSSE(c, async (stream) => {
    // 1. 立即推送当前状态
    const send = () => {
      try {
        const raw = readFileSync(STATUS_FILE, "utf-8");
        stream.writeSSE({ data: raw, event: "status" });
      } catch {
        stream.writeSSE({
          data: JSON.stringify({ status: "idle" }),
          event: "status",
        });
      }
    };

    send();

    // 2. 监听文件变化
    const watcher = watch(STATUS_FILE, { persistent: false }, () => send());

    // 3. 保活心跳（每 30 秒）
    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: "", event: "ping" });
    }, 30_000);

    // 4. 客户端断开时清理
    stream.onAbort(() => {
      watcher.close();
      clearInterval(heartbeat);
    });
  });
});
```

**说明：**
- `hono/streaming` 的 `streamSSE` 内建 SSE 响应头 (`Content-Type: text/event-stream`)
- `fs.watch` 是 Node.js 内建模块，无需新依赖
- 文件不存在时 catch 并推送 `{ status: "idle" }`，不崩溃
- 心跳防止代理/浏览器断开连接

**CORS 兼容**：`GET /api/workflow/stream` 走 `/*` CORS 中间件，已覆盖 `GET`，无需额外配置。

---

### 模块 3: 前端 /workflow 页面升级

**文件**：`apps/web/src/routes/workflow.tsx`

**EventSource 接入**：
```ts
import { env } from "@algorithm-tracker/env/web";

// EventSource URL 拼接
const SSE_URL = `${env.VITE_SERVER_URL}/api/workflow/stream`;
```

**状态管理**（module-level 组件拆分，规避 cognitive complexity > 20）：

```tsx
// WorkflowStatusPanel: 独立组件，负责 EventSource + 状态展示
function WorkflowStatusPanel() {
  const [status, setStatus] = useState<WorkflowStatus>({ status: "idle", ... });

  useEffect(() => {
    const es = new EventSource(SSE_URL);
    es.addEventListener("status", (e) => {
      try { setStatus(JSON.parse(e.data)); } catch { /* ignore */ }
    });
    return () => es.close();
  }, []);

  return <StatusGrid status={status} />;
}
```

**节点展示列表**（静态定义）：
```ts
const NODES = [
  { id: "M1", label: "初始化" },
  { id: "M2", label: "进入 Feature" },
  { id: "M3", label: "执行 Task" },
  { id: "M4", label: "Review" },
  { id: "M5", label: "标记完成" },
  { id: "M6", label: "上下文管理" },
  { id: "M7", label: "完成" },
];
```

每个节点显示：
- 节点 ID + 标签
- 状态徽章：`待机`（灰）/ `进行中`（蓝）/ `已完成`（绿）
- 若当前节点 → 额外显示 feature 进度 + task 进度

---

### 模块 4: /dean:ai 技能写状态

**文件**：`.claude/commands/dean/ai.md`

在 `/dean:ai` 技能的每个节点说明（M1-M7）末尾追加写状态文件的指令：

```markdown
**状态写入（每节点必须执行）：** 进入本节点时，使用 Write 工具将以下内容写入 `specs/workflow-status.json`：
\`\`\`json
{
  "node": "M{N}",
  "nodeLabel": "{节点名}",
  "featureId": {当前 feature 序号或 0},
  "featureName": "{feature 名称或空字符串}",
  "featureProgress": "{已完成序号}/{总序号}",
  "taskId": "{当前 taskId 或空字符串}",
  "taskTitle": "{task 标题或空字符串}",
  "taskProgress": "{已完成任务数}/{总任务数}",
  "status": "in_progress",
  "updatedAt": "{ISO 8601 时间戳}"
}
\`\`\`
节点完成后，将 `"status"` 改为 `"completed"` 再写一次。M7 完成后额外写 `{ "status": "idle", "node": "idle", "nodeLabel": "", "updatedAt": "..." }` 重置。
```

---

## 接口契约

| 接口 | 类型 | 认证 | 说明 |
|---|---|---|---|
| `GET /api/workflow/stream` | HTTP SSE | 无 | 推送 WorkflowStatus JSON |

SSE 事件格式：
```
event: status
data: {"node":"M3","nodeLabel":"执行 Task","status":"in_progress",...}

event: ping
data:

```

---

## 数据模型

无新增 DB 表。状态持久化通过文件系统（`specs/workflow-status.json`），随 `/dean:ai` 执行写入，无需数据库。

---

## 安全考虑

- SSE 接口无认证（与 `/workflow` 页面一致，均为公开展示页）
- 仅读取 `specs/workflow-status.json`，无 path traversal 风险（路径硬编码）
- `fs.watch` 只监听单一文件，不暴露目录

---

## 技术决策

| 决策 | 选项 | 理由 |
|---|---|---|
| SSE vs WebSocket | SSE（单向推送）| 状态只需服务端→客户端单向推送，SSE 更简单；`hono/streaming` 内建支持 |
| 文件监听 vs 轮询 | `fs.watch` | 零延迟响应、零 CPU 占用；轮询会产生不必要延迟和 CPU 消耗 |
| 状态存储 | JSON 文件 | `/dean:ai` 是 Claude 写入，Write 工具直接写文件最简单；无需数据库 |
| URL 构造 | `env.VITE_SERVER_URL` | 与现有 tRPC client 保持一致，已有 `.env` 配置 |
| 认证 | 无 | `/workflow` 在 `_auth` 布局外，与现有路由设计一致 |
