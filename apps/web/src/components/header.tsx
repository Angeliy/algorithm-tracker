"use client";

import { Link, useRouterState } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const NAV_LINKS = [
	{ to: "/dashboard", label: "看板" },
	{ to: "/problems", label: "题目" },
	{ to: "/review", label: "错题本" },
	{ to: "/templates", label: "模板库" },
	{ to: "/workflow", label: "工作流" },
] as const;

export default function Header() {
	const { data: session } = authClient.useSession();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isAuthPage = pathname === "/login" || pathname === "/";

	return (
		<header className="border-border/60 border-b bg-background/80 backdrop-blur-sm">
			<div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
				<div className="flex items-center gap-6">
					<Link
						className="font-semibold text-foreground/90 text-sm tracking-tight transition-colors hover:text-foreground"
						to="/"
					>
						AlgoTracker
					</Link>

					{session && !isAuthPage && (
						<nav className="flex items-center gap-1">
							{NAV_LINKS.map(({ to, label }) => (
								<Link
									className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
									key={to}
									to={to}
								>
									{label}
								</Link>
							))}
						</nav>
					)}
				</div>

				<div className="flex items-center gap-2">
					<ModeToggle />
					{session && <UserMenu />}
				</div>
			</div>
		</header>
	);
}
