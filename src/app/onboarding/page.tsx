"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/client-lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles,
  MessageSquare,
  Users,
  TrendingUp,
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    company: "",
    role: "",
    teamSize: "",
  });
  const router = useRouter();

  const steps = ["Welcome", "Profile", "Features"];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeOnboarding({
        step: "features",
        profileData: {
          company: profileData.company || undefined,
          role: profileData.role || undefined,
          teamSize: profileData.teamSize || undefined,
        },
      });
      toast.success("Welcome to AgentsFlowAI! Setup complete.");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-2xl font-bold">
                Welcome to AgentsFlowAI
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your AI-powered platform for managing leads, automating
                workflows, and growing your business.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
              <div className="flex items-start space-x-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <MessageSquare className="mt-0.5 h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="font-medium">AI Chat Agents</h3>
                  <p className="text-sm text-gray-500">
                    Intelligent conversations
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <Users className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <h3 className="font-medium">Lead Management</h3>
                  <p className="text-sm text-gray-500">Track & qualify leads</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <TrendingUp className="mt-0.5 h-5 w-5 text-purple-500" />
                <div>
                  <h3 className="font-medium">Analytics Dashboard</h3>
                  <p className="text-sm text-gray-500">Data-driven insights</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <Zap className="mt-0.5 h-5 w-5 text-yellow-500" />
                <div>
                  <h3 className="font-medium">Automation</h3>
                  <p className="text-sm text-gray-500">Workflow optimization</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">
                Tell us about yourself
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This helps us personalize your experience
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={profileData.company}
                  onChange={(e) =>
                    setProfileData({ ...profileData, company: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Your Role</Label>
                <Input
                  id="role"
                  placeholder="Sales Manager"
                  value={profileData.role}
                  onChange={(e) =>
                    setProfileData({ ...profileData, role: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Team Size</Label>
                <Select
                  value={profileData.teamSize}
                  onValueChange={(value) =>
                    setProfileData({ ...profileData, teamSize: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Just me</SelectItem>
                    <SelectItem value="2-10">2-10 people</SelectItem>
                    <SelectItem value="11-50">11-50 people</SelectItem>
                    <SelectItem value="51-200">51-200 people</SelectItem>
                    <SelectItem value="200+">200+ people</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">
                What you can do with AgentsFlowAI
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Explore the key features of your new platform
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">AI Chat Agent</h3>
                  <p className="text-sm text-gray-500">
                    Create intelligent chatbots to engage with leads 24/7
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Lead Management</h3>
                  <p className="text-sm text-gray-500">
                    Track, score, and convert leads with smart workflows
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Analytics Dashboard</h3>
                  <p className="text-sm text-gray-500">
                    Get insights into your sales and engagement metrics
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
                  <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Automation Workflows</h3>
                  <p className="text-sm text-gray-500">
                    Automate repetitive tasks and streamline operations
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl px-4">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>Welcome</span>
          <span>Profile</span>
          <span>Features</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep]}</CardTitle>
          <CardDescription>
            {currentStep === 0 && "Get started with your AI-powered platform"}
            {currentStep === 1 && "Help us personalize your experience"}
            {currentStep === 2 && "Discover what's possible with AgentsFlowAI"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
          <div className="mt-8 flex justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? (
                  <>Completing...</>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
