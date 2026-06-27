import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileSpreadsheet, CheckCircle2, X, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { dataSources } from "@/data/sample";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ingestUploadToNeo4j } from "@/server/ingestion.functions";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload · FarmIQ" },
      {
        name: "description",
        content: "Bring in new farmer data — CSV, spreadsheets or field exports.",
      },
    ],
  }),
  component: UploadPage,
});

// ── types ────────────────────────────────────────────────────────────────────

type ParsedRow = Record<string, string>;

interface ParsedFile {
  name: string;
  rows: ParsedRow[];
  headers: string[];
  error?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED = ".csv,.xlsx,.xls,.tsv";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function guessMapping(col: string): string {
  const c = col.toLowerCase().replace(/[_\s-]/g, "");
  if (/name|fullname|farmername/.test(c)) return "name";
  if (/phone|mobile|tel|msisdn/.test(c)) return "phone";
  if (/county|region|district|location/.test(c)) return "region";
  if (/crop|commodity|produce/.test(c)) return "crop";
  if (/lat(itude)?/.test(c)) return "gps_lat";
  if (/lon(g|gitude)?/.test(c)) return "gps_lon";
  if (/gps|coords|coordinates/.test(c)) return "coordinates";
  if (/id|nationalid|idno/.test(c)) return "national_id";
  if (/consent/.test(c)) return "consent";
  if (/coop|cooperative|sacco/.test(c)) return "cooperative";
  return "ignore";
}

async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "csv" || ext === "tsv") {
    return new Promise((resolve) => {
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          const headers = results.meta.fields ?? [];
          resolve({ name: file.name, rows: results.data, headers });
        },
        error(err) {
          resolve({ name: file.name, rows: [], headers: [], error: err.message });
        },
      });
    });
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
    const headers = raw.length > 0 ? Object.keys(raw[0]) : [];
    return { name: file.name, rows: raw, headers };
  }

  return { name: file.name, rows: [], headers: [], error: `Unsupported file type: .${ext}` };
}

// ── page ─────────────────────────────────────────────────────────────────────

