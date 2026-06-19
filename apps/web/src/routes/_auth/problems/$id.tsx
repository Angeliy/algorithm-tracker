import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@algorithm-tracker/ui/components/alert-dialog";
import { Badge } from "@algorithm-tracker/ui/components/badge";
import { Button } from "@algorithm-tracker/ui/components/button";
import { Input } from "@algorithm-tracker/ui/components/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Bookmark,
	BookmarkCheck,
	CheckCircle,
	Clock,
	Edit,
	Link2,
	Trash2,
	Unlink,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/problems/$id")({
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

function LinkedProblems({ problemId }: { problemId: string }) {
	const [linkSearch, setLinkSearch] = useState("");

	const linkedQuery = useQuery(
		trpc.problemLink.getLinked.queryOptions({ problemId })
	);

	const searchQuery = useQuery({
		...trpc.problem.list.queryOptions({ keyword: linkSearch || undefined }),
		enabled: linkSearch.trim().length > 0,
	});

	const addLinkMutation = useMutation(
		trpc.problemLink.add.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["problemLink", "getLinked"]],
				});
				setLinkSearch("");
				toast.success("关联成功");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const removeLinkMutation = useMutation(
		trpc.problemLink.remove.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["problemLink", "getLinked"]],
				});
				toast.success("已移除关联");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const linkedIds = new Set((linkedQuery.data ?? []).map((p) => p.id));
	const searchResults = (searchQuery.data?.items ?? []).filter(
		(p) => p.id !== problemId && !linkedIds.has(p.id)
	);

	return (
		<section className="mt-8">
			<h2 className="mb-3 flex items-center gap-2 font-semibold text-base">
				<Link2 className="h-4 w-4" />
				关联题目
			</h2>

			<div className="relative mb-3">
				<Input
					onChange={(e) => setLinkSearch(e.target.value)}
					placeholder="搜索题目标题以添加关联..."
					value={linkSearch}
				/>
				{linkSearch.trim().length > 0 && searchResults.length > 0 && (
					<ul className="absolute z-10 mt-1 w-full rounded border bg-popover shadow-md">
						{searchResults.slice(0, 8).map((p) => (
							<li key={p.id}>
								<button
									className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
									disabled={addLinkMutation.isPending}
									onClick={() =>
										addLinkMutation.mutate({
											problemAId: problemId,
											problemBId: p.id,
										})
									}
									type="button"
								>
									{p.title}
								</button>
							</li>
						))}
					</ul>
				)}
				{linkSearch.trim().length > 0 &&
					!searchQuery.isLoading &&
					searchResults.length === 0 && (
						<p className="mt-1 text-muted-foreground text-xs">
							没有可关联的题目
						</p>
					)}
			</div>

			{linkedQuery.isLoading && (
				<p className="text-muted-foreground text-sm">加载中...</p>
			)}
			{!linkedQuery.isLoading && (linkedQuery.data ?? []).length === 0 && (
				<p className="text-muted-foreground text-sm">暂无关联题目</p>
			)}

			<ul className="grid gap-2">
				{(linkedQuery.data ?? []).map((p) => (
					<li
						className="flex items-center justify-between rounded border px-3 py-2"
						key={p.id}
					>
						<Link
							className="text-sm hover:underline"
							params={{ id: p.id }}
							to="/problems/$id"
						>
							{p.title}
						</Link>
						<Button
							disabled={removeLinkMutation.isPending}
							onClick={() =>
								removeLinkMutation.mutate({
									problemAId: problemId,
									problemBId: p.id,
								})
							}
							size="sm"
							variant="ghost"
						>
							<Unlink className="h-3.5 w-3.5 text-destructive" />
							<span className="sr-only">移除关联</span>
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const { data, isLoading } = useQuery(
		trpc.problem.getById.queryOptions({ id })
	);

	const deleteMutation = useMutation(
		trpc.problem.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: [["problem", "list"]] });
				toast.success("题目已删除");
				navigate({ to: "/problems" });
			},
			onError: (err) => toast.error(err.message),
		})
	);
	const markForReview = useMutation(
		trpc.review.markForReview.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(
					trpc.problem.getById.queryOptions({ id })
				);
				toast.success("已加入复习队列");
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

	return (
		<div className="py-8">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h1 className="mb-2 font-bold text-2xl">{data.title}</h1>
					<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
						<span
							className={`rounded px-2 py-0.5 font-medium text-xs ${DIFFICULTY_COLOR[data.difficulty] ?? ""}`}
						>
							{DIFFICULTY_LABEL[data.difficulty] ?? data.difficulty}
						</span>
						<span>{data.date}</span>
						{data.timeSpent != null && (
							<span className="flex items-center gap-1">
								<Clock className="h-3 w-3" />
								{data.timeSpent} 分钟
							</span>
						)}
						{data.source && <span>{data.source}</span>}
						{data.isAc ? (
							<span className="flex items-center gap-1 text-green-600">
								<CheckCircle className="h-3 w-3" />
								一次 AC
							</span>
						) : (
							<span className="flex items-center gap-1">
								<XCircle className="h-3 w-3" />未 AC
							</span>
						)}
					</div>
					{data.tags.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{data.tags.map((tag) => (
								<Badge key={tag} variant="secondary">
									{tag}
								</Badge>
							))}
						</div>
					)}
				</div>

				<div className="flex shrink-0 gap-2">
					<Button
						disabled={
							markForReview.isPending ||
							(data.needsReview && !data.reviewArchived)
						}
						onClick={() => markForReview.mutate({ problemId: id })}
						size="sm"
						variant="outline"
					>
						{data.needsReview && !data.reviewArchived ? (
							<>
								<BookmarkCheck aria-hidden="true" className="mr-1 h-4 w-4" />
								复习中
							</>
						) : (
							<>
								<Bookmark aria-hidden="true" className="mr-1 h-4 w-4" />
								{data.reviewArchived ? "重新二刷" : "标记二刷"}
							</>
						)}
					</Button>
					<Button
						onClick={() =>
							navigate({ to: "/problems/$id/edit", params: { id } })
						}
						size="sm"
						variant="outline"
					>
						<Edit className="mr-1 h-4 w-4" />
						编辑
					</Button>

					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button size="sm" variant="destructive">
									<Trash2 className="mr-1 h-4 w-4" />
									删除
								</Button>
							}
						/>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>确认删除</AlertDialogTitle>
								<AlertDialogDescription>
									删除后无法恢复，确认要删除「{data.title}」吗？
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel
									render={<Button variant="outline">取消</Button>}
								/>
								<AlertDialogAction
									render={
										<Button
											disabled={deleteMutation.isPending}
											onClick={() => deleteMutation.mutate({ id })}
											variant="destructive"
										>
											{deleteMutation.isPending ? "删除中..." : "确认删除"}
										</Button>
									}
								/>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			{data.note && (
				<div className="prose prose-sm dark:prose-invert mb-8 max-w-none">
					<h2 className="mb-2 font-semibold text-base">笔记</h2>
					<ReactMarkdown>{data.note}</ReactMarkdown>
				</div>
			)}

			<LinkedProblems problemId={id} />
		</div>
	);
}
