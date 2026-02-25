"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  Search,
  Home,
  MessageSquare,
  Users,
  Calendar,
  BarChart3,
  Settings,
  FileText,
  Sparkles,
  Zap,
  Plus,
  LogOut,
  User,
  Moon,
  Sun,
  Keyboard,
  Bot,
  Workflow,
  Target,
  PenTool,
  Share2,
  LayoutTemplate,
  Lightbulb,
  Send,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { toast } from "sonner";

interface CommandItemData {
  id: string;
  name: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

interface CommandGroupData {
  name: string;
  items: CommandItemData[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Toggle command palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
    },
    [router]
  );

  const commandGroups: CommandGroupData[] = [
    {
      name: "Navigation",
      items: [
        {
          id: "home",
          name: "Go to Dashboard",
          icon: <Home className="h-4 w-4" />,
          shortcut: "G D",
          action: () => navigateTo("/"),
          keywords: ["dashboard", "home", "main"],
        },
        {
          id: "chat",
          name: "Open AI Chat",
          icon: <MessageSquare className="h-4 w-4" />,
          shortcut: "G C",
          action: () => navigateTo("/chat"),
          keywords: ["chat", "conversation", "talk"],
        },
        {
          id: "leads",
          name: "View Leads",
          icon: <Users className="h-4 w-4" />,
          shortcut: "G L",
          action: () => navigateTo("/leads"),
          keywords: ["leads", "customers", "contacts"],
        },
        {
          id: "appointments",
          name: "View Appointments",
          icon: <Calendar className="h-4 w-4" />,
          shortcut: "G A",
          action: () => navigateTo("/appointments"),
          keywords: ["appointments", "calendar", "schedule"],
        },
        {
          id: "analytics",
          name: "View Analytics",
          icon: <BarChart3 className="h-4 w-4" />,
          shortcut: "G N",
          action: () => navigateTo("/analytics"),
          keywords: ["analytics", "stats", "metrics", "reports"],
        },
      ],
    },
    {
      name: "AI Agents",
      items: [
        {
          id: "ai-agents",
          name: "AI Agents Hub",
          icon: <Bot className="h-4 w-4" />,
          action: () => navigateTo("/ai-agents"),
          keywords: ["agents", "ai", "bots", "hub"],
        },
        {
          id: "content-agent",
          name: "Content Creation Agent",
          icon: <PenTool className="h-4 w-4" />,
          action: () => navigateTo("/ai-agents/content"),
          keywords: ["content", "write", "blog", "create"],
        },
        {
          id: "seo-agent",
          name: "SEO Agent",
          icon: <Target className="h-4 w-4" />,
          action: () => navigateTo("/ai-agents/seo"),
          keywords: ["seo", "search", "keywords", "optimize"],
        },
        {
          id: "social-agent",
          name: "Social Media Agent",
          icon: <Share2 className="h-4 w-4" />,
          action: () => navigateTo("/ai-agents/social"),
          keywords: ["social", "media", "twitter", "linkedin"],
        },
      ],
    },
    {
      name: "Marketing",
      items: [
        {
          id: "marketing",
          name: "Marketing Hub",
          icon: <Zap className="h-4 w-4" />,
          action: () => navigateTo("/marketing"),
          keywords: ["marketing", "campaigns", "promote"],
        },
        {
          id: "workflows",
          name: "Workflows",
          icon: <Workflow className="h-4 w-4" />,
          action: () => navigateTo("/workflows"),
          keywords: ["workflows", "automation", "pipeline"],
        },
        {
          id: "services",
          name: "Services",
          icon: <LayoutTemplate className="h-4 w-4" />,
          action: () => navigateTo("/services"),
          keywords: ["services", "products", "offerings"],
        },
      ],
    },
    {
      name: "Quick Actions",
      items: [
        {
          id: "new-lead",
          name: "Create New Lead",
          icon: <Plus className="h-4 w-4" />,
          shortcut: "N L",
          action: () => navigateTo("/leads/new"),
          keywords: ["new", "lead", "create", "add"],
        },
        {
          id: "new-appointment",
          name: "Schedule Appointment",
          icon: <Plus className="h-4 w-4" />,
          action: () => navigateTo("/appointments/new"),
          keywords: ["new", "appointment", "schedule", "book"],
        },
        {
          id: "fast-chat",
          name: "Start Fast Chat",
          icon: <Send className="h-4 w-4" />,
          action: () => navigateTo("/fast-chat"),
          keywords: ["fast", "chat", "quick", "message"],
        },
        {
          id: "ai-suggestions",
          name: "Get AI Suggestions",
          icon: <Lightbulb className="h-4 w-4" />,
          action: () => {
            toast.info("AI Suggestions feature coming soon!");
            setOpen(false);
          },
          keywords: ["ai", "suggestions", "ideas", "help"],
        },
      ],
    },
    {
      name: "Settings",
      items: [
        {
          id: "profile",
          name: "Profile Settings",
          icon: <User className="h-4 w-4" />,
          action: () => navigateTo("/profile"),
          keywords: ["profile", "account", "user"],
        },
        {
          id: "settings",
          name: "App Settings",
          icon: <Settings className="h-4 w-4" />,
          action: () => navigateTo("/settings"),
          keywords: ["settings", "preferences", "config"],
        },
        {
          id: "toggle-theme",
          name: "Toggle Dark Mode",
          icon: <Moon className="h-4 w-4" />,
          action: () => {
            // Toggle theme logic would go here
            toast.success("Theme toggled!");
            setOpen(false);
          },
          keywords: ["theme", "dark", "light", "mode"],
        },
        {
          id: "keyboard-shortcuts",
          name: "Keyboard Shortcuts",
          icon: <Keyboard className="h-4 w-4" />,
          action: () => {
            toast.info("Keyboard shortcuts: Cmd+K for command palette");
            setOpen(false);
          },
          keywords: ["keyboard", "shortcuts", "hotkeys", "help"],
        },
      ],
    },
  ];

  // Filter items based on search query
  const filteredGroups = commandGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const searchLower = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(searchLower);
        const keywordMatch = item.keywords?.some((k) =>
          k.toLowerCase().includes(searchLower)
        );
        return nameMatch || keywordMatch;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-4 right-4 z-50 hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border shadow-sm">
        <span>Press</span>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
          Cmd
        </kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
          K
        </kbd>
        <span>for commands</span>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a command or search..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {filteredGroups.map((group, groupIndex) => (
            <CommandGroup key={group.name} heading={group.name}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={item.action}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {item.icon}
                  <span className="flex-1">{item.name}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
              {groupIndex < filteredGroups.length - 1 && <CommandSeparator />}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
