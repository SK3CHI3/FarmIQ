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
          <Button>
            <Plug className="h-4 w-4 mr-2" /> Add connection
          </Button>
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
                    <span className="font-medium text-foreground">{c.records?.toLocaleString()}</span>
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