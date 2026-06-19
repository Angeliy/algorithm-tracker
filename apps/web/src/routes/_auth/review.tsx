import { Button } from "@algorithm-tracker/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@algorithm-tracker/ui/components/card";
import { Pagination } from "@algorithm-tracker/ui/components/pagination";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/review")({
	component: ReviewPage,
});

const DIFFICULTY_LABEL: Record<string, string> = {
	easy: "简单",
	medium: "中等",
	hard: "困难",
};

const DIFFICULTY_COLOR: Record<string, string> = {
	easy: "bg-green-100 text-green-700",
	medium: "bg-yellow-100 text-yellow-700",
	hard: "bg-red-100 text-red-700",
};

const REVIEW_TOTAL = 5;

function ReviewPage() {
	const [page, setPage] = useState(1);

	const { data, isLoading } = useQuery(
		trpc.review.getPending.queryOptions({ page })
	);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	const completeReview = useMutation(
		trpc.review.completeReview.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(
					trpc.review.getPending.queryOptions({ page })
				);
				toast.success("已完成本次复习");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	if (isLoading) {
		return <div className="p-6 text-muted-foreground">加载中...</div>;
	}

	return (
		<div className="py-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl tracking-tight">错题本</h1>
					<p className="mt-1 text-muted-foreground text-sm">艾宾浩斯复习计划</p>
				</div>
				<span className="text-muted-foreground text-sm">
					{total > 0 ? `${total} 题待复习` : "暂无待复习题目"}
				</span>
			</div>

			{items.length === 0 && (
				<div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
					<BookOpen aria-hidden="true" className="h-10 w-10 opacity-40" />
					<p>今日无待复习题目，继续保持！</p>
					<Link to="/problems">
						<Button variant="outline">去题目列表</Button>
					</Link>
				</div>
			)}

			<div className="grid gap-3">
				{items.map((problem) => {
					const current = problem.reviewCount + 1;
					return (
						<Card key={problem.id}>
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between gap-2">
									<CardTitle className="text-base">
										<Link
											className="hover:underline"
											params={{ id: problem.id }}
											to="/problems/$id"
										>
											{problem.title}
										</Link>
									</CardTitle>
									<span
										className={`shrink-0 rounded px-2 py-0.5 font-medium text-xs ${DIFFICULTY_COLOR[problem.difficulty] ?? ""}`}
									>
										{DIFFICULTY_LABEL[problem.difficulty] ?? problem.difficulty}
									</span>
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
										<span className="flex items-center gap-1">
											<Clock aria-hidden="true" className="h-3 w-3" />第{" "}
											{current}/{REVIEW_TOTAL} 次复习
										</span>
										{problem.nextReviewAt && (
											<span>应复习日期: {problem.nextReviewAt}</span>
										)}
									</div>
									<Button
										disabled={completeReview.isPending}
										onClick={() =>
											completeReview.mutate({ problemId: problem.id })
										}
										size="sm"
									>
										<CheckCircle2 aria-hidden="true" className="mr-1 h-4 w-4" />
										已复习
									</Button>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
			<Pagination onPageChange={setPage} page={page} totalPages={totalPages} />
		</div>
	);
}
