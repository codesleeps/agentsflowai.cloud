"use client";

import { useState } from "react";
import { 
  Users, 
  Share2, 
  MessageSquare, 
  CheckCircle,
  Clock,
  Send,
  MoreHorizontal,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  resolved: boolean;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: "editor" | "viewer" | "approver";
  status: "active" | "pending";
}

interface CollaborationPanelProps {
  contentId?: string;
}

export function CollaborationPanel({ contentId }: CollaborationPanelProps) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      author: "Sarah Chen",
      avatar: "SC",
      content: "Great introduction! Maybe add a statistic to make it more compelling?",
      timestamp: "2 hours ago",
      resolved: false,
    },
    {
      id: "2",
      author: "Mike Johnson",
      avatar: "MJ",
      content: "The CTA at the end could be stronger. Consider adding urgency.",
      timestamp: "5 hours ago",
      resolved: true,
    },
  ]);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: "1", name: "Sarah Chen", email: "sarah@company.com", role: "editor", status: "active" },
    { id: "2", name: "Mike Johnson", email: "mike@company.com", role: "approver", status: "active" },
    { id: "3", name: "Emily Davis", email: "emily@company.com", role: "viewer", status: "pending" },
  ]);

  const [newComment, setNewComment] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer" | "approver">("viewer");

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: "You",
      avatar: "YO",
      content: newComment,
      timestamp: "Just now",
      resolved: false,
    };

    setComments([comment, ...comments]);
    setNewComment("");
    toast.success("Comment added!");
  };

  const handleResolveComment = (id: string) => {
    setComments(comments.map(c => 
      c.id === id ? { ...c, resolved: !c.resolved } : c
    ));
    toast.success("Comment updated!");
  };

  const handleShare = () => {
    if (!shareEmail.trim()) {
      toast.error("Please enter an email");
      return;
    }

    const newCollaborator: Collaborator = {
      id: Date.now().toString(),
      name: shareEmail.split("@")[0],
      email: shareEmail,
      role: shareRole,
      status: "pending",
    };

    setCollaborators([...collaborators, newCollaborator]);
    setShareEmail("");
    toast.success(`Invitation sent to ${shareEmail}`);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "editor":
        return "bg-blue-500/10 text-blue-600";
      case "approver":
        return "bg-purple-500/10 text-purple-600";
      case "viewer":
        return "bg-gray-500/10 text-gray-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Share Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share & Collaborate
          </CardTitle>
          <CardDescription>
            Invite team members to review and edit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="flex-1"
            />
            <select
              value={shareRole}
              onChange={(e) => setShareRole(e.target.value as any)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="approver">Approver</option>
            </select>
            <Button onClick={handleShare}>
              <Send className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>

          {/* Collaborators List */}
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {collab.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{collab.name}</p>
                    <p className="text-xs text-muted-foreground">{collab.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={getRoleBadgeColor(collab.role)}>
                    {collab.role}
                  </Badge>
                  {collab.status === "pending" && (
                    <Badge variant="outline" className="text-yellow-600">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments & Feedback
          </CardTitle>
          <CardDescription>
            {comments.filter(c => !c.resolved).length} open, {comments.filter(c => c.resolved).length} resolved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment or feedback..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${comment.resolved ? "bg-muted/30 opacity-60" : "bg-card"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{comment.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{comment.author}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {comment.timestamp}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolveComment(comment.id)}
                  >
                    {comment.resolved ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{comment.content}</p>
                {comment.resolved && (
                  <Badge variant="outline" className="mt-2 text-green-600">
                    Resolved
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
