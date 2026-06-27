import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Eye, Flag, Search, Loader2 } from "lucide-react";
import { PageHeader, CompletenessBar, StatusBadge } from "@/components/page-header";
import { FarmerSheet } from "@/components/farmer-sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getFarmers } from "@/server/farmers.server";

export const Route = createFileRoute("/farmers")({
  head: () => ({
    meta: [
      { title: "Farmer Records · FarmIQ" },
      { name: "description", content: "Browse, search and filter individual farmer profiles." },
    ],
  }),
  loader: () => getFarmers(),
  component: FarmersPage,
});

function FarmersPage() {
  const farmers = Route.useLoaderData();
  return (
    <div>
      <PageHeader
        title="Farmer Records"
        description="Search the farmer graph and inspect data completeness for each profile."
        actions={<Button variant="outline">Export selection</Button>}
      />

      <Card className="shadow-none border mb-4">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, ID or phone number…" className="pl-8 h-9" />
          </div>
          <Select defaultValue="all-regions">
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all-regions">All regions</SelectItem>
              <SelectItem value="machakos">Machakos</SelectItem>
              <SelectItem value="kisumu">Kisumu</SelectItem>
              <SelectItem value="kano">Kano</SelectItem>
              <SelectItem value="lagos">Lagos</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all-crops">
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all-crops">All crops</SelectItem>
              <SelectItem value="maize">Maize</SelectItem>
              <SelectItem value="sorghum">Sorghum</SelectItem>
              <SelectItem value="millet">Millet</SelectItem>
              <SelectItem value="wheat">Wheat</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All completeness</SelectItem>
              <SelectItem value="ready">Ready (70%+)</SelectItem>
              <SelectItem value="partial">Partial (40–70%)</SelectItem>
              <SelectItem value="incomplete">Incomplete (&lt;40%)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b bg-muted/40">
                <th className="text-left font-medium px-5 py-2.5">Farmer</th>
                <th className="text-left font-medium px-5 py-2.5">Region</th>
                <th className="text-left font-medium px-5 py-2.5">Crop</th>
                <th className="text-left font-medium px-5 py-2.5">Completeness</th>
                <th className="text-left font-medium px-5 py-2.5">Decision readiness</th>
                <th className="text-left font-medium px-5 py-2.5">Updated</th>
                <th className="text-right font-medium px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 group">
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.id}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {f.region}, {f.country}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-md bg-primary-soft px-2 py-0.5 text-xs text-accent-foreground">
                      {f.crop}
                    </span>
                  </td>
                  <td className="px-5 py-3"><CompletenessBar value={f.completeness} /></td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Pill label="CREDIT" ready={f.credit === "ready"} />
                      <Pill label="INSURANCE" ready={f.insurance === "ready"} />
                      <Pill label="INPUT" ready={f.input === "ready"} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{f.lastUpdated}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <FarmerSheet farmer={f}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View profile">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </FarmerSheet>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Flag for review">
                            <Flag className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Flag {f.name} for review?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This record will be queued for a data steward to verify. The farmer will not be exported to third parties until reviewed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Flag record</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-none border lg:col-span-2">
          <CardContent className="p-5">
            <span className="label-eyebrow">AI summary · James Ochieng</span>
            <p className="mt-3 text-sm text-foreground leading-relaxed">
              James has <span className="font-medium">2 seasons of verified maize yield records</span> but is missing
              a <span className="font-medium">cooperative membership number</span>. He is{" "}
              <span className="text-primary font-medium">credit-ready for input financing</span> but{" "}
              <span className="text-destructive font-medium">not yet eligible for insurance products</span>. Adding
              cooperative data would unlock insurance eligibility.
            </p>
            <div className="mt-4 flex gap-2">
              <StatusBadge status="ready" />
              <span className="text-xs text-muted-foreground">Source: Tegemeo Cooperative Register · Field Agent Export — March</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none border">
          <CardContent className="p-5">
            <span className="label-eyebrow">Completeness</span>
            <ul className="mt-3 space-y-2 text-sm">
              <CompletenessRow label="Personal info" status="complete" />
              <CompletenessRow label="Farm details" status="complete" />
              <CompletenessRow label="Production history" status="complete" />
              <CompletenessRow label="Cooperative membership #" status="missing" />
              <CompletenessRow label="GPS coordinates" status="unverified" />
              <CompletenessRow label="Consent record" status="complete" />
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Pill({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span
      className={`text-[10px] font-semibold tracking-wider rounded px-1.5 py-0.5 ${
        ready ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

function CompletenessRow({
  label,
  status,
}: {
  label: string;
  status: "complete" | "missing" | "unverified";
}) {
  const map = {
    complete: { dot: "bg-primary", text: "text-foreground" },
    missing: { dot: "bg-destructive", text: "text-foreground" },
    unverified: { dot: "bg-[var(--warning)]", text: "text-foreground" },
  } as const;
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${map[status].dot}`} />
      <span className={`flex-1 ${map[status].text}`}>{label}</span>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{status}</span>
    </li>
  );
}
