import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Download, BookmarkPlus } from "lucide-react";
import { PageHeader, CompletenessBar } from "@/components/page-header";
import { farmers, suggestedQueries } from "@/data/sample";

export const Route = createFileRoute("/intelligence")({
  head: () => ({
    meta: [
      { title: "Intelligence · FarmIQ" },
      { name: "description", content: "Ask plain-language questions and get traceable answers from your farmer data." },
    ],
  }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const [query, setQuery] = useState("");
  const result = farmers.filter((f) => f.region === "Machakos" || f.credit === "ready");
  return (
    <div>
      <PageHeader
        title="Intelligence"
        description="Ask FarmIQ a question in plain English. Every answer traces back to source records."
      />

      <Card className="shadow-none border">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
            <Sparkles className="h-4 w-4 text-primary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask FarmIQ anything about your farmers…"
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
            />
            <Button>Ask</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestedQueries.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-xs rounded-full border bg-muted/40 hover:bg-primary-soft hover:border-primary/30 px-3 py-1.5 text-foreground transition"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6">
        <Card className="shadow-none border lg:col-span-3">
          <CardHeader>
            <span className="label-eyebrow">Answer</span>
            <CardTitle className="text-lg leading-snug mt-1">
              47 farmers in Machakos grow maize with verified yield records but have no insurance product linked to their profile.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b bg-muted/40">
                    <th className="text-left font-medium px-4 py-2">Farmer</th>
                    <th className="text-left font-medium px-4 py-2">Region</th>
                    <th className="text-left font-medium px-4 py-2">Crop</th>
                    <th className="text-left font-medium px-4 py-2">Completeness</th>
                    <th className="text-left font-medium px-4 py-2">Insurance gap</th>
                  </tr>
                </thead>
                <tbody>
                  {result.slice(0, 6).map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{f.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{f.region}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{f.crop}</td>
                      <td className="px-4 py-2.5"><CompletenessBar value={f.completeness} /></td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-destructive">No insurance linked</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                Generated from 3 sources:{" "}
                <a className="text-primary underline-offset-2 hover:underline">Field Agent Export — March</a>,{" "}
                <a className="text-primary underline-offset-2 hover:underline">Tegemeo Cooperative Register</a>,{" "}
                <a className="text-primary underline-offset-2 hover:underline">Kenya Farmers Registry</a>.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> Save insight</Button>
                <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle className="text-base">Saved insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              "Credit-ready farmers, Q2",
              "Nigerian millet growers — input gap",
              "Cooperative coverage by county",
              "Consent backlog (rolling)",
            ].map((s) => (
              <div key={s} className="rounded-md border bg-muted/30 px-3 py-2 hover:bg-primary-soft transition cursor-pointer">
                <div className="font-medium text-foreground text-[13px]">{s}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Refreshed yesterday</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
