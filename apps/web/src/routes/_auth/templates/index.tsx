import { Button } from "@algorithm-tracker/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@algorithm-tracker/ui/components/dialog";
import { Input } from "@algorithm-tracker/ui/components/input";
import { Label } from "@algorithm-tracker/ui/components/label";
import { Textarea } from "@algorithm-tracker/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/templates/")({
	component: RouteComponent,
});

interface Template {
	code: string;
	description: string | null;
	id: string;
	type: string;
}

interface TemplateFormProps {
	defaultValues?: Partial<Template>;
	isPending: boolean;
	onCancel: () => void;
	onSubmit: (values: {
		type: string;
		code: string;
		description: string;
	}) => void;
	submitLabel: string;
}

function TemplateForm({
	defaultValues,
	onSubmit,
	isPending,
	submitLabel,
	onCancel,
}: TemplateFormProps) {
	const [type, setType] = useState(defaultValues?.type ?? "");
	const [code, setCode] = useState(defaultValues?.code ?? "");
	const [description, setDescription] = useState(
		defaultValues?.description ?? ""
	);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!(type.trim() && code.trim())) {
			return;
		}
		onSubmit({ type: type.trim(), code, description });
	}

	return (
		<form className="grid gap-4" onSubmit={handleSubmit}>
			<div className="grid gap-1.5">
				<Label htmlFor="tpl-type">类型</Label>
				<Input
					id="tpl-type"
					onChange={(e) => setType(e.target.value)}
					placeholder="如：二分查找、DFS..."
					required
					value={type}
				/>
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="tpl-code">代码模板</Label>
				<Textarea
					className="min-h-36 font-mono text-xs"
					id="tpl-code"
					onChange={(e) => setCode(e.target.value)}
					placeholder="粘贴代码模板..."
					required
					value={code}
				/>
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="tpl-desc">描述（可选）</Label>
				<Input
					id="tpl-desc"
					onChange={(e) => setDescription(e.target.value)}
					placeholder="简短说明"
					value={description}
				/>
			</div>
			<DialogFooter>
				<DialogClose
					render={
						<Button onClick={onCancel} type="button" variant="outline">
							取消
						</Button>
					}
				/>
				<Button disabled={isPending} type="submit">
					{isPending ? "保存中..." : submitLabel}
				</Button>
			</DialogFooter>
		</form>
	);
}

function useDebounce<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

function RouteComponent() {
	const [keyword, setKeyword] = useState("");
	const debouncedKeyword = useDebounce(keyword, 300);
	const [newOpen, setNewOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Template | null>(null);
	const queryClient = useQueryClient();

	const listQuery = useQuery(
		trpc.template.list.queryOptions({ keyword: debouncedKeyword || undefined })
	);
	const templates = listQuery.data ?? [];

	const createMutation = useMutation(
		trpc.template.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: [["template", "list"]] });
				setNewOpen(false);
				toast.success("模板已创建");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const updateMutation = useMutation(
		trpc.template.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: [["template", "list"]] });
				setEditTarget(null);
				toast.success("模板已更新");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const deleteMutation = useMutation(
		trpc.template.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: [["template", "list"]] });
				toast.success("模板已删除");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
		const list = acc[t.type] ?? [];
		list.push(t);
		acc[t.type] = list;
		return acc;
	}, {});

	return (
		<div className="mx-auto max-w-4xl p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">代码模板库</h1>
				<Dialog onOpenChange={setNewOpen} open={newOpen}>
					<DialogTrigger
						render={
							<Button>
								<PlusCircle className="mr-1 h-4 w-4" />
								新增模板
							</Button>
						}
					/>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>新增模板</DialogTitle>
						</DialogHeader>
						<TemplateForm
							isPending={createMutation.isPending}
							onCancel={() => setNewOpen(false)}
							onSubmit={(values) => createMutation.mutate(values)}
							submitLabel="创建"
						/>
					</DialogContent>
				</Dialog>
			</div>

			<div className="mb-6">
				<Input
					className="max-w-xs"
					onChange={(e) => setKeyword(e.target.value)}
					placeholder="搜索类型或描述..."
					value={keyword}
				/>
			</div>

			{listQuery.isLoading && (
				<p className="text-muted-foreground">加载中...</p>
			)}
			{!listQuery.isLoading && templates.length === 0 && (
				<p className="text-muted-foreground">
					{debouncedKeyword ? "没有匹配的模板" : "暂无模板，点击右上角新增"}
				</p>
			)}

			<div className="grid gap-8">
				{Object.entries(grouped).map(([type, items]) => (
					<section key={type}>
						<h2 className="mb-3 border-b pb-1 font-semibold text-lg">{type}</h2>
						<div className="grid gap-4">
							{items.map((tpl) => (
								<div className="rounded border bg-card p-4" key={tpl.id}>
									<div className="mb-2 flex items-start justify-between gap-2">
										<p className="text-muted-foreground text-sm">
											{tpl.description ?? ""}
										</p>
										<div className="flex shrink-0 gap-1">
											<Dialog
												onOpenChange={(open) =>
													setEditTarget(open ? tpl : null)
												}
												open={editTarget?.id === tpl.id}
											>
												<DialogTrigger
													render={
														<Button size="sm" variant="ghost">
															<Edit className="h-3.5 w-3.5" />
															<span className="sr-only">编辑</span>
														</Button>
													}
												/>
												<DialogContent>
													<DialogHeader>
														<DialogTitle>编辑模板</DialogTitle>
													</DialogHeader>
													{editTarget?.id === tpl.id && (
														<TemplateForm
															defaultValues={tpl}
															isPending={updateMutation.isPending}
															onCancel={() => setEditTarget(null)}
															onSubmit={(values) =>
																updateMutation.mutate({ id: tpl.id, ...values })
															}
															submitLabel="保存"
														/>
													)}
												</DialogContent>
											</Dialog>
											<Button
												disabled={deleteMutation.isPending}
												onClick={() => deleteMutation.mutate({ id: tpl.id })}
												size="sm"
												variant="ghost"
											>
												<Trash2 className="h-3.5 w-3.5 text-destructive" />
												<span className="sr-only">删除</span>
											</Button>
										</div>
									</div>
									<pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
										{tpl.code}
									</pre>
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