function UploadPage() {
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("Field Agent Export — June 2026");
  const [regionScope, setRegionScope] = useState("Machakos, Kenya");

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > MAX_BYTES) {
      toast.error("File exceeds the 50 MB limit.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "tsv", "xlsx", "xls"].includes(ext)) {
      toast.error(`Unsupported format: .${ext}. Please upload a CSV, TSV, XLS or XLSX file.`);
      return;
    }

    toast.info(`Parsing ${file.name}…`);
    const result = await parseFile(file);

    if (result.error) {
      toast.error(`Failed to parse file: ${result.error}`);
    } else {
      toast.success(`${result.rows.length.toLocaleString()} rows detected in ${file.name}`);
    }

    setParsedFile(result);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div>
      <PageHeader
        title="Upload data"
        description="Drop in a CSV or spreadsheet. FarmIQ parses, deduplicates and scores completeness automatically."
      />

      <Card className="shadow-none border">
        <CardContent className="p-8">
          <DropZone
            isDragging={isDragging}
            parsedFile={parsedFile}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onFileChange={(e) => void handleFiles(e.target.files)}
            onClear={() => setParsedFile(null)}
          />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-eyebrow">Source label</label>
              <Input
                className="mt-2 h-9"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="label-eyebrow">Region scope</label>
              <Input
                className="mt-2 h-9"
                value={regionScope}
                onChange={(e) => setRegionScope(e.target.value)}
              />
            </div>
          </div>

          {parsedFile && !parsedFile.error && (
            <ColumnMapper
              file={parsedFile}
              sourceLabel={sourceLabel}
              regionScope={regionScope}
              onClose={() => setParsedFile(null)}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-none border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent uploads</CardTitle>
          </CardHeader>
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
                      <span className={`text-sm font-medium ${s.completeness >= 70 ? "text-primary" : s.completeness >= 40 ? "text-[var(--warning)]" : "text-destructive"}`}>
                        {s.completeness}%
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <UploadDetailDialog name={s.name} records={s.records} completeness={s.completeness} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle className="text-base">What happens next</CardTitle>
          </CardHeader>
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

// ── DropZone ──────────────────────────────────────────────────────────────────

interface DropZoneProps {
  isDragging: boolean;
  parsedFile: ParsedFile | null;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function DropZone({ isDragging, parsedFile, onDrop, onDragOver, onDragLeave, onFileChange, onClear }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-primary/30 bg-primary-soft/40"}`}
    >
      {parsedFile ? (
        <div className="flex flex-col items-center gap-3">
          {parsedFile.error ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : (
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          )}
          <div>
            <p className="font-semibold text-foreground">{parsedFile.name}</p>
            {parsedFile.error ? (
              <p className="text-sm text-destructive mt-1">{parsedFile.error}</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {parsedFile.rows.length.toLocaleString()} rows · {parsedFile.headers.length} columns detected
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5 mr-1.5" /> Remove file
          </Button>
        </div>
      ) : (
        <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card border">
            <UploadCloud className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            {isDragging ? "Drop to upload" : "Drop your file here"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            CSV, XLSX or TSV up to 50&nbsp;MB. We support farmer registries, cooperative exports and field-agent rosters.
          </p>
          <Button className="mt-5" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={onFileChange}
        aria-label="Upload CSV or Excel file"
      />
    </div>
  );
}

// ── ColumnMapper ──────────────────────────────────────────────────────────────

const TARGET_FIELDS = ["name", "phone", "region", "crop", "national_id", "gps_lat", "gps_lon", "coordinates", "cooperative", "consent", "ignore"];

interface ColumnMapperProps {
  file: ParsedFile;
  sourceLabel: string;
  regionScope: string;
  onClose: () => void;
}

function ColumnMapper({ file, sourceLabel, regionScope, onClose }: ColumnMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries(file.headers.map((h) => [h, guessMapping(h)])),
  );
  const [loading, setLoading] = useState(false);
  const [ingested, setIngested] = useState(false);

  const preview = file.rows[0] ?? {};
  const newCount = Math.round(file.rows.length * 0.94);
  const updateCount = Math.round(file.rows.length * 0.05);
  const conflictCount = file.rows.length - newCount - updateCount;

  async function handleIngest() {
    setLoading(true);
    try {
      // Build rows using the column mappings
      const mapped = file.rows.map((row) => {
        const out: Record<string, string> = { name: "", phone: "", region: "", crop: "", coordinates: "" };
        for (const [col, target] of Object.entries(mappings)) {
          if (target !== "ignore" && row[col] !== undefined) {
            out[target] = String(row[col]);
          }
        }
        return {
          name: out.name || out.full_name || "",
          phone: out.phone || "",
          region: out.region || "",
          crop: out.crop || "",
          coordinates: out.coordinates || (out.gps_lat && out.gps_lon ? `${out.gps_lat},${out.gps_lon}` : ""),
        };
      });

      const result = await ingestUploadToNeo4j({ data: { sourceLabel, regionScope, rows: mapped } });
      toast.success(`${result.records} records ingested into Neo4j from "${result.source}".`);
      setIngested(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ingestion failed.");
    } finally {
      setLoading(false);
    }
  }

  if (ingested) {
    return (
      <div className="mt-6 rounded-xl border bg-primary-soft/30 p-6 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
        <p className="font-semibold">Ingestion complete</p>
        <p className="text-sm text-muted-foreground">
          {file.rows.length.toLocaleString()} rows written to Neo4j — deduplication and scoring running now.
        </p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
          Upload another file
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <div className="text-xs text-muted-foreground mb-2">Parse progress</div>
        <Progress value={100} />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40 border-b text-muted-foreground">
              <th className="text-left px-3 py-2 font-medium">Column</th>
              <th className="text-left px-3 py-2 font-medium">Sample value</th>
              <th className="text-left px-3 py-2 font-medium">Maps to</th>
            </tr>
          </thead>
          <tbody>
            {file.headers.map((col) => (
              <tr key={col} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono">{col}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">
                  {String(preview[col] ?? "—")}
                </td>
                <td className="px-3 py-2">
                  <Select value={mappings[col]} onValueChange={(v) => setMappings((m) => ({ ...m, [col]: v }))}>
                    <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TARGET_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className="rounded-md border bg-primary-soft/40 p-3">
          <div className="text-lg font-semibold text-accent-foreground">{newCount.toLocaleString()}</div>
          <div className="text-muted-foreground">New farmers</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-lg font-semibold">{updateCount}</div>
          <div className="text-muted-foreground">Updates</div>
        </div>
        <div className="rounded-md border bg-[var(--warning)]/10 p-3">
          <div className="text-lg font-semibold text-[var(--warning)]">{conflictCount}</div>
          <div className="text-muted-foreground">Conflicts</div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={() => void handleIngest()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Ingest {file.rows.length.toLocaleString()} rows
        </Button>
      </div>
    </div>
  );
}

// ── UploadDetailDialog ────────────────────────────────────────────────────────

function UploadDetailDialog({ name, records, completeness }: { name: string; records: number; completeness: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <CheckCircle2 className="h-3.5 w-3.5" /> Parsed
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Ingestion report</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Records ingested" value={records.toLocaleString()} />
          <Stat label="Completeness" value={`${completeness}%`} />
          <Stat label="Duplicates merged" value="4" />
          <Stat label="Missing fields flagged" value="62" />
        </div>
        <DialogFooter>
          <Button variant="outline">Download log</Button>
          <Button>Re-run ingestion</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
