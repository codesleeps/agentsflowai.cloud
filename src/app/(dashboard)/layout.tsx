import { Sidebar, MobileNav } from "@/components/Sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar />
      <MobileNav />
      <SidebarInset className="bg-transparent">
        <main className="flex-1 p-4 pt-16 md:pt-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
