import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, TrendingUp, AlertTriangle, Users, CheckCircle2, Layers, Wallet, Loader2 } from "lucide-react";
import { PageHeader, CompletenessBar, StatusBadge } from "@/components/page-header";
import { fmt } from "@/data/sample";
import { getAiErrorMessage } from "@/lib/ai-errors";
import { askIntelligence, type IntelligenceAnswer } from "@/server/ai.functions";
import { toast } from "sonner";
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell,
  Pie, PieChart, RadialBar, RadialBarChart, PolarAngleAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getFarmers } from "@/server/farmers.functions";
import {
  getSources, getActivity, getTierDistribution, getPaymentMix, getBaselineCoverage,
} from "@/lib/dashboard.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · FarmIQ" },
      { name: "description", content: "Overview of farmer data health, decision readiness and pending actions." },
    ],
  }),
  loader: async () => {
    const [farmers, sources, activity, tierDist, paymentMix, baselineCoverage] = await Promise.all([
      getFarmers(),
      getSources(),
      getActivity(),
      getTierDistribution(),
      getPaymentMix(),
      getBaselineCoverage(),
    ]);
    return { farmers, sources, activity, tierDist, paymentMix, baselineCoverage };
  },
  component: Dashboard,
});

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, hint, tone = "default", icon: Icon,
}: {
  label: string; value: string | number; hint?: string;
  tone?: "default" | "good" | "warning" | "bad";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const valueColor =
    tone === "good" ? "text-primary" :
    tone === "warning" ? "text-[var(--warning)]" :
    tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <Card className="shadow-none border">
      <CardContent className="p-5 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5" />
        <div className="flex items-start justify-between relative">
          <span className="label-eyebrow">{label}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <div className={`mt-3 text-3xl font-semibold tracking-tight ${valueColor} relative`}>{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground relative">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard() {
  const { farmers, sources, activity, tierDist, paymentMix, baselineCoverage } = Route.useLoaderData();

  const attention = [...farmers].sort((a, b) => a.completeness - b.completeness).slice(0, 5);

  const totalFarmers  = farmers.length;
  const completenessPct = totalFarmers
    ? Math.round(farmers.reduce((s, f) => s + f.completeness, 0) / totalFarmers) : 0;
  const decisionReady = farmers.filter(
    (f) => f.credit === "ready" || f.insurance === "ready" || f.input === "ready",
  ).length;
  const pendingActions = farmers.filter((f) => f.consent === "Pending").length;
  const readinessPct   = totalFarmers ? Math.round((decisionReady / totalFarmers) * 100) : 0;

  // Credit / insurance / input breakdown %
  const creditPct    = totalFarmers ? Math.round((farmers.filter(f => f.credit    === "ready").length / totalFarmers) * 100) : 0;
  const insurancePct = totalFarmers ? Math.round((farmers.filter(f => f.insurance === "ready").length / totalFarmers) * 100) : 0;
  const inputPct     = totalFarmers ? Math.round((farmers.filter(f => f.input     === "ready").length / totalFarmers) * 100) : 0;

  const chartData = sources.map((s) => ({ name: s.short, full: s.name, completeness: s.completeness, records: s.records }));
  const readinessData = [{ name: "ready", value: readinessPct, fill: "var(--primary)" }];

  const paymentConfig = paymentMix.reduce(
    (acc, p) => ({ ...acc, [p.name]: { label: p.name, color: p.color } }),
    {} as ChartConfig,
  );

  const [query, setQuery] = useState("Which source has the most missing Tier 1 baseline fields?");
  const [aiAnswer, setAiAnswer] = useState<IntelligenceAnswer | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const matchedAiFarmers = aiAnswer ? farmers.filter((f) => aiAnswer.farmerIds.includes(f.id)) : [];
  const aiNoMatchMessage = aiAnswer && aiAnswer.farmerIds.length === 0
    ? "No farmers match this query."
    : null;

  async function handleAiQuestion(nextQuery = query) {
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      toast.error("Enter a question first.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await askIntelligence({ data: { query: trimmed } });
      setAiAnswer(result);
      setQuery(trimmed);
    } catch (error) {
      toast.error(getAiErrorMessage(error));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="How healthy is your farmer data, and what needs attention today."
        actions={<Button asChild><Link to="/upload">Upload data</Link></Button>}
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total farmers"    value={fmt(totalFarmers)}  hint="Live from Neo4j"                                              tone="good"    icon={Users} />
        <StatCard label="Data completeness" value={`${completenessPct}%`} hint={completenessPct >= 70 ? "Above 70% threshold" : "Below 70% threshold"} tone={completenessPct >= 70 ? "good" : "warning"} icon={TrendingUp} />
        <StatCard label="Decision-ready"   value={fmt(decisionReady)} hint={`${readinessPct}% of farmer base`}                            tone="default" icon={CheckCircle2} />
        <StatCard label="Pending actions"  value={pendingActions}      hint="Awaiting human review"                                        tone="bad"     icon={AlertTriangle} />
      </div>

      {/* ── Source health + Readiness radial ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2 shadow-none border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Data health by source</CardTitle>
            <p className="text-xs text-muted-foreground">Completeness % across ingested sources.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ completeness: { label: "Completeness %", color: "var(--primary)" } }} className="h-[280px] w-full">
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--primary)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} tick={{ fill: "var(--muted-foreground)" }} unit="%" />
                <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ""} />} />
                <Bar dataKey="completeness" fill="url(#barFill)" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Decision-ready</CardTitle>
            <p className="text-xs text-muted-foreground">Share of farmer base passing at least one decision threshold.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ ready: { label: "Ready", color: "var(--primary)" } }} className="h-[200px] w-full">
              <RadialBarChart data={readinessData} innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "var(--muted)" }} />
              </RadialBarChart>
            </ChartContainer>
            <div className="-mt-[140px] text-center pointer-events-none">
              <div className="text-3xl font-semibold tracking-tight text-foreground">{readinessPct}%</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{fmt(decisionReady)} farmers</div>
            </div>
            <div className="mt-[60px] grid grid-cols-3 gap-2 text-center text-[11px]">
              <div><div className="font-semibold text-foreground">{creditPct}%</div>   <div className="text-muted-foreground">Credit</div></div>
              <div><div className="font-semibold text-foreground">{insurancePct}%</div><div className="text-muted-foreground">Insurance</div></div>
              <div><div className="font-semibold text-foreground">{inputPct}%</div>    <div className="text-muted-foreground">Input</div></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tier funnel + Payment mix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="shadow-none border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Farmer tier funnel</CardTitle>
            <p className="text-xs text-muted-foreground">Farmers move up tiers as more verified data is collected.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Farmers", color: "var(--primary)" } }} className="h-[220px] w-full">
              <BarChart data={tierDist} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                <YAxis dataKey="tier" type="category" tickLine={false} axisLine={false} fontSize={11} width={56} tick={{ fill: "var(--foreground)" }} />
                <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent labelFormatter={(_, p) => { const d = p?.[0]?.payload as { tier?: string; label?: string; unlocks?: string }; return d ? `${d.tier} · ${d.label} — unlocks ${d.unlocks}` : ""; }} />} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28}>
                  {tierDist.map((_, i) => <Cell key={i} fill={`oklch(${0.52 + i * 0.08} 0.09 162)`} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Payment mix</CardTitle>
            <p className="text-xs text-muted-foreground">Cash vs digital onramp across the farmer base.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={paymentConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
                  {paymentMix.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-2 space-y-1 text-xs">
              {paymentMix.map((p) => (
                <li key={p.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}
                  </span>
                  <span className="text-muted-foreground">{fmt(p.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ── Baseline coverage + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="shadow-none border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">GoK baseline field coverage</CardTitle>
            <p className="text-xs text-muted-foreground">The 6 fields Kenya's MoALFC requires for KIAMIS registration.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ coverage: { label: "Coverage %", color: "var(--primary)" } }} className="h-[220px] w-full">
              <BarChart data={baselineCoverage} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="field" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} unit="%" tick={{ fill: "var(--muted-foreground)" }} />
                <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent />} />
                <Bar dataKey="coverage" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {baselineCoverage.map((d, i) => (
                    <Cell key={i} fill={d.coverage >= 85 ? "var(--primary)" : d.coverage >= 70 ? "oklch(0.78 0.16 75)" : "var(--destructive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.length ? activity.map((a, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-foreground leading-snug">{a.text}</p>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-none border">
        <CardHeader>
          <CardTitle className="text-base">AI intelligence preview</CardTitle>
          <p className="text-xs text-muted-foreground">Ask a dataset question directly from the dashboard and see the result in context.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about missing fields, eligibility, or source gaps..."
                className="flex-1 min-w-[220px]"
                disabled={aiLoading}
              />
              <Button onClick={() => void handleAiQuestion()} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run AI query"}
              </Button>
            </div>

            {aiAnswer ? (
              <div className="rounded-xl border bg-muted/50 p-4">
                <p className="text-sm text-foreground font-semibold">AI summary</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{aiAnswer.summary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3 text-xs">
                    <p className="font-medium text-foreground">Sources</p>
                    <p className="mt-1 text-muted-foreground">{aiAnswer.sources.length ? aiAnswer.sources.join(", ") : "None"}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-xs">
                    <p className="font-medium text-foreground">Matches</p>
                    <p className="mt-1 text-muted-foreground">{aiAnswer.farmerIds.length ? `${aiAnswer.farmerIds.length} farmers identified` : "No matching farmers"}</p>
                  </div>
                </div>
                {aiAnswer.reasoning ? (
                  <div className="mt-3 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Reasoning</p>
                    <p className="mt-1 leading-relaxed">{aiAnswer.reasoning}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Run a query to see AI intelligence here.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Attention table ── */}
      <Card className="mt-6 shadow-none border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Farmers needing attention</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/data-quality" className="text-primary">View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Link>
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
              {attention.length ? attention.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <div className="font-medium text-foreground">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.id}</div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{f.region}, {f.country}</td>
                  <td className="px-6 py-3 text-muted-foreground">{f.crop}</td>
                  <td className="px-6 py-3"><CompletenessBar value={f.completeness} /></td>
                  <td className="px-6 py-3"><StatusBadge status={f.credit} /></td>
                  <td className="px-6 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/farmers" className="text-primary">Review</Link>
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No farmers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
