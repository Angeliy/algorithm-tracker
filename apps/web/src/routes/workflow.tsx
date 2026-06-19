import { env } from "@algorithm-tracker/env/web";
import { createFileRoute } from "@tanstack/react-router";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/workflow")({
	component: WorkflowPage,
});

interface WorkflowStatus {
	featureId?: number;
	featureName?: string;
	featureProgress?: string;
	node: string;
	nodeLabel: string;
	status: "idle" | "in_progress" | "completed";
	taskId?: string;
	taskProgress?: string;
	taskTitle?: string;
	updatedAt: string;
}

const IDLE_STATUS: WorkflowStatus = {
	node: "idle",
	nodeLabel: "",
	status: "idle",
	updatedAt: "",
};

const NODES = [
	{ id: "M1", label: "初始化" },
	{ id: "M2", label: "进入 Feature" },
	{ id: "M3", label: "执行 Task" },
	{ id: "M4", label: "Review" },
	{ id: "M5", label: "标记完成" },
	{ id: "M6", label: "上下文管理" },
	{ id: "M7", label: "完成" },
] as const;

const NODE_IDS = NODES.map((n) => n.id);

function isWorkflowStatus(v: unknown): v is WorkflowStatus {
	if (typeof v !== "object" || v === null) {
		return false;
	}
	const o = v as Record<string, unknown>;
	return (
		typeof o.node === "string" &&
		typeof o.nodeLabel === "string" &&
		(o.status === "idle" ||
			o.status === "in_progress" ||
			o.status === "completed") &&
		typeof o.updatedAt === "string"
	);
}

const SSE_URL = `${env.VITE_SERVER_URL}/api/workflow/stream`;
const STATUS_URL = `${env.VITE_SERVER_URL}/api/workflow/status`;

const DIAGRAM = `flowchart LR
  A["🔧 /dean:init\\n初始化项目"] --> B["📋 /dean:prd\\n需求→Specs"]
  B --> C["🤖 /dean:ai\\nSpecs→代码"]
  C --> D{验收}
  D -->|通过| E["✅ 交付"]
  D -->|变更| B`;

interface StatusGridProps {
	status: WorkflowStatus;
}

function StatusGrid({ status }: StatusGridProps) {
	const currentIdx = NODE_IDS.indexOf(status.node as (typeof NODE_IDS)[number]);

	return (
		<div className="mt-8 rounded-lg border">
			<div className="border-b px-4 py-3">
				<h2 className="font-semibold text-sm">/dean:ai 实时进度</h2>
			</div>
			<div className="divide-y">
				{NODES.map((node, idx) => {
					const isCurrent = status.node === node.id;
					const isCompleted =
						currentIdx !== -1 &&
						(idx < currentIdx || (isCurrent && status.status === "completed"));

					let badge: string;
					let badgeClass: string;
					if (isCompleted) {
						badge = "已完成";
						badgeClass = "bg-green-100 text-green-700";
					} else if (isCurrent && status.status === "in_progress") {
						badge = "进行中";
						badgeClass = "bg-blue-100 text-blue-700";
					} else {
						badge = "待机";
						badgeClass = "bg-muted text-muted-foreground";
					}

					return (
						<div
							className={`flex flex-wrap items-start gap-4 px-4 py-3 ${isCurrent ? "bg-muted/40" : ""}`}
							key={node.id}
						>
							<span className="w-8 shrink-0 font-mono text-muted-foreground text-xs">
								{node.id}
							</span>
							<span className="flex-1 text-sm">{node.label}</span>
							<span
								className={`rounded px-2 py-0.5 font-medium text-xs ${badgeClass}`}
							>
								{badge}
							</span>
							{isCurrent && status.status === "in_progress" && (
								<div className="mt-0.5 w-full pl-12 text-muted-foreground text-xs">
									{status.featureName && (
										<span>
											Feature: {status.featureName}
											{status.featureProgress
												? ` (${status.featureProgress})`
												: ""}
										</span>
									)}
									{status.taskTitle && (
										<span className="ml-3">
											Task: {status.taskTitle}
											{status.taskProgress ? ` (${status.taskProgress})` : ""}
										</span>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
			{status.status === "idle" && (
				<div className="px-4 py-3 text-center text-muted-foreground text-xs">
					等待 /dean:ai 启动...
				</div>
			)}
		</div>
	);
}

function WorkflowStatusPanel() {
	const [status, setStatus] = useState<WorkflowStatus>(IDLE_STATUS);

	useEffect(() => {
		let closed = false;
		const refreshStatus = async () => {
			try {
				const res = await fetch(STATUS_URL);
				if (!res.ok) {
					return;
				}
				const parsed: unknown = await res.json();
				if (!closed && isWorkflowStatus(parsed)) {
					setStatus(parsed);
				}
			} catch {
				// keep the last known status
			}
		};

		const es = new EventSource(SSE_URL);
		es.addEventListener("status", (e) => {
			try {
				const parsed: unknown = JSON.parse(e.data);
				if (isWorkflowStatus(parsed)) {
					setStatus(parsed);
				}
			} catch {
				// ignore malformed JSON
			}
		});
		const initialStatusTimer = window.setTimeout(refreshStatus, 1500);
		const pollingTimer = window.setInterval(refreshStatus, 2000);

		return () => {
			closed = true;
			es.close();
			window.clearTimeout(initialStatusTimer);
			window.clearInterval(pollingTimer);
		};
	}, []);

	return <StatusGrid status={status} />;
}

function WorkflowPage() {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		mermaid.initialize({ startOnLoad: false, theme: "neutral" });
		if (ref.current) {
			mermaid.run({ nodes: [ref.current] });
		}
	}, []);

	return (
		<div className="mx-auto max-w-3xl px-6 py-12">
			<h1 className="mb-8 font-bold text-2xl">AI 辅助开发工作流</h1>
			<p className="mb-8 text-muted-foreground">
				本项目使用三阶段 AI 辅助开发流程：初始化项目结构、生成需求规格、再由 AI
				自动实现所有功能。
			</p>
			<div className="mermaid" ref={ref}>
				{DIAGRAM}
			</div>
			<WorkflowStatusPanel />
		</div>
	);
}
