import { Button } from "@algorithm-tracker/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@algorithm-tracker/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	BookOpen,
	CalendarDays,
	Flame,
	RefreshCw,
	TrendingUp,
} from "lucide-react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

function SyncCard() {
	const queryClient = useQueryClient();
	const { data: log } = useQuery(trpc.sync.lastLog.queryOptions());

	const { mutate, isPending } = useMutation({
		...trpc.sync.trigger.mutationOptions(),
		onSuccess: (result) => {
			toast.success(`同步完成，新增 ${result.newProblems} 题`);
			queryClient.invalidateQueries({ queryKey: [["sync", "lastLog"]] });
			queryClient.invalidateQueries({ queryKey: [["stats"]] });
			queryClient.invalidateQueries({ queryKey: [["problem", "list"]] });
		},
		onError: (err) => {
			toast.error(err.message || "同步失败");
		},
	});

	const lastSyncText = log
		? `${new Date(log.syncedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · 新增 ${log.newProblems} 题`
		: "暂无同步记录";

	return (
		<Card className="shadow-sm">
			<CardHeader className="flex flex-row items-center justify-between pb-1">
				<CardTitle className="font-medium text-muted-foreground text-sm">
					LeetCode 同步
				</CardTitle>
				<div className="rounded-md bg-primary/10 p-1.5">
					<RefreshCw aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
				</div>
			</CardHeader>
			<CardContent className="flex items-end justify-between">
				<div>
					<p className="font-bold text-sm tracking-tight">上次同步</p>
					<p className="mt-0.5 text-muted-foreground text-xs">{lastSyncText}</p>
				</div>
				<Button
					disabled={isPending}
					onClick={() => mutate()}
					size="sm"
					variant="outline"
				>
					{isPending ? "同步中..." : "手动同步"}
				</Button>
			</CardContent>
		</Card>
	);
}

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data, isLoading, isError } = useQuery(
		trpc.stats.getOverview.queryOptions()
	);

	if (isLoading) {
		return (
			<div className="py-12 text-center text-muted-foreground text-sm">
				加载中...
			</div>
		);
	}
	if (isError) {
		return (
			<div className="py-12 text-center text-destructive text-sm">
				统计数据加载失败，请刷新重试
			</div>
		);
	}

	const stats = [
		{
			label: "总题数",
			value: data?.total ?? 0,
			icon: BookOpen,
			desc: "累计记录",
		},
		{
			label: "本周题数",
			value: data?.thisWeek ?? 0,
			icon: CalendarDays,
			desc: "本周新增",
		},
		{
			label: "连续打卡",
			value: `${data?.streak ?? 0} 天`,
			icon: Flame,
			desc: "连续天数",
		},
	] as const;

	return (
		<div className="py-8">
			<div className="mb-8">
				<h1 className="font-semibold text-xl tracking-tight">看板</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					你的算法学习进度概览
				</p>
			</div>

			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{stats.map(({ label, value, icon: Icon, desc }) => (
					<Card className="shadow-sm" key={label}>
						<CardHeader className="flex flex-row items-center justify-between pb-1">
							<CardTitle className="font-medium text-muted-foreground text-sm">
								{label}
							</CardTitle>
							<div className="rounded-md bg-primary/10 p-1.5">
								<Icon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
							</div>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-2xl tracking-tight">{value}</p>
							<p className="mt-0.5 text-muted-foreground text-xs">{desc}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="mb-6">
				<SyncCard />
			</div>

			<Card className="shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
						<TrendingUp aria-hidden="true" className="h-4 w-4" />近 30
						天刷题趋势
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ResponsiveContainer height={200} width="100%">
						<LineChart data={data?.dailyTrend ?? []}>
							<CartesianGrid
								stroke="hsl(var(--border))"
								strokeDasharray="3 3"
							/>
							<XAxis
								axisLine={false}
								dataKey="date"
								tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
								tickFormatter={(d: string) => d.slice(5)}
								tickLine={false}
							/>
							<YAxis
								allowDecimals={false}
								axisLine={false}
								tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
								tickLine={false}
								width={24}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: "hsl(var(--card))",
									border: "1px solid hsl(var(--border))",
									borderRadius: "8px",
									fontSize: "12px",
								}}
								formatter={(value) => [String(value ?? 0), "题数"]}
								labelFormatter={(label) => `日期: ${String(label)}`}
							/>
							<Line
								dataKey="count"
								dot={false}
								stroke="hsl(var(--primary))"
								strokeWidth={2}
								type="monotone"
							/>
						</LineChart>
					</ResponsiveContainer>
				</CardContent>
			</Card>
		</div>
	);
}
