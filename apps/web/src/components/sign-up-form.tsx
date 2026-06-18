import { Button } from "@algorithm-tracker/ui/components/button";
import { Input } from "@algorithm-tracker/ui/components/input";
import { Label } from "@algorithm-tracker/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const navigate = useNavigate({ from: "/login" });
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{ email: value.email, password: value.password, name: value.name },
				{
					onSuccess: () => {
						navigate({ to: "/dashboard" });
						toast.success("注册成功，欢迎使用！");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				}
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "昵称至少 2 个字符"),
				email: z.email("请输入有效的邮箱地址"),
				password: z.string().min(6, "密码至少 6 位"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="space-y-8">
			<div className="space-y-1.5">
				<h1 className="font-semibold text-2xl tracking-tight">创建账号</h1>
				<p className="text-muted-foreground text-sm">
					开始追踪你的算法学习之旅
				</p>
			</div>

			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.Field name="name">
					{(field) => (
						<div className="space-y-1.5">
							<Label className="font-medium text-sm" htmlFor={field.name}>
								昵称
							</Label>
							<Input
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="你的名字"
								value={field.state.value}
							/>
							{field.state.meta.errors.map((error) => (
								<p className="text-destructive text-xs" key={error?.message}>
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="email">
					{(field) => (
						<div className="space-y-1.5">
							<Label className="font-medium text-sm" htmlFor={field.name}>
								邮箱
							</Label>
							<Input
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="you@example.com"
								type="email"
								value={field.state.value}
							/>
							{field.state.meta.errors.map((error) => (
								<p className="text-destructive text-xs" key={error?.message}>
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="password">
					{(field) => (
						<div className="space-y-1.5">
							<Label className="font-medium text-sm" htmlFor={field.name}>
								密码
							</Label>
							<Input
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="••••••••"
								type="password"
								value={field.state.value}
							/>
							{field.state.meta.errors.map((error) => (
								<p className="text-destructive text-xs" key={error?.message}>
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button
							className="w-full"
							disabled={!canSubmit || isSubmitting}
							type="submit"
						>
							{isSubmitting ? "注册中..." : "注册"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="text-center text-muted-foreground text-sm">
				已有账号？{" "}
				<button
					className="font-medium text-primary hover:underline"
					onClick={onSwitchToSignIn}
					type="button"
				>
					直接登录
				</button>
			</p>
		</div>
	);
}
