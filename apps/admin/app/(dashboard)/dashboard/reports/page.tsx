"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { Download, AlertCircle } from "lucide-react";
import {
  useRevenueSummary,
  useRevenueByCategory,
  useMembershipBreakdown,
  useMembershipGrowth,
  useOutstandingDues,
  useAttendanceByEvent,
  useProjectsFunding,
} from "@/hooks/use-reports";
import { downloadPaymentsCsv } from "@/hooks/use-payments";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Same node-color mapping used everywhere else (dashboard stat cards, badges)
// so charts read as visually consistent with the rest of the product rather
// than defaulting to a chart library's own arbitrary palette.
const NODE_COLORS = ["#16A34A", "#8B5CF6", "#0891B2", "#F59E0B", "#DC2626"];

function StatusBadge({ status }: { status: string }) {
  const variant = status === "ACTIVE" ? "success" : status === "SUSPENDED" ? "pending" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function ReportsPage() {
  const [bucket, setBucket] = useState<"day" | "month" | "year">("month");
  const [isExporting, setIsExporting] = useState(false);

  const { data: revenue, isLoading: revenueLoading } = useRevenueSummary(bucket);
  const { data: revenueByCategory } = useRevenueByCategory();
  const { data: membershipBreakdown } = useMembershipBreakdown();
  const { data: membershipGrowth } = useMembershipGrowth(bucket);
  const { data: outstandingDues, isLoading: duesLoading } = useOutstandingDues();
  const { data: attendance } = useAttendanceByEvent();
  const { data: projects } = useProjectsFunding();

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadPaymentsCsv({});
    } finally {
      setIsExporting(false);
    }
  }

  const revenueChartData = (revenue ?? []).map((r) => ({
    period: new Date(r.period).toLocaleDateString("en-GH", bucket === "year" ? { year: "numeric" } : { month: "short", day: bucket === "day" ? "numeric" : undefined }),
    amount: r.totalMinorUnits / 100,
  }));

  const growthChartData = (membershipGrowth ?? []).map((g) => ({
    period: new Date(g.period).toLocaleDateString("en-GH", bucket === "year" ? { year: "numeric" } : { month: "short" }),
    newMembers: g.newMembers,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial, membership, and engagement insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={bucket} onValueChange={(v) => setBucket(v as typeof bucket)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting…" : "Export payments CSV"}
          </Button>
        </div>
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : revenueChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No revenue recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" stroke="hsl(var(--muted-foreground))" width={40} />
                <Tooltip
                  formatter={(value: number) => formatMoney(value * 100)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by category */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
          </CardHeader>
          <CardContent>
            {!revenueByCategory?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={revenueByCategory}
                      dataKey="totalMinorUnits"
                      nameKey="categoryName"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {revenueByCategory.map((_, i) => (
                        <Cell key={i} fill={NODE_COLORS[i % NODE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-2">
                  {revenueByCategory.map((c, i) => (
                    <div key={c.categoryName} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: NODE_COLORS[i % NODE_COLORS.length] }} />
                        <span className="text-muted-foreground">{c.categoryName}</span>
                      </div>
                      <span className="font-mono font-medium">{formatMoney(c.totalMinorUnits)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membership breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Membership status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!membershipBreakdown?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No members yet.</p>
            ) : (
              membershipBreakdown.map((m) => (
                <div key={m.status} className="flex items-center justify-between">
                  <StatusBadge status={m.status} />
                  <span className="font-mono text-sm font-semibold">{m.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Membership growth */}
      <Card>
        <CardHeader>
          <CardTitle>Membership growth</CardTitle>
          <CardDescription>New members joined per {bucket}.</CardDescription>
        </CardHeader>
        <CardContent>
          {growthChartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No growth data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={growthChartData}>
                <XAxis dataKey="period" axisLine={false} tickLine={false} className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" stroke="hsl(var(--muted-foreground))" width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="newMembers" fill="hsl(var(--node-cyan))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Outstanding dues */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding dues (this period)</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Heuristic: members with zero DUES payments this month. Not a precise
              accounts-receivable balance — ClubHub doesn't yet track per-member expected amounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {duesLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !outstandingDues?.membersWithoutDuesPayment.length ? (
              <p className="py-4 text-sm text-muted-foreground">Everyone's paid up for this period. 🎉</p>
            ) : (
              <div className="flex flex-col gap-2">
                {outstandingDues.membersWithoutDuesPayment.map((m) => (
                  <div key={m.membershipId} className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
                    <span>
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance by event */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance by event</CardTitle>
          </CardHeader>
          <CardContent>
            {!attendance?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No check-ins recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {attendance.map((a) => (
                  <div key={a.eventId ?? "general"} className="flex items-center justify-between text-sm">
                    <span>{a.eventTitle ?? "General attendance"}</span>
                    <Badge variant="info">{a.attended} checked in</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project funding */}
      <Card>
        <CardHeader>
          <CardTitle>Project funding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!projects?.length ? (
            <p className="text-sm text-muted-foreground">No active projects.</p>
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
