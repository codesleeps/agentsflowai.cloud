"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Building2,
  TrendingUp,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLeads, deleteLead, updateLead } from "@/client-lib/api-client";
import { toast } from "sonner";
import type { Lead } from "@/shared/models/types";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  contacted: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  qualified: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  proposal: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  won: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  lost: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
};

const sourceLabels: Record<string, string> = {
  website: "🌐 Website",
  chat: "💬 Chat",
  referral: "🤝 Referral",
  ads: "📢 Ads",
};

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const { data: leads, isLoading } = useLeads(
    statusFilter !== "all" ? statusFilter : undefined,
    sourceFilter !== "all" ? sourceFilter : undefined
  );

  const filteredLeads = leads?.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      (lead.company?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    try {
      await updateLead(lead.id, { status: newStatus as Lead["status"] });
      toast.success(`Lead status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update lead status");
    }
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;
    try {
      await deleteLead(leadToDelete.id);
      toast.success("Lead deleted successfully");
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Users className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Lead Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and qualify your leads with AI assistance
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/leads/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="ads">Ads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{leads?.length ?? 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New</p>
                <p className="text-2xl font-bold text-blue-600">
                  {leads?.filter((l) => l.status === "new").length ?? 0}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-600 text-lg">✨</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Qualified</p>
                <p className="text-2xl font-bold text-green-600">
                  {leads?.filter((l) => l.status === "qualified").length ?? 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {leads?.filter((l) => l.status === "won").length ?? 0}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-600 text-lg">🏆</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>{filteredLeads?.length ?? 0} leads found</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLeads && filteredLeads.length > 0 ? (
            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {lead.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                        {lead.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {lead.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className={`text-lg font-bold ${getScoreColor(lead.score)}`}>
                        {lead.score}/100
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sourceLabels[lead.source] || lead.source}
                      </p>
                    </div>

                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead, value)}
                    >
                      <SelectTrigger className={`w-[130px] ${statusColors[lead.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/leads/${lead.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Lead
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setLeadToDelete(lead);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No leads found</p>
              <Button className="mt-4" asChild>
                <Link href="/leads/new">Add your first lead</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>Full information about {selectedLead?.name}</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedLead.company || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedLead.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedLead.status]}>{selectedLead.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className={`font-bold ${getScoreColor(selectedLead.score)}`}>
                    {selectedLead.score}/100
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-medium capitalize">{selectedLead.budget || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="font-medium">{selectedLead.timeline || "N/A"}</p>
                </div>
              </div>
              {selectedLead.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedLead.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(selectedLead.created_at).toLocaleDateString()} at{" "}
                  {new Date(selectedLead.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>
              Close
            </Button>
            <Button asChild>
              <Link href={`/leads/${selectedLead?.id}/edit`}>Edit Lead</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {leadToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
