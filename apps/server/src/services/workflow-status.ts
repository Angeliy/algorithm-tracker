export interface WorkflowStatus {
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

export const IDLE_STATUS: WorkflowStatus = {
	node: "idle",
	nodeLabel: "",
	status: "idle",
	updatedAt: new Date().toISOString(),
};
