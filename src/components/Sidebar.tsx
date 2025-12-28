"use client";

import {
  ExternalLink,
  Home,
  MessageSquare,
  Users,
  Package,
  TrendingUp,
  Calendar,
  Bot,
  Globe,
  Settings,
  User,
  Users as TeamIcon,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  authClient,
  getAuthActiveOrganization,
  getAuthClient,
} from "@/client-lib/auth-client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarPrimitive,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/ai-agents", label: "AI Agents", icon: Bot },
  { href: "/chat", label: "AI Chat Agent", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/services", label: "Services", icon: Package },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/welcome", label: "Website", icon: Globe },
];

const settingsNavItems = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/teams", label: "Teams", icon: TeamIcon },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function Sidebar() {
  const { data: session } = getAuthClient();
  const { data: activeOrganization } = getAuthActiveOrganization();
  const { state, isMobile } = useSidebar();
  const pathname = usePathname();
  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/welcome";
        },
      },
    });
  };
  return (
    <SidebarPrimitive collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-[2px] py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger className="shrink-0" />
            {(state === "expanded" || isMobile) && (
              <span className="flex items-center gap-2 truncate font-semibold text-sidebar-foreground">
                <Bot className="h-5 w-5 text-primary" />
                AgentsFlowAI
              </span>
            )}
          </div>
          {(state === "expanded" || isMobile) && <ThemeToggle />}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {session && (
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="w-full outline-none">
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image ?? undefined} />
                      <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                        {session.user.name?.[0]?.toUpperCase() ??
                          session.user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left text-sm">
                      <span className="font-medium">
                        {session.user.name ?? "User"}
                      </span>
                      <span className="text-xs text-sidebar-foreground/70">
                        {session.user.email}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="right"
                  className="w-56"
                >
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Organization
                    </p>
                    <p className="text-sm">
                      {activeOrganization?.name ?? "No organization selected"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => (window.location.href = "/profile")}
                  >
                    Profile <ExternalLink className="ml-auto h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => (window.location.href = "/settings")}
                  >
                    Settings <ExternalLink className="ml-auto h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => (window.location.href = "/teams")}
                  >
                    Teams <ExternalLink className="ml-auto h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => (window.location.href = "/activity")}
                  >
                    Activity <ExternalLink className="ml-auto h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <span className="font-semibold text-destructive">
                      Log out
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </SidebarPrimitive>
  );
}
