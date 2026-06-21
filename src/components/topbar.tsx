import { Bell, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card px-4 sticky top-0 z-10">
      <SidebarTrigger />
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search farmers, regions, sources…" className="pl-8 h-9 bg-background" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="relative rounded-md p-2 hover:bg-muted">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary-soft text-accent-foreground flex items-center justify-center text-xs font-semibold">
          AO
        </div>
      </div>
    </header>
  );
}
