import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@algorithm-tracker/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Flame, TrendingUp } from "lucide-react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data, isLoading, isError } = useQuery(
		trpc.stats.getOverview.queryOptions()
	);

	if (isLoading) {
		return <div className="p-6 text-muted-foreground">加载中...</div>;
	}
	if (isError) {
		return (
			<div className="p-6 text-destructive">统计数据加载失败，请刷新重试</div>
		);
	}

	const stats = [
		{
			label: "总题数",
			value: data?.total ?? 0,
			icon: BookOpen,
		},
		{
			label: "本周题数",
			value: data?.thisWeek ?? 0,
			icon: CalendarDays,
		},
		{
			label: "连续打卡",
			value: `${data?.streak ?? 0} 天`,
			icon: Flame,
		},
	] as const;

	return (
		<div className="mx-auto max-w-4xl p-6">
			<h1 className="mb-6 font-bold text-2xl">看板</h1>

			<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{stats.map(({ label, value, icon: Icon }) => (
					<Card key={label}>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-sm">{label}</CardTitle>
							<Icon
								aria-hidden="true"
								className="h-4 w-4 text-muted-foreground"
							/>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-3xl">{value}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<TrendingUp aria-hidden="true" className="h-4 w-4" />近 30 天趋势
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ResponsiveContainer height={200} width="100%">
						<LineChart data={data?.dailyTrend ?? []}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis
								dataKey="date"
								tick={{ fontSize: 11 }}
								tickFormatter={(d: string) => d.slice(5)}
							/>
							<YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={24} />
							<Tooltip
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
