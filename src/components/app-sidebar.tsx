import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Users,
  ShieldCheck,
  Sparkles,
  Upload,
  Settings,
  Leaf,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutGrid },
  { title: "Farmer Records", url: "/farmers", icon: Users },
  { title: "Data Quality", url: "/data-quality", icon: ShieldCheck },
  { title: "Intelligence", url: "/intelligence", icon: Sparkles },
  { title: "Upload", url: "/upload", icon: Upload },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">FarmIQ</span>
            <span className="text-[11px] text-muted-foreground">Farmer Data Intelligence</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="relative data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-medium"
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary" />
                        )}
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="h-8 w-8 rounded-full bg-primary-soft text-accent-foreground flex items-center justify-center text-xs font-semibold">
            AO
          </div>
          <div className="flex flex-col leading-tight text-xs">
            <span className="font-medium text-foreground">Agnes Owino</span>
            <span className="text-muted-foreground">Agrovesto · Analyst</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
