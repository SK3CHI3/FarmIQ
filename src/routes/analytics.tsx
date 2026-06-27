import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  Line, LineChart, Legend, Radar, RadarChart, PolarAngleAxis, PolarGrid,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { dataSources } from "@/data/sample";
import { getFarmers } from "@/server/farmers.server";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · FarmIQ" },
      { name: "description", content: "Compare data sources, regions and crop readiness across your farmer base." },
    ],
  }),
  loader: () => getFarmers(),
  component: AnalyticsPage,
});

const regionTrend = [
  { month: "Jan", "Central Valley": 58, "Eastern Highlands": 49 },
  { month: "Feb", "Central Valley": 62, "Eastern Highlands": 53 },
  { month: "Mar", "Central Valley": 68, "Eastern Highlands": 58 },
  { month: "Apr", "Central Valley": 73, "Eastern Highlands": 61 },
  { month: "May", "Central Valley": 79, "Eastern Highlands": 66 },
  { month: "Jun", "Central Valley": 84, "Eastern Highlands": 70 },
];

function AnalyticsPage() {
  const farmers = Route.useLoaderData();
  const [metric, setMetric] = useState<"completeness" | "records">("completeness");

  const sourceData = dataSources.map((s) => ({
    name: s.name.split(" ").slice(0, 2).join(" "),
    full: s.name,
    completeness: s.completeness,
    records: s.records,
  }));

  // Derive country stats from real DB farmers
  const countries = ["Kenya", "Nigeria"] as const;
  const countryData = countries.map((c) => {
    const list = farmers.filter((f) => f.country === c);
    if (!list.length) return { country: c, completeness: 0, creditReady: 0, insuranceReady: 0 };
    const avg = Math.round(list.reduce((a, f) => a + f.completeness, 0) / list.length);
    const creditReady = Math.round((list.filter((f) => f.credit === "ready").length / list.length) * 100);
    const insuranceReady = Math.round((list.filter((f) => f.insurance === "ready").length / list.length) * 100);
    return { country: c, completeness: avg, creditReady, insuranceReady };
  });

  // Radar from real data
  const regions = [...new Set(farmers.map((f) => f.region))];
  const radarData = ["Credit", "Insurance", "Input"].map((axis) => {
    const entry: Record<string, unknown> = { axis };
    regions.forEach((r) => {
      const list = farmers.filter((f) => f.region === r);
      const key = axis.toLowerCase() as "credit" | "insurance" | "input";
      entry[r] = list.length
        ? Math.round((list.filter((f) => f[key] === "ready").length / list.length) * 100)
        : 0;
    });
    return entry;
  });

  const radarConfig = regions.reduce(
    (acc, r, i) => ({
      ...acc,
      [r]: { label: r, color: `oklch(${0.55 + i * 0.1} 0.15 ${160 + i * 60})` },
    }),
    {} as ChartConfig,
  );

  const trendRegions = [...new Set(regionTrend.flatMap((d) => Object.keys(d).filter((k) => k !== "month")))];
  const trendConfig = trendRegions.reduce(
    (acc, r, i) => ({
      ...acc,
      [r]: { label: r, color: `oklch(${0.55 + i * 0.12} 0.15 ${160 + i * 55})` },
    }),
    {} as ChartConfig,
  );

  const sourceConfig = {
    completeness: { label: "Completeness %", color: "var(--primary)" },
    records: { label: "Records", color: "var(--primary)" },
  } satisfies ChartConfig;

  const countryConfig = {
    completeness: { label: "Completeness", color: "var(--primary)" },
    creditReady: { label: "Credit ready %", color: "oklch(0.7 0.15 200)" },
    insuranceReady: { label: "Insurance ready %", color: "oklch(0.68 0.16 50)" },
  } satisfies ChartConfig;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Compare data sources, regions and readiness metrics across your farmer base."
      />

      <Tabs defaultValue="sources" className="w-full">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-4">
          <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Compare data sources</CardTitle>
              <Select value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completeness">Completeness %</SelectItem>
                  <SelectItem value="records">Record count</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ChartContainer config={sourceConfig} className="h-[320px] w-full">
                <BarChart data={sourceData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ""} />} />
                  <Bar dataKey={metric} fill={`var(--color-${metric})`} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="mt-4">
          <Card className="shadow-none border">
            <CardHeader>
              <CardTitle className="text-base">Completeness trend by region (6 mo)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={trendConfig} className="h-[320px] w-full">
                <LineChart data={regionTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {trendRegions.map((r) => (
                    <Line key={r} type="monotone" dataKey={r} stroke={`var(--color-${r})`} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries" className="mt-4">
          <Card className="shadow-none border">
            <CardHeader>
              <CardTitle className="text-base">Kenya vs Nigeria — live data</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={countryConfig} className="h-[320px] w-full">
                <BarChart data={countryData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="country" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="completeness" fill="var(--color-completeness)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="creditReady" fill="var(--color-creditReady)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="insuranceReady" fill="var(--color-insuranceReady)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="mt-4">
          <Card className="shadow-none border">
            <CardHeader>
              <CardTitle className="text-base">Readiness profile by region — live data</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={radarConfig} className="h-[340px] w-full">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="axis" fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {regions.map((r) => (
                    <Radar key={r} dataKey={r} stroke={`var(--color-${r})`} fill={`var(--color-${r})`} fillOpacity={0.3} />
                  ))}
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
