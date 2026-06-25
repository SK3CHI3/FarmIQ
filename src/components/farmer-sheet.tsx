import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CompletenessBar, StatusBadge } from "@/components/page-header";
import { MapPin, Phone, Sprout, Calendar, ShieldCheck, Download, Flag, Network } from "lucide-react";
import type { Farmer } from "@/data/sample";
import type { ReactNode } from "react";

export function FarmerSheet({ farmer, children }: { farmer: Farmer; children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-accent-foreground font-semibold">
              {farmer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <SheetTitle className="text-base">{farmer.name}</SheetTitle>
              <SheetDescription className="text-xs">{farmer.id} · {farmer.source}</SheetDescription>
            </div>
            <Badge className="ml-auto bg-primary-soft text-accent-foreground hover:bg-primary-soft">Tier {farmer.tier}</Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="label-eyebrow">Completeness</span>
              <span className="text-xs font-medium">{farmer.completeness}%</span>
            </div>
            <div className="mt-2"><CompletenessBar value={farmer.completeness} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field icon={MapPin} label="Region" value={`${farmer.region}, ${farmer.country}`} />
            <Field icon={Sprout} label="Primary crop" value={farmer.crop} />
            <Field icon={Phone} label="Phone" value={farmer.phone} />
            <Field icon={Calendar} label="Last updated" value={farmer.lastUpdated} />
            <Field icon={ShieldCheck} label="Consent" value={farmer.consent} />
            <Field icon={Network} label="Source" value={farmer.source} />
          </div>

          <Separator />

          <div>
            <span className="label-eyebrow">Decision readiness</span>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ReadinessTile label="Credit" ready={farmer.credit === "ready"} />
              <ReadinessTile label="Insurance" ready={farmer.insurance === "ready"} />
              <ReadinessTile label="Input" ready={farmer.input === "ready"} />
            </div>
          </div>

          <div>
            <span className="label-eyebrow">AI summary</span>
            <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
              {farmer.name.split(" ")[0]} has verified records across personal and farm details. {farmer.insurance === "ready" ? "Eligible for insurance products." : "Insurance eligibility blocked — missing cooperative link or GPS."}
              {" "}Last activity {farmer.lastUpdated}.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={farmer.credit === "ready" && farmer.insurance === "ready" ? "ready" : "not-ready"} />
              <Badge variant="outline" className="text-[10px]">Traceable</Badge>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8 flex-row gap-2">
          <Button variant="outline" className="flex-1"><Flag className="h-4 w-4 mr-2" /> Flag</Button>
          <Button className="flex-1"><Download className="h-4 w-4 mr-2" /> Export profile</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ReadinessTile({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${ready ? "bg-primary-soft border-primary/20" : "bg-muted/40"}`}>
      <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">{label.toUpperCase()}</div>
      <div className={`mt-1 text-sm font-semibold ${ready ? "text-accent-foreground" : "text-muted-foreground"}`}>
        {ready ? "Ready" : "Not ready"}
      </div>
    </div>
  );
}