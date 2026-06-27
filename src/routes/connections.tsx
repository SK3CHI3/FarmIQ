import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database, FileSpreadsheet, Cloud, Webhook, Network, MessageSquare, Plug,
  CheckCircle2, RefreshCw, Settings2, Copy,
} from "lucide-react";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { title: "Connections · FarmIQ" },
      { name: "description", content: "Connect and sync data sources, APIs and graph databases into FarmIQ." },
    ],
  }),
  component: ConnectionsPage,
});

type Status = "connected" | "available" | "syncing";

const connectors: Array<{
  name: string;
  category: string;
  description: string;
  status: Status;
  lastSync?: string;
  records?: number;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { name: "Neo4j Graph DB", category: "Graph database", description: "Sync farmer relationships, cooperatives and supply graphs into Neo4j.", status: "connected", lastSync: "2 min ago", records: 4742, icon: Network },
  { name: "Supabase Postgres", category: "Database", description: "Mirror records into your Supabase project for SQL access.", status: "connected", lastSync: "14 min ago", records: 4742, icon: Database },
  { name: "Google Sheets", category: "Spreadsheet", description: "Two-way sync with field-agent registration sheets.", status: "syncing", lastSync: "syncing…", records: 1240, icon: FileSpreadsheet },
  { name: "AWS S3 Bucket", category: "Object storage", description: "Drop CSV exports into a watched S3 prefix for ingestion.", status: "available", icon: Cloud },
  { name: "Webhook Endpoint", category: "API", description: "Receive farmer events from your own systems via signed webhooks.", status: "available", icon: Webhook },
  { name: "WhatsApp Business", category: "Messaging", description: "Pull consent responses and field-agent submissions from WhatsApp.", status: "available", icon: MessageSquare },
];

const statusStyles: Record<Status, string> = {
  connected: "bg-primary-soft text-accent-foreground",
  syncing: "bg-amber-50 text-amber-700",
  available: "bg-muted text-muted-foreground",
};

function ConnectionsPage() {
  return (
    <div>
      <PageHeader
        title="Connections"
        description="Wire FarmIQ to your data sources — graph DB, warehouses, sheets, and APIs."
        actions={
          <AddConnectionDialog />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((c) => (
          <Card key={c.name} className="shadow-none border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{c.name}</CardTitle>
                    <CardDescription className="text-xs">{c.category}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className={`text-[10px] font-medium border-0 ${statusStyles[c.status]}`}>
                  {c.status === "connected" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {c.status === "syncing" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                  {c.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{c.description}</p>

              {c.status === "connected" || c.status === "syncing" ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Last sync</span>
                    <span className="font-medium text-foreground">{c.lastSync}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Records</span>
                    <span className="font-medium text-foreground">{c.records?.toLocaleString("en-US")}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked id={`auto-${c.name}`} />
                      <label htmlFor={`auto-${c.name}`} className="text-xs text-muted-foreground">Auto-sync</label>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-primary">
                      <RefreshCw className="h-3 w-3 mr-1" /> Sync now
                    </Button>
                  </div>
                  <ConfigureConnectionDialog name={c.name} />
                </div>
              ) : (
                <ConnectDialog name={c.name} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 shadow-none border">
        <CardHeader>
          <CardTitle className="text-base">API & webhooks</CardTitle>
          <CardDescription>Use these endpoints to push or pull data programmatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { method: "POST", path: "/api/v1/farmers", desc: "Create or upsert farmer records" },
            { method: "GET", path: "/api/v1/farmers?source=…", desc: "List farmers filtered by source or region" },
            { method: "POST", path: "/api/v1/webhooks/ingest", desc: "Signed webhook ingestion endpoint" },
            { method: "GET", path: "/api/v1/graph/farmer/{id}", desc: "Fetch Neo4j-backed relationship graph" },
          ].map((r) => (
            <div key={r.path} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">{r.method}</Badge>
                <code className="text-xs font-mono text-foreground truncate">{r.path}</code>
              </div>
              <span className="text-xs text-muted-foreground ml-4 hidden sm:inline">{r.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AddConnectionDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><Plug className="h-4 w-4 mr-2" /> Add connection</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new connection</DialogTitle>
          <DialogDescription>Pick a connector and provide credentials. We'll test the connection before saving.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {["Neo4j", "Postgres", "S3", "Webhook", "Sheets", "Custom API"].map((t) => (
              <button key={t} className="rounded-md border bg-muted/30 hover:bg-primary-soft hover:border-primary/30 px-3 py-2 text-xs font-medium transition">
                {t}
              </button>
            ))}
          </div>
          <div>
            <Label className="text-xs">Connection name</Label>
            <Input className="mt-1.5 h-9" placeholder="e.g. Production Neo4j" />
          </div>
          <div>
            <Label className="text-xs">Endpoint URL</Label>
            <Input className="mt-1.5 h-9" placeholder="bolt://graph.example.com:7687" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Username</Label>
              <Input className="mt-1.5 h-9" />
            </div>
            <div>
              <Label className="text-xs">Password / token</Label>
              <Input type="password" className="mt-1.5 h-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Test connection</Button>
          <Button>Save connection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConnectDialog({ name }: { name: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">Connect</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {name}</DialogTitle>
          <DialogDescription>Enter the credentials needed to authenticate with {name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">API key / token</Label>
            <Input type="password" className="mt-1.5 h-9" placeholder="sk-…" />
          </div>
          <div>
            <Label className="text-xs">Endpoint (optional)</Label>
            <Input className="mt-1.5 h-9" />
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">Auto-sync every 15 min</span>
            <Switch defaultChecked />
          </div>
        </div>
        <DialogFooter>
          <Button>Connect</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigureConnectionDialog({ name }: { name: string }) {
  const endpoint = `https://api.farmiq.io/v1/sync/${name.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start text-muted-foreground hover:text-foreground">
          <Settings2 className="h-3 w-3 mr-1.5" /> Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Manage credentials, sync schedule and field mapping.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="mapping" className="flex-1">Mapping</TabsTrigger>
            <TabsTrigger value="logs" className="flex-1">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Endpoint</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={endpoint} readOnly className="h-9 font-mono text-xs" />
                <Button variant="outline" size="icon" className="h-9 w-9"><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Sync interval</Label>
              <Input className="mt-1.5 h-9" defaultValue="Every 15 minutes" />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <span className="text-xs">Notify on sync failure</span>
              <Switch defaultChecked />
            </div>
          </TabsContent>
          <TabsContent value="mapping" className="mt-4">
            <Textarea rows={6} defaultValue={'{\n  "farmer_id": "id",\n  "full_name": "name",\n  "region": "location.region"\n}'} className="font-mono text-xs" />
          </TabsContent>
          <TabsContent value="logs" className="mt-4 space-y-2">
            {["12:04 — Sync complete · 340 records", "11:49 — Sync complete · 12 records", "11:34 — Auth refreshed", "11:19 — Sync complete · 0 records"].map((l) => (
              <div key={l} className="text-xs font-mono text-muted-foreground border-l-2 border-primary/30 pl-2 py-1">{l}</div>
            ))}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline">Disconnect</Button>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}