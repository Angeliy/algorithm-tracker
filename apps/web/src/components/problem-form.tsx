import { Badge } from "@algorithm-tracker/ui/components/badge";
import { Button } from "@algorithm-tracker/ui/components/button";
import { Input } from "@algorithm-tracker/ui/components/input";
import { Label } from "@algorithm-tracker/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@algorithm-tracker/ui/components/select";
import { Textarea } from "@algorithm-tracker/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";

export interface ProblemFormValues {
	date: string;
	difficulty: "easy" | "medium" | "hard";
	isAc: boolean;
	note?: string;
	source?: string;
	tags: string[];
	timeSpent?: number;
	title: string;
}

interface ProblemFormProps {
	defaultValues?: Partial<ProblemFormValues>;
	onSubmit: (values: ProblemFormValues) => Promise<void>;
	submitLabel?: string;
}

export function ProblemForm({
	defaultValues,
	onSubmit,
	submitLabel = "保存",
}: ProblemFormProps) {
	const navigate = useNavigate();
	const d = new Date();
	const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	const [tags, setTags] = useState<string[]>(defaultValues?.tags ?? []);
	const [tagInput, setTagInput] = useState("");

	function addTag() {
		const trimmed = tagInput.trim().toLowerCase();
		if (trimmed && !tags.includes(trimmed)) {
			setTags((prev) => [...prev, trimmed]);
		}
		setTagInput("");
	}

	function removeTag(tag: string) {
		setTags((prev) => prev.filter((t) => t !== tag));
	}

	const form = useForm({
		defaultValues: {
			title: defaultValues?.title ?? "",
			source: defaultValues?.source ?? "",
			difficulty: defaultValues?.difficulty ?? ("easy" as const),
			date: defaultValues?.date ?? today,
			timeSpent: defaultValues?.timeSpent as number | undefined,
			isAc: defaultValues?.isAc ?? false,
			note: defaultValues?.note ?? "",
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				title: value.title,
				source: value.source || undefined,
				difficulty: value.difficulty,
				date: value.date,
				timeSpent: value.timeSpent,
				isAc: value.isAc,
				note: value.note || undefined,
				tags,
			});
		},
	});

	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<form.Field name="title">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>题目名称 *</Label>
						<Input
							id={field.name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="如：两数之和"
							required
							value={field.state.value}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="source">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>来源</Label>
						<Input
							id={field.name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="如：LeetCode 1"
							value={field.state.value ?? ""}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="difficulty">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor="difficulty-select">难度 *</Label>
						<Select
							onValueChange={(v) =>
								field.handleChange(v as "easy" | "medium" | "hard")
							}
							value={field.state.value}
						>
							<SelectTrigger
								aria-labelledby="difficulty-select"
								id="difficulty-select"
							>
								<SelectValue placeholder="选择难度" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="easy">简单</SelectItem>
								<SelectItem value="medium">中等</SelectItem>
								<SelectItem value="hard">困难</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</form.Field>

			<form.Field name="date">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>做题日期 *</Label>
						<Input
							id={field.name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							required
							type="date"
							value={field.state.value}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="timeSpent">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>用时（分钟）</Label>
						<Input
							id={field.name}
							min={1}
							onBlur={field.handleBlur}
							onChange={(e) => {
								const n = Number(e.target.value);
								field.handleChange(
									e.target.value &&
										Number.isFinite(n) &&
										Number.isInteger(n) &&
										n >= 1
										? n
										: undefined
								);
							}}
							placeholder="可选"
							type="number"
							value={field.state.value ?? ""}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="isAc">
				{(field) => (
					<div className="flex items-center gap-2">
						<input
							checked={field.state.value}
							id={field.name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.checked)}
							type="checkbox"
						/>
						<Label htmlFor={field.name}>一次 AC</Label>
					</div>
				)}
			</form.Field>

			<div className="space-y-1">
				<Label htmlFor="tag-input">标签</Label>
				<div className="flex gap-2">
					<Input
						id="tag-input"
						onChange={(e) => setTagInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addTag();
							}
						}}
						placeholder="输入标签后按 Enter"
						value={tagInput}
					/>
					<Button onClick={addTag} type="button" variant="outline">
						添加
					</Button>
				</div>
				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1 pt-1">
						{tags.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
								<button
									aria-label={`移除标签 ${tag}`}
									className="ml-1"
									onClick={() => removeTag(tag)}
									type="button"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}
			</div>

			<form.Field name="note">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>笔记（支持 Markdown）</Label>
						<Textarea
							id={field.name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="记录思路、踩坑..."
							rows={6}
							value={field.state.value ?? ""}
						/>
					</div>
				)}
			</form.Field>

			<div className="flex gap-2">
				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button disabled={!canSubmit || isSubmitting} type="submit">
							{isSubmitting ? "保存中..." : submitLabel}
						</Button>
					)}
				</form.Subscribe>
				<Button
					onClick={() => navigate({ to: "/problems" })}
					type="button"
					variant="outline"
				>
					取消
				</Button>
			</div>
		</form>
	);
}
