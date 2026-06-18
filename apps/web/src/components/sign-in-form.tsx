import { Button } from "@algorithm-tracker/ui/components/button";
import { Input } from "@algorithm-tracker/ui/components/input";
import { Label } from "@algorithm-tracker/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const DEMO_EMAIL = "dean@demo.com";
const DEMO_PASSWORD = "1234567";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate({ from: "/login" });
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{ email: value.email, password: value.password },
				{
					onSuccess: () => {
						navigate({ to: "/dashboard" });
						toast.success("登录成功");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				}
			);
		},
		validators: {
			onSubmit: z.object({
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
				<h1 className="font-semibold text-2xl tracking-tight">欢迎回来</h1>
				<p className="text-muted-foreground text-sm">登录你的算法学习追踪器</p>
			</div>

			<button
				className="w-full rounded-lg border border-primary/40 border-dashed bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
				onClick={() => {
					form.setFieldValue("email", DEMO_EMAIL);
					form.setFieldValue("password", DEMO_PASSWORD);
				}}
				type="button"
			>
				<div className="flex items-center gap-2 text-primary">
					<Zap className="h-3.5 w-3.5" />
					<span className="font-medium text-sm">演示账号一键填入</span>
				</div>
				<p className="mt-0.5 text-muted-foreground text-xs">
					{DEMO_EMAIL} · {DEMO_PASSWORD}
				</p>
			</button>

			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
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
							{isSubmitting ? "登录中..." : "登录"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="text-center text-muted-foreground text-sm">
				还没有账号？{" "}
				<button
					className="font-medium text-primary hover:underline"
					onClick={onSwitchToSignUp}
					type="button"
				>
					立即注册
				</button>
			</p>
		</div>
	);
}
