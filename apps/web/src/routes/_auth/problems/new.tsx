import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { ProblemForm } from "@/components/problem-form";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/problems/new")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const create = useMutation(
		trpc.problem.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: [["problem", "list"]] });
				toast.success("题目已添加");
				navigate({ to: "/problems" });
			},
			onError: (err) => toast.error(err.message),
		})
	);

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 font-bold text-2xl">新增题目</h1>
			<ProblemForm
				onSubmit={async (values) => {
					await create.mutateAsync(values);
				}}
				submitLabel="添加"
			/>
		</div>
	);
}
