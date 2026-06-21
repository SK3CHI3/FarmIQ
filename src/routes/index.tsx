import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingUp, AlertTriangle, Users, CheckCircle2 } from "lucide-react";
import { PageHeader, CompletenessBar, StatusBadge } from "@/components/page-header";
import { activityFeed, dataSources, farmers, stats } from "@/data/sample";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · FarmIQ" },
      { name: "description", content: "Overview of farmer data health, decision readiness and pending actions." },
      { property: "og:title", content: "Dashboard · FarmIQ" },
      { property: "og:description", content: "Overview of farmer data health, decision readiness and pending actions." },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warning" | "bad";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const valueColor =
    tone === "good"
      ? "text-primary"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "bad"
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card className="shadow-none border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="label-eyebrow">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`mt-3 text-3xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const attention = [...farmers].sort((a, b) => a.completeness - b.completeness).slice(0, 5);
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="How healthy is your farmer data, and what needs attention today."
        actions={
          <Button asChild>
            <Link to="/upload">Upload data</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total farmers" value={stats.totalFarmers.toLocaleString()} hint="+340 this week" tone="good" icon={Users} />
        <StatCard label="Data completeness" value={`${stats.completenessPct}%`} hint="Above 70% threshold" tone="good" icon={TrendingUp} />
        <StatCard label="Decision-ready" value={stats.decisionReady.toLocaleString()} hint="66% of farmer base" tone="default" icon={CheckCircle2} />
        <StatCard label="Pending actions" value={stats.pendingActions} hint="Awaiting human review" tone="bad" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2 shadow-none border">
          <CardHeader>
            <CardTitle className="text-base">Data health by source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataSources.map((s) => {
              const color =
                s.completeness >= 70 ? "bg-primary" : s.completeness >= 40 ? "bg-[var(--warning)]" : "bg-destructive";
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.records.toLocaleString()} records · {s.completeness}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${s.completeness}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activityFeed.map((a, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-foreground leading-snug">{a.text}</p>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-none border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Farmers needing attention</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/data-quality" className="text-primary">
              View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-y bg-muted/40">
                <th className="text-left font-medium px-6 py-2.5">Farmer</th>
                <th className="text-left font-medium px-6 py-2.5">Region</th>
                <th className="text-left font-medium px-6 py-2.5">Crop</th>
                <th className="text-left font-medium px-6 py-2.5">Completeness</th>
                <th className="text-left font-medium px-6 py-2.5">Credit</th>
                <th className="text-right font-medium px-6 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {attention.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <div className="font-medium text-foreground">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.id}</div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{f.region}, {f.country}</td>
                  <td className="px-6 py-3 text-muted-foreground">{f.crop}</td>
                  <td className="px-6 py-3"><CompletenessBar value={f.completeness} /></td>
                  <td className="px-6 py-3"><StatusBadge status={f.credit === "ready" ? "ready" : "not-ready"} /></td>
                  <td className="px-6 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/farmers" className="text-primary">Review</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
