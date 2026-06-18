import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { ProblemForm, type ProblemFormValues } from "@/components/problem-form";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/problems/$id/edit")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data, isLoading } = useQuery(
		trpc.problem.getById.queryOptions({ id })
	);
	const update = useMutation(
		trpc.problem.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: [["problem", "list"]] });
				queryClient.invalidateQueries(
					trpc.problem.getById.queryOptions({ id })
				);
				toast.success("题目已更新");
				navigate({ to: "/problems/$id", params: { id } });
			},
			onError: (err) => toast.error(err.message),
		})
	);

	if (isLoading) {
		return <div className="p-6">加载中...</div>;
	}
	if (!data) {
		return <div className="p-6">题目不存在</div>;
	}

	const defaultValues: Partial<ProblemFormValues> = {
		title: data.title,
		source: data.source ?? undefined,
		difficulty: data.difficulty,
		date: data.date,
		timeSpent: data.timeSpent ?? undefined,
		isAc: data.isAc,
		note: data.note ?? undefined,
		tags: data.tags,
	};

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 font-bold text-2xl">编辑题目</h1>
			<ProblemForm
				defaultValues={defaultValues}
				onSubmit={async (values) => {
					await update.mutateAsync({ id, ...values });
				}}
				submitLabel="保存"
			/>
		</div>
	);
}
