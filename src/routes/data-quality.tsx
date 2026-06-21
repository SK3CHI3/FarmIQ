import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, ShieldQuestion, FileWarning } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { qualityIssues, farmers } from "@/data/sample";

export const Route = createFileRoute("/data-quality")({
  head: () => ({
    meta: [
      { title: "Data Quality · FarmIQ" },
      { name: "description", content: "Diagnose missing, duplicated and unverified records across your farmer dataset." },
    ],
  }),
  component: DataQualityPage,
});

function IssueCard({
  icon: Icon,
  label,
  count,
  tone,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  tone: "destructive" | "warning";
  description: string;
}) {
  const color = tone === "destructive" ? "text-destructive" : "text-[var(--warning)]";
  const bg = tone === "destructive" ? "bg-destructive/10" : "bg-[var(--warning)]/10";
  return (
    <Card className="shadow-none border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="label-eyebrow">{label}</span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </span>
        </div>
        <div className={`mt-3 text-3xl font-semibold tracking-tight ${color}`}>{count}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DataQualityPage() {
  return (
    <div>
      <PageHeader
        title="Data Quality"
        description="What's wrong with your data, how bad it is, and what to do about it."
        actions={<Button>Run quality scan</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <IssueCard icon={FileWarning} label="Missing fields" count={749} tone="destructive" description="Across phone, GPS and yield records" />
        <IssueCard icon={Copy} label="Duplicate records" count={12} tone="warning" description="Pairs across multiple sources" />
        <IssueCard icon={ShieldQuestion} label="Unverified data" count={206} tone="warning" description="Need cross-source verification" />
        <IssueCard icon={AlertTriangle} label="Consent missing" count={98} tone="destructive" description="Block third-party data export" />
      </div>

      <Card className="shadow-none border">
        <Tabs defaultValue="missing">
          <CardHeader className="border-b">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="missing">Missing</TabsTrigger>
              <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
              <TabsTrigger value="unverified">Unverified</TabsTrigger>
              <TabsTrigger value="consent">Consent</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="missing" className="m-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b bg-muted/40">
                    <th className="text-left font-medium px-5 py-2.5">Issue</th>
                    <th className="text-left font-medium px-5 py-2.5">Farmers affected</th>
                    <th className="text-left font-medium px-5 py-2.5">Downstream impact</th>
                    <th className="text-right font-medium px-5 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityIssues.map((q) => (
                    <tr key={q.type} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{q.type}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-base font-semibold ${
                            q.severity === "destructive" ? "text-destructive" : "text-[var(--warning)]"
                          }`}
                        >
                          {q.count}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{q.impact}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-primary">Review</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
            <TabsContent value="duplicates" className="m-0 p-8">
              <EmptyTab title="12 duplicate pairs awaiting merge" sub="Review pairs side-by-side and confirm the canonical record." cta="Open merge tool" />
            </TabsContent>
            <TabsContent value="unverified" className="m-0 p-8">
              <EmptyTab title="206 unverified data points" sub="Cross-check against a second source or assign to a field agent." cta="Assign to field agent" />
            </TabsContent>
            <TabsContent value="consent" className="m-0 p-8">
              <div className="rounded-lg border bg-muted/30 p-6">
                <p className="text-sm">
                  <span className="font-semibold">98 farmers</span> have no consent record on file.
                  These profiles will not be exported to third parties.
                </p>
                <Button className="mt-4">Send consent SMS (mocked)</Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Sample: {farmers.filter((f) => f.consent !== "Consented").map((f) => f.name).join(", ")}…
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function EmptyTab({ title, sub, cta }: { title: string; sub: string; cta: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      <Button className="mt-4">{cta}</Button>
    </div>
  );
}
