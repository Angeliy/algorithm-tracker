import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const [mode, setMode] = useState<"signin" | "signup">("signin");

	return (
		<div className="flex min-h-[calc(100svh-3rem)] items-center justify-center px-4 py-12">
			<div className="w-full max-w-sm">
				{mode === "signin" ? (
					<SignInForm onSwitchToSignUp={() => setMode("signup")} />
				) : (
					<SignUpForm onSwitchToSignIn={() => setMode("signin")} />
				)}
			</div>
		</div>
	);
}
