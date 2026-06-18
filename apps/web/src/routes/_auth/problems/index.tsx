import { Badge } from "@algorithm-tracker/ui/components/badge";
import { Button } from "@algorithm-tracker/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@algorithm-tracker/ui/components/card";
import { Input } from "@algorithm-tracker/ui/components/input";
import { Label } from "@algorithm-tracker/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@algorithm-tracker/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Bookmark,
	BookmarkCheck,
	CheckCircle,
	Clock,
	PlusCircle,
	XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "@/utils/trpc";

const searchSchema = z.object({
	difficulty: z
		.enum(["easy", "medium", "hard"])
		.nullish()
		.transform((v) => v ?? undefined),
	tag: z
		.string()
		.nullish()
		.transform((v) => v ?? undefined),
	isAc: z
		.enum(["all", "yes", "no"])
		.nullish()
		.transform((v) => v ?? undefined),
});

export const Route = createFileRoute("/_auth/problems/")({
	validateSearch: searchSchema,
	component: RouteComponent,
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

function RouteComponent() {
	const navigate = useNavigate({ from: "/problems/" });
	const search = Route.useSearch();

	let isAcFilter: boolean | undefined;
	if (search.isAc === "yes") {
		isAcFilter = true;
	} else if (search.isAc === "no") {
		isAcFilter = false;
	}

	const listQuery = useQuery(
		trpc.problem.list.queryOptions({
			difficulty: search.difficulty,
			tag: search.tag,
			isAc: isAcFilter,
		})
	);
	const data = listQuery.data ?? [];
	const isLoading = listQuery.isLoading;

	const markForReview = useMutation(
		trpc.review.markForReview.mutationOptions({
			onSuccess: () => {
				listQuery.refetch();
				toast.success("已加入复习队列");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	function setFilter(
		key: keyof typeof search,
		value: string | null | undefined
	) {
		navigate({
			search: (prev) => ({ ...prev, [key]: value || undefined }),
			replace: true,
		});
	}

	return (
		<div className="mx-auto max-w-4xl p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">题目记录</h1>
				<Button onClick={() => navigate({ to: "/problems/new" })}>
					<PlusCircle className="mr-1 h-4 w-4" />
					新增
				</Button>
			</div>

			<div className="mb-6 flex flex-wrap gap-4">
				<div className="space-y-1">
					<Label htmlFor="filter-difficulty">难度</Label>
					<Select
						onValueChange={(v) =>
							setFilter("difficulty", v === "all" ? undefined : v)
						}
						value={search.difficulty ?? "all"}
					>
						<SelectTrigger className="w-28" id="filter-difficulty">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">全部</SelectItem>
							<SelectItem value="easy">简单</SelectItem>
							<SelectItem value="medium">中等</SelectItem>
							<SelectItem value="hard">困难</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1">
					<Label htmlFor="filter-tag">标签</Label>
					<Input
						className="w-32"
						id="filter-tag"
						onChange={(e) => setFilter("tag", e.target.value)}
						placeholder="搜索标签"
						value={search.tag ?? ""}
					/>
				</div>

				<div className="space-y-1">
					<Label htmlFor="filter-isAc">AC 状态</Label>
					<Select
						onValueChange={(v) =>
							setFilter("isAc", v === "all" ? undefined : v)
						}
						value={search.isAc ?? "all"}
					>
						<SelectTrigger className="w-28" id="filter-isAc">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">全部</SelectItem>
							<SelectItem value="yes">已 AC</SelectItem>
							<SelectItem value="no">未 AC</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{isLoading && <p className="text-muted-foreground">加载中...</p>}
			{!isLoading && data.length === 0 && (
				<p className="text-muted-foreground">暂无题目，点击右上角新增</p>
			)}

			<div className="grid gap-3">
				{data.map((problem) => (
					<Link key={problem.id} params={{ id: problem.id }} to="/problems/$id">
						<Card className="transition-shadow hover:shadow-md">
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between gap-2">
									<CardTitle className="text-base">{problem.title}</CardTitle>
									<div className="flex shrink-0 items-center gap-2">
										{problem.isAc ? (
											<span className="flex items-center gap-1 text-green-600">
												<CheckCircle aria-hidden="true" className="h-4 w-4" />
												<span className="sr-only">已 AC</span>
											</span>
										) : (
											<span className="flex items-center gap-1 text-muted-foreground">
												<XCircle aria-hidden="true" className="h-4 w-4" />
												<span className="sr-only">未 AC</span>
											</span>
										)}
										<span
											className={`rounded px-2 py-0.5 font-medium text-xs ${DIFFICULTY_COLOR[problem.difficulty] ?? ""}`}
										>
											{DIFFICULTY_LABEL[problem.difficulty] ??
												problem.difficulty}
										</span>
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
									<span>{problem.date}</span>
									{problem.timeSpent != null && (
										<span className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{problem.timeSpent} 分钟
										</span>
									)}
									{problem.source && <span>{problem.source}</span>}
								</div>
								{problem.tags.length > 0 && (
									<div className="mt-2 flex flex-wrap gap-1">
										{problem.tags.map((tag) => (
											<Badge key={tag} variant="secondary">
												{tag}
											</Badge>
										))}
									</div>
								)}
								<div className="mt-2 flex justify-end">
									<Button
										disabled={
											markForReview.isPending ||
											(problem.needsReview && !problem.reviewArchived)
										}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											markForReview.mutate({ problemId: problem.id });
										}}
										size="sm"
										variant="ghost"
									>
										{problem.needsReview && !problem.reviewArchived ? (
											<>
												<BookmarkCheck
													aria-hidden="true"
													className="mr-1 h-3 w-3"
												/>
												复习中
											</>
										) : (
											<>
												<Bookmark aria-hidden="true" className="mr-1 h-3 w-3" />
												{problem.reviewArchived ? "重新二刷" : "标记二刷"}
											</>
										)}
									</Button>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
