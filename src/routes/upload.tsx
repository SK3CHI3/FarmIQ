import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { dataSources } from "@/data/sample";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload · FarmIQ" },
      { name: "description", content: "Bring in new farmer data — CSV, spreadsheets or field exports." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  return (
    <div>
      <PageHeader
        title="Upload data"
        description="Drop in a CSV or spreadsheet. FarmIQ parses, deduplicates and scores completeness automatically."
      />

      <Card className="shadow-none border">
        <CardContent className="p-8">
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary-soft/40 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card border">
              <UploadCloud className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">Drop your file here</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              CSV, XLSX or TSV up to 50&nbsp;MB. We support farmer registries, cooperative exports and field-agent rosters.
            </p>
            <Button className="mt-5">Choose file</Button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-eyebrow">Source label</label>
              <Input className="mt-2 h-9" defaultValue="Field Agent Export — June 2026" />
            </div>
            <div>
              <label className="label-eyebrow">Region scope</label>
              <Input className="mt-2 h-9" defaultValue="Machakos, Kenya" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-none border lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent uploads</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-y bg-muted/40">
                  <th className="text-left font-medium px-5 py-2.5">Source</th>
                  <th className="text-left font-medium px-5 py-2.5">Records</th>
                  <th className="text-left font-medium px-5 py-2.5">Completeness</th>
                  <th className="text-left font-medium px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((s) => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{s.records.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-sm font-medium ${
                          s.completeness >= 70 ? "text-primary" : s.completeness >= 40 ? "text-[var(--warning)]" : "text-destructive"
                        }`}
                      >
                        {s.completeness}%
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Parsed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader><CardTitle className="text-base">What happens next</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              "FarmIQ detects column headers and maps to standard fields.",
              "Records are deduplicated against your existing farmer graph.",
              "Completeness and decision-readiness scores update automatically.",
              "You'll see a summary on the dashboard in under a minute.",
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-primary-soft text-accent-foreground text-[11px] font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-foreground/80 leading-snug">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
