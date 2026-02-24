"use client";

import { useState } from "react";
import { 
  Send, 
  Calendar, 
  Clock,
  CheckCircle,
  Globe,
  Mail,
  Share2,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PublishPanelProps {
  content: string;
  contentType: string;
}

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  color: string;
}

export function PublishPanel({ content, contentType }: PublishPanelProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const platforms: Platform[] = [
    { id: "blog", name: "Blog", icon: <Globe className="h-4 w-4" />, connected: true, color: "bg-blue-500" },
    { id: "email", name: "Email", icon: <Mail className="h-4 w-4" />, connected: true, color: "bg-purple-500" },
    { id: "linkedin", name: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, connected: false, color: "bg-blue-700" },
    { id: "twitter", name: "Twitter/X", icon: <Twitter className="h-4 w-4" />, connected: false, color: "bg-sky-500" },
    { id: "instagram", name: "Instagram", icon: <Instagram className="h-4 w-4" />, connected: false, color: "bg-pink-500" },
    { id: "facebook", name: "Facebook", icon: <Facebook className="h-4 w-4" />, connected: false, color: "bg-blue-600" },
  ];

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setIsPublishing(true);
    
    // Simulate publishing
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (isScheduled && scheduleDate && scheduleTime) {
      toast.success(`Content scheduled for ${scheduleDate} at ${scheduleTime}`);
    } else {
      toast.success(`Content published to ${selectedPlatforms.length} platform(s)!`);
    }

    setIsPublishing(false);
    setSelectedPlatforms([]);
  };

  const handleSaveToCalendar = () => {
    toast.success("Content saved to Content Calendar!");
  };

  return (
    <div className="space-y-6">
      {/* Publish Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Publish Content
          </CardTitle>
          <CardDescription>
            Choose where to publish your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Select Platforms</Label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformToggle(platform.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedPlatforms.includes(platform.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`p-2 rounded-md ${platform.color} text-white`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{platform.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {platform.connected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                  {selectedPlatforms.includes(platform.id) && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="schedule">Schedule for later</Label>
              <Switch
                id="schedule"
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
              />
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full gap-2"
              onClick={handlePublish}
              disabled={isPublishing || selectedPlatforms.length === 0}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isScheduled ? "Schedule Content" : "Publish Now"}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleSaveToCalendar}
            >
              <Calendar className="h-4 w-4" />
              Save to Content Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Publishing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content Type</span>
              <Badge variant="secondary">{contentType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Word Count</span>
              <span>{content.split(/\s+/).length} words</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selected Platforms</span>
              <span>{selectedPlatforms.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={isScheduled ? "text-yellow-600" : "text-green-600"}>
                {isScheduled ? "Scheduled" : "Ready to publish"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
