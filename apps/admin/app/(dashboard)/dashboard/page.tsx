"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users, Wallet, FolderKanban, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRevenueSummary, useMembershipBreakdown, useProjectsFunding } from "@/hooks/use-reports";
import { formatMoney } from "@/lib/utils";

const ACCENT_STYLES = {
  emerald: { bg: "bg-node-emerald/10", text: "text-node-emerald" },
  cyan: { bg: "bg-node-cyan/10", text: "text-node-cyan" },
  violet: { bg: "bg-node-violet/10", text: "text-node-violet" },
  amber: { bg: "bg-node-amber/10", text: "text-node-amber" },
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: keyof typeof ACCENT_STYLES;
}) {
  const styles = ACCENT_STYLES[accent];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.bg}`}>
          <Icon className={`h-5 w-5 ${styles.text}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-mono text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHomePage() {
  const { data: revenue, isLoading: revenueLoading } = useRevenueSummary("month");
  const { data: membership } = useMembershipBreakdown();
  const { data: projects } = useProjectsFunding();

  const totalRevenue = revenue?.reduce((sum, r) => sum + r.totalMinorUnits, 0) ?? 0;
  const activeMembers = membership?.find((m) => m.status === "ACTIVE")?.count ?? 0;
  const activeProjects = projects?.length ?? 0;

  const chartData = (revenue ?? []).map((r) => ({
    period: new Date(r.period).toLocaleDateString("en-GH", { month: "short" }),
    amount: r.totalMinorUnits / 100,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">An overview of your organization's activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue (YTD)" value={formatMoney(totalRevenue)} icon={Wallet} accent="emerald" />
        <StatCard label="Active Members" value={String(activeMembers)} icon={Users} accent="cyan" />
        <StatCard label="Active Projects" value={String(activeProjects)} icon={FolderKanban} accent="violet" />
        <StatCard label="This Month" value={chartData.length ? formatMoney(chartData[chartData.length - 1]!.amount * 100) : "—"} icon={TrendingUp} accent="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No payments recorded yet — revenue will appear here once dues or donations start coming in.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" axisLine={false} tickLine={false} className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" stroke="hsl(var(--muted-foreground))" width={40} />
                <Tooltip
                  formatter={(value: number) => formatMoney(value * 100)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#revenueFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project funding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!projects || projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active projects yet.</p>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.title}</span>
                  <Badge variant="category">
                    {p.fundingPercent !== null ? `${p.fundingPercent}% funded` : formatMoney(p.raisedAmount)}
                  </Badge>
                </div>
                {p.fundingPercent !== null && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-node-violet" style={{ width: `${p.fundingPercent}%` }} />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
