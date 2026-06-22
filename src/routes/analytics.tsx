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
import { dataSources, farmers } from "@/data/sample";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · FarmIQ" },
      { name: "description", content: "Compare data sources, regions and crop readiness across your farmer base." },
    ],
  }),
  component: AnalyticsPage,
});

const regionTrend = [
  { month: "Jan", Machakos: 58, Kisumu: 49, Kano: 32, Lagos: 41 },
  { month: "Feb", Machakos: 62, Kisumu: 53, Kano: 36, Lagos: 44 },
  { month: "Mar", Machakos: 68, Kisumu: 58, Kano: 41, Lagos: 48 },
  { month: "Apr", Machakos: 73, Kisumu: 61, Kano: 44, Lagos: 52 },
  { month: "May", Machakos: 79, Kisumu: 66, Kano: 47, Lagos: 55 },
  { month: "Jun", Machakos: 84, Kisumu: 70, Kano: 51, Lagos: 58 },
];

function AnalyticsPage() {
  const [metric, setMetric] = useState<"completeness" | "records">("completeness");

  const sourceData = dataSources.map((s) => ({
    name: s.name.split(" ").slice(0, 2).join(" "),
    full: s.name,
    completeness: s.completeness,
    records: s.records,
  }));

  // Country comparison
  const countries = ["Kenya", "Nigeria"] as const;
  const countryData = countries.map((c) => {
    const list = farmers.filter((f) => f.country === c);
    const avg = Math.round(list.reduce((a, f) => a + f.completeness, 0) / list.length);
    const creditReady = list.filter((f) => f.credit === "ready").length;
    const insuranceReady = list.filter((f) => f.insurance === "ready").length;
    return { country: c, Completeness: avg, "Credit ready %": Math.round((creditReady / list.length) * 100), "Insurance ready %": Math.round((insuranceReady / list.length) * 100) };
  });

  const readinessRadar = countries.map((c) => {
    const list = farmers.filter((f) => f.country === c);
    const pct = (key: "credit" | "insurance" | "input") =>
      Math.round((list.filter((f) => f[key] === "ready").length / list.length) * 100);
    return { country: c, Credit: pct("credit"), Insurance: pct("insurance"), Input: pct("input") };
  });
  const radarData = ["Credit", "Insurance", "Input"].map((axis) => ({
    axis,
    Kenya: readinessRadar[0][axis as "Credit"],
    Nigeria: readinessRadar[1][axis as "Credit"],
  }));

  const sourceConfig = {
    completeness: { label: "Completeness %", color: "var(--primary)" },
    records: { label: "Records", color: "var(--primary)" },
  } satisfies ChartConfig;

  const trendConfig = {
    Machakos: { label: "Machakos", color: "var(--primary)" },
    Kisumu: { label: "Kisumu", color: "oklch(0.7 0.15 200)" },
    Kano: { label: "Kano", color: "oklch(0.68 0.16 50)" },
    Lagos: { label: "Lagos", color: "oklch(0.6 0.18 320)" },
  } satisfies ChartConfig;

  const countryConfig = {
    Completeness: { label: "Completeness", color: "var(--primary)" },
    "Credit ready %": { label: "Credit ready", color: "oklch(0.7 0.15 200)" },
    "Insurance ready %": { label: "Insurance ready", color: "oklch(0.68 0.16 50)" },
  } satisfies ChartConfig;

  const radarConfig = {
    Kenya: { label: "Kenya", color: "var(--primary)" },
    Nigeria: { label: "Nigeria", color: "oklch(0.68 0.16 50)" },
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
                  <Line type="monotone" dataKey="Machakos" stroke="var(--color-Machakos)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Kisumu" stroke="var(--color-Kisumu)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Kano" stroke="var(--color-Kano)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Lagos" stroke="var(--color-Lagos)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries" className="mt-4">
          <Card className="shadow-none border">
            <CardHeader>
              <CardTitle className="text-base">Kenya vs Nigeria</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={countryConfig} className="h-[320px] w-full">
                <BarChart data={countryData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="country" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="Completeness" fill="var(--color-Completeness)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Credit ready %" fill="var(--color-Credit ready %)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Insurance ready %" fill="var(--color-Insurance ready %)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="mt-4">
          <Card className="shadow-none border">
            <CardHeader>
              <CardTitle className="text-base">Readiness profile by country</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={radarConfig} className="h-[340px] w-full">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="axis" fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Radar dataKey="Kenya" stroke="var(--color-Kenya)" fill="var(--color-Kenya)" fillOpacity={0.3} />
                  <Radar dataKey="Nigeria" stroke="var(--color-Nigeria)" fill="var(--color-Nigeria)" fillOpacity={0.3} />
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}