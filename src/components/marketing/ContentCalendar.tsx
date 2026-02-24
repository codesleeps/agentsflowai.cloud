"use client";

import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Mail,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ScheduledPost {
  id: string;
  title: string;
  platform: string;
  date: Date;
  time: string;
  status: "draft" | "scheduled" | "published";
  type: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  blog: <FileText className="h-4 w-4" />,
};

const platformColors: Record<string, string> = {
  linkedin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  twitter: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  instagram: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  facebook: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  email: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  blog: "bg-green-500/10 text-green-600 border-green-500/20",
};

const mockPosts: ScheduledPost[] = [
  {
    id: "1",
    title: "Product Launch Announcement",
    platform: "linkedin",
    date: new Date(2026, 1, 25),
    time: "09:00",
    status: "scheduled",
    type: "Post",
  },
  {
    id: "2",
    title: "Weekly Tips Thread",
    platform: "twitter",
    date: new Date(2026, 1, 26),
    time: "10:30",
    status: "draft",
    type: "Thread",
  },
  {
    id: "3",
    title: "Behind the Scenes",
    platform: "instagram",
    date: new Date(2026, 1, 27),
    time: "14:00",
    status: "scheduled",
    type: "Carousel",
  },
  {
    id: "4",
    title: "Newsletter: Feb Edition",
    platform: "email",
    date: new Date(2026, 1, 28),
    time: "08:00",
    status: "draft",
    type: "Email",
  },
  {
    id: "5",
    title: "How-to Guide",
    platform: "blog",
    date: new Date(2026, 1, 24),
    time: "11:00",
    status: "published",
    type: "Article",
  },
];

export function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // February 2026
  const [view, setView] = useState<"month" | "week">("month");
  const [posts, setPosts] = useState<ScheduledPost[]>(mockPosts);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getPostsForDate = (day: number) => {
    return posts.filter((post) => {
      const postDate = new Date(post.date);
      return (
        postDate.getDate() === day &&
        postDate.getMonth() === month &&
        postDate.getFullYear() === year
      );
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Published</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Scheduled</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return null;
    }
  };

  const handleDelete = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
    toast.success("Post deleted");
  };

  const handleDuplicate = (post: ScheduledPost) => {
    const newPost: ScheduledPost = {
      ...post,
      id: Date.now().toString(),
      title: `${post.title} (Copy)`,
      status: "draft",
    };
    setPosts([...posts, newPost]);
    toast.success("Post duplicated");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {monthNames[month]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
            >
              Week
            </Button>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Posts</p>
            <p className="text-2xl font-bold">{posts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-bold text-blue-600">
              {posts.filter((p) => p.status === "scheduled").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold text-yellow-600">
              {posts.filter((p) => p.status === "draft").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Published</p>
            <p className="text-2xl font-bold text-green-600">
              {posts.filter((p) => p.status === "published").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before the first of the month */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[120px] border-b border-r p-2" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dayPosts = getPostsForDate(day);
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`min-h-[120px] border-b border-r p-2 transition-colors hover:bg-muted/50 ${
                    isToday ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isToday
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : ""
                      }`}
                    >
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {dayPosts.length} post{dayPosts.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs cursor-pointer hover:opacity-80 ${platformColors[post.platform]}`}
                      >
                        {platformIcons[post.platform]}
                        <span className="truncate flex-1">{post.title}</span>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-1">
                        +{dayPosts.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Posts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Upcoming Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {posts
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${platformColors[post.platform]}`}
                    >
                      {platformIcons[post.platform]}
                    </div>
                    <div>
                      <p className="font-medium">{post.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{post.type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(post.date).toLocaleDateString()} at {post.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(post.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(post)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
