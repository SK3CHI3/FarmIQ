import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, ShieldQuestion, FileWarning, ArrowRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  scanDataQuality,
  suggestDataFix,
  type AutoFixSuggestion,
} from "@/server/ai.functions";
import { getAiErrorMessage } from "@/lib/ai-errors";
import type { QualityScanResult } from "@/lib/farmer-validation";
import { toast } from "sonner";
import { getFarmers } from "@/server/farmers.functions";
import type { Farmer } from "@/data/sample";

export const Route = createFileRoute("/data-quality")({
  head: () => ({
    meta: [
      { title: "Data Quality · FarmIQ" },
      { name: "description", content: "Diagnose missing, duplicated and unverified records across your farmer dataset." },
    ],
  }),
  loader: () => getFarmers(),
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
  const farmers = Route.useLoaderData();
  const [scan, setScan] = useState<QualityScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const issues = scan?.issues ?? [];
  const summary = useMemo(() => {
    const missingFields = issues
      .filter((i) => i.type.includes("Missing") || i.type.includes("unverified"))
      .reduce((sum, i) => sum + i.count, 0);
    const duplicates = issues.find((i) => i.type.includes("Duplicate"))?.count ?? 0;
    const unverified = issues.find((i) => i.type.includes("unverified"))?.count ?? 0;
    const consentMissing = issues.find((i) => i.type.includes("Consent not collected"))?.count ?? 0;
    return { missingFields, duplicates, unverified, consentMissing };
  }, [issues]);

  async function handleScan() {
    setLoading(true);
    try {
      const result = await scanDataQuality();
      setScan(result);
      toast.success(`Scanned ${result.totalFarmers} farmers · avg completeness ${result.averageCompleteness}%`);
    } catch (error) {
      toast.error(getAiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const issueRows = issues.length
    ? issues
    : [{ type: "Run a quality scan", count: 0, severity: "warning" as const, impact: "Click Run quality scan to evaluate your dataset.", farmerIds: [] }];

  const unverifiedFarmers = farmers.filter((f) =>
    scan?.validations.some(
      (v) => v.farmerId === f.id && v.fieldChecks.some((check) => check.status === "unverified"),
    ),
  );

  const consentMissingFarmers = farmers.filter((f) => f.consent === "Not collected");

  return (
    <div>
      <PageHeader
        title="Data Quality"
        description="Rule-based confirmation for tiers, readiness, and baseline fields — with Google Gemini suggestions for fixes."
        actions={
          <Button onClick={() => void handleScan()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run quality scan
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <IssueCard icon={FileWarning} label="Missing / unverified fields" count={summary.missingFields} tone="destructive" description="Across phone, GPS, land size and yield records" />
        <IssueCard icon={Copy} label="Duplicate records" count={summary.duplicates} tone="warning" description="Pairs across multiple sources" />
        <IssueCard icon={ShieldQuestion} label="Unverified data" count={summary.unverified} tone="warning" description="Need cross-source verification" />
        <IssueCard icon={AlertTriangle} label="Consent missing" count={summary.consentMissing} tone="destructive" description="Blocks third-party data export" />
      </div>

      {scan ? (
        <p className="text-xs text-muted-foreground mb-4">
          Last scan: {new Date(scan.scannedAt).toLocaleString("en-US")} · {scan.totalFarmers} farmers · avg completeness {scan.averageCompleteness}%
        </p>
      ) : null}

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
                  {issueRows.map((q) => (
                    <tr key={q.type} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{q.type}</td>
                      <td className="px-5 py-3">
                        <span className={`text-base font-semibold ${q.severity === "destructive" ? "text-destructive" : "text-[var(--warning)]"}`}>
                          {q.count}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{q.impact}</td>
                      <td className="px-5 py-3 text-right">
                        <ReviewIssueDialog
                          issue={q.type}
                          count={q.count}
                          impact={q.impact}
                          farmerIds={q.farmerIds}
                          allFarmers={farmers}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="duplicates" className="m-0 p-6 space-y-3">
              {farmers.length >= 2 ? (
                farmers.slice(0, Math.floor(farmers.length / 2)).map((f, i) => (
                  <MergeDialog key={f.id} left={f} right={farmers[i + Math.ceil(farmers.length / 2)]} />
                ))
              ) : (
                <EmptyTab title="No duplicates detected" sub="Run a quality scan to find duplicate farmer nodes across sources." cta="Run quality scan" onAction={() => void handleScan()} />
              )}
            </TabsContent>

            <TabsContent value="unverified" className="m-0 p-8">
              {unverifiedFarmers.length ? (
                <div className="space-y-2 text-sm">
                  {unverifiedFarmers.map((f) => (
                    <div key={f.id} className="rounded-lg border px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">Land size not verified in {f.source}</div>
                      </div>
                      <ReviewIssueDialog
                        issue="Land size unverified"
                        count={1}
                        impact="Needs field agent verification"
                        farmerIds={[f.id]}
                        allFarmers={farmers}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyTab
                  title={scan ? "No unverified data points found" : "No unverified data points yet"}
                  sub="Run a quality scan to detect fields that need cross-source verification."
                  cta="Run quality scan"
                  onAction={() => void handleScan()}
                />
              )}
            </TabsContent>

            <TabsContent value="consent" className="m-0 p-8">
              <div className="rounded-lg border bg-muted/30 p-6">
                <p className="text-sm">
                  <span className="font-semibold">{consentMissingFarmers.length} farmer{consentMissingFarmers.length !== 1 ? "s" : ""}</span>{" "}
                  {consentMissingFarmers.length === 0
                    ? "— all farmers have consent on file."
                    : "have no consent record on file. These profiles will not be exported to third parties."}
                </p>
                {consentMissingFarmers.length > 0 && (
                  <SendConsentDialog count={consentMissingFarmers.length} />
                )}
              </div>
              {consentMissingFarmers.length > 0 && (
                <div className="mt-4 text-xs text-muted-foreground">
                  Affected: {consentMissingFarmers.map((f) => f.name).join(", ")}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function EmptyTab({ title, sub, cta, onAction }: { title: string; sub: string; cta: string; onAction?: () => void }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      <Button className="mt-4" onClick={onAction}>{cta}</Button>
    </div>
  );
}

function ReviewIssueDialog({
  issue, count, impact, farmerIds, allFarmers,
}: {
  issue: string;
  count: number;
  impact: string;
  farmerIds: string[];
  allFarmers: Farmer[];
}) {
  const sample = allFarmers.filter((f) => farmerIds.includes(f.id)).slice(0, 5);
  const fallbackSample = sample.length ? sample : allFarmers.slice(0, Math.min(5, Math.max(count, 1)));
  const targetFarmer = fallbackSample[0];
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AutoFixSuggestion | null>(null);

  async function handleSuggest() {
    if (!targetFarmer) return;
    setLoading(true);
    try {
      const result = await suggestDataFix({ data: { farmerId: targetFarmer.id, issue } });
      setSuggestion(result);
      toast.success("AI suggestions ready for review");
    } catch (error) {
      toast.error(getAiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary">Review</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{issue}</DialogTitle>
          <DialogDescription>{count} affected farmers · {impact}</DialogDescription>
        </DialogHeader>
        {fallbackSample.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b bg-muted/40">
                  <th className="text-left font-medium px-4 py-2">Farmer</th>
                  <th className="text-left font-medium px-4 py-2">Region</th>
                  <th className="text-left font-medium px-4 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {fallbackSample.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{f.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{f.region}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {suggestion ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{suggestion.summary}</p>
            {suggestion.suggestions.map((item) => (
              <div key={item.field} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.field}</span>
                  <Badge variant="secondary">{item.confidence} confidence</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{item.rationale}</p>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Suggested:</span> {item.suggestedValue}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline">Assign to field agent</Button>
          <Button onClick={() => void handleSuggest()} disabled={loading || !targetFarmer}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Auto-fix with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({ left, right }: { left: Farmer; right: Farmer | undefined }) {
  if (!right) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full text-left rounded-lg border bg-card hover:bg-muted/30 p-4 transition">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1">
              <div className="font-medium">{left.name}</div>
              <div className="text-xs text-muted-foreground">{left.source}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{right.name}</div>
              <div className="text-xs text-muted-foreground">{right.source}</div>
            </div>
            <Badge variant="secondary" className="bg-[var(--warning)]/15 text-[var(--warning)] border-0">potential match</Badge>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge duplicate records</DialogTitle>
          <DialogDescription>Pick the canonical record. We'll keep its ID and merge the rest.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {[left, right].map((f, idx) => (
            <label key={f.id} className="rounded-lg border p-4 hover:border-primary cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{f.id}</span>
                <input type="radio" name="canonical" defaultChecked={idx === 0} />
              </div>
              <div className="mt-2 font-semibold text-sm">{f.name}</div>
              <div className="text-xs text-muted-foreground">{f.region}, {f.country}</div>
              <div className="mt-3 text-xs space-y-1">
                <div><span className="text-muted-foreground">Phone:</span> {f.phone}</div>
                <div><span className="text-muted-foreground">Crop:</span> {f.crop}</div>
                <div><span className="text-muted-foreground">Source:</span> {f.source}</div>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline">Mark as not a duplicate</Button>
          <Button>Merge records</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendConsentDialog({ count }: { count: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mt-4">Send consent SMS</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send consent SMS</DialogTitle>
          <DialogDescription>A templated message will be sent to {count} farmers. They can reply YES to consent.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-foreground/80">
          Hi {"{name}"}, this is FarmIQ on behalf of Agrovesto. Reply YES to consent to sharing your farm data for credit and insurance services. Reply STOP to opt out.
        </div>
        <DialogFooter>
          <Button variant="outline">Edit template</Button>
          <Button>Send {count} messages</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
