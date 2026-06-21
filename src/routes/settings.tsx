import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · FarmIQ" },
      { name: "description", content: "Organization profile, team roles, data fields and decision checklists." },
    ],
  }),
  component: SettingsPage,
});

const team = [
  { name: "Agnes Owino", email: "agnes@agrovesto.co.ke", role: "Admin" },
  { name: "Daniel Mwangi", email: "daniel@agrovesto.co.ke", role: "Analyst" },
  { name: "Linda Chukwu", email: "linda@tegemeo.org", role: "Analyst" },
  { name: "Joseph Otieno", email: "joseph@agrovesto.co.ke", role: "Viewer" },
];

const checklists = [
  { label: "Credit-ready", fields: ["Phone", "GPS", "2 seasons yield", "Cooperative link", "ID"] },
  { label: "Insurance-ready", fields: ["GPS", "Crop type", "Farm size", "Cooperative link"] },
  { label: "Input-ready", fields: ["Phone", "Region", "Primary crop"] },
];

function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your organization, team, data model and decision rules."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-none border lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Organization profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Organization name" value="Agrovesto Limited" />
            <Field label="Country" value="Kenya" />
            <Field label="Primary contact" value="Agnes Owino" />
            <Field label="Support email" value="ops@agrovesto.co.ke" />
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader><CardTitle className="text-base">Consent settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow title="Require consent before export" desc="Block exports of farmer data without a consent record." defaultChecked />
            <ToggleRow title="Auto-request consent via SMS" desc="Send a templated SMS to new farmers on ingest." />
            <ToggleRow title="Anonymize exports by default" desc="Strip phone and ID from CSV exports unless explicitly enabled." defaultChecked />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Team members</CardTitle>
          <Button size="sm">Invite member</Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-y bg-muted/40">
                <th className="text-left font-medium px-5 py-2.5">Name</th>
                <th className="text-left font-medium px-5 py-2.5">Email</th>
                <th className="text-left font-medium px-5 py-2.5">Role</th>
                <th className="text-right font-medium px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.email} className="border-b last:border-0">
                  <td className="px-5 py-3 font-medium">{m.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-[11px] font-semibold tracking-wider rounded px-1.5 py-0.5 ${
                        m.role === "Admin"
                          ? "bg-primary-soft text-accent-foreground"
                          : m.role === "Analyst"
                            ? "bg-muted text-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm">Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card className="shadow-none border">
          <CardHeader><CardTitle className="text-base">Decision checklists</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {checklists.map((c) => (
              <div key={c.label}>
                <div className="text-sm font-medium text-foreground">{c.label}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.fields.map((f) => (
                    <span key={f} className="text-xs rounded-md bg-muted px-2 py-0.5 text-foreground/80">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader><CardTitle className="text-base">Integrations</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {["Kenya FRP", "Nigeria NDFR", "M-Pesa history", "Satellite imagery"].map((i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm font-medium">{i}</div>
                <span className="mt-2 inline-block text-[10px] font-semibold tracking-wider rounded bg-[var(--warning)]/15 text-[var(--warning)] px-1.5 py-0.5">
                  COMING SOON
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="label-eyebrow">{label}</label>
      <Input className="mt-2 h-9" defaultValue={value} />
    </div>
  );
}

function ToggleRow({ title, desc, defaultChecked }: { title: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
