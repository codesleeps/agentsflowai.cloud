"use client";

import { useState } from "react";
import { Package, Plus, Check, Star, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices, createService } from "@/client-lib/api-client";
import { toast } from "sonner";

const tierColors: Record<string, string> = {
  basic: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  growth:
    "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  enterprise:
    "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

const tierIcons: Record<string, React.ReactNode> = {
  basic: <Package className="h-6 w-6" />,
  growth: <Sparkles className="h-6 w-6" />,
  enterprise: <Star className="h-6 w-6" />,
};

export default function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    tier: "basic",
    price: "",
    features: "",
  });

  const handleCreateService = async () => {
    if (!newService.name || !newService.price) {
      toast.error("Name and price are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createService({
        name: newService.name,
        description: newService.description,
        tier: newService.tier,
        price: parseFloat(newService.price),
        features: newService.features.split("\n").filter((f) => f.trim()),
      });
      toast.success("Service created successfully");
      setIsDialogOpen(false);
      setNewService({
        name: "",
        description: "",
        tier: "basic",
        price: "",
        features: "",
      });
    } catch {
      toast.error("Failed to create service");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Package className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Package className="h-8 w-8 text-primary" />
            Services & Packages
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your service offerings and pricing
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Service</DialogTitle>
                <DialogDescription>
                  Add a new service package to your offerings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Premium Package"
                    value={newService.name}
                    onChange={(e) =>
                      setNewService((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what's included..."
                    value={newService.description}
                    onChange={(e) =>
                      setNewService((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tier">Tier</Label>
                    <Select
                      value={newService.tier}
                      onValueChange={(value) =>
                        setNewService((prev) => ({ ...prev, tier: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="999"
                      value={newService.price}
                      onChange={(e) =>
                        setNewService((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="features">Features (one per line)</Label>
                  <Textarea
                    id="features"
                    placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                    value={newService.features}
                    onChange={(e) =>
                      setNewService((prev) => ({
                        ...prev,
                        features: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateService} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Service
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services?.map((service) => (
          <Card key={service.id} className="relative overflow-hidden">
            {service.tier === "enterprise" && (
              <div className="absolute right-0 top-0 rounded-bl-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${tierColors[service.tier]}`}>
                  {tierIcons[service.tier]}
                </div>
                <Badge variant="outline" className={tierColors[service.tier]}>
                  {service.tier}
                </Badge>
              </div>
              <CardTitle className="mt-4">{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${service.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground">/package</span>
              </div>
              <ul className="space-y-3">
                {service.features?.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={service.tier === "enterprise" ? "default" : "outline"}
              >
                Learn More
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {services?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No services configured yet</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Add your first service
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
