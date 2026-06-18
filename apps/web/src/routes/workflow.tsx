import { createFileRoute } from "@tanstack/react-router";
import mermaid from "mermaid";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/workflow")({
	component: WorkflowPage,
});

const DIAGRAM = `flowchart LR
  A["🔧 /dean:init\\n初始化项目"] --> B["📋 /dean:prd\\n需求→Specs"]
  B --> C["🤖 /dean:ai\\nSpecs→代码"]
  C --> D{验收}
  D -->|通过| E["✅ 交付"]
  D -->|变更| B`;

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
		</div>
	);
}
