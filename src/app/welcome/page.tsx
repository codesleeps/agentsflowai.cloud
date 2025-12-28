"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, signIn } from "@/client-lib/auth-client";
import {
  Bot,
  MessageSquare,
  Users,
  TrendingUp,
  Zap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Menu,
  X,
  Loader2,
  Play,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Agent",
    description:
      "24/7 intelligent customer support that understands context and provides instant, accurate responses.",
  },
  {
    icon: Users,
    title: "Lead Qualification",
    description:
      "Automatically score and prioritize leads based on behavior, budget, and timeline.",
  },
  {
    icon: Sparkles,
    title: "Service Recommendations",
    description:
      "AI-powered suggestions that match customers with the perfect service packages.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Track conversions, revenue, and agent performance with beautiful dashboards.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "Automate appointment booking and send reminders to reduce no-shows.",
  },
  {
    icon: Zap,
    title: "Instant Response",
    description:
      "Respond to inquiries in milliseconds, not hours. Never lose a lead again.",
  },
];

const stats = [
  { value: "95%", label: "Faster Response Time" },
  { value: "80%", label: "Less Manual Work" },
  { value: "3x", label: "More Qualified Leads" },
  { value: "24/7", label: "Availability" },
];

const testimonials = [
  {
    quote:
      "We went from 15% to 28% conversion rate in the first month. AgentsFlowAI pays for itself many times over.",
    author: "Sarah Johnson",
    role: "CEO, Digital Marketing Agency",
    avatar: "S",
  },
  {
    quote:
      "AgentsFlowAI handles 90% of our initial inquiries. Our team now focuses only on closing deals.",
    author: "Michael Chen",
    role: "Founder, Web Development Studio",
    avatar: "M",
  },
  {
    quote:
      "Best investment we made. The AI qualification is incredibly accurate and saves us 20+ hours per week.",
    author: "Emily Davis",
    role: "Sales Director, SaaS Startup",
    avatar: "E",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: 999,
    description: "Perfect for small businesses getting started",
    features: [
      "AI Chat Agent",
      "Up to 500 conversations/month",
      "Basic lead scoring",
      "Email support",
      "1 team member",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: 2499,
    description: "Scale your business with advanced automation",
    features: [
      "Everything in Starter",
      "Unlimited conversations",
      "Advanced AI qualification",
      "Priority support",
      "5 team members",
      "Custom integrations",
      "Analytics dashboard",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 4999,
    description: "Complete digital transformation solution",
    features: [
      "Everything in Growth",
      "Dedicated account manager",
      "Custom AI training",
      "24/7 phone support",
      "Unlimited team members",
      "White-label options",
      "SLA guarantee",
      "API access",
    ],
    popular: false,
  },
];

const useCases = [
  {
    title: "Digital Marketing Agencies",
    description:
      "Qualify leads automatically and focus your team on high-value prospects.",
    icon: TrendingUp,
  },
  {
    title: "Consulting Firms",
    description:
      "Provide instant expert recommendations and book consultations 24/7.",
    icon: Users,
  },
  {
    title: "SaaS Companies",
    description:
      "Route leads intelligently between self-serve and enterprise sales tracks.",
    icon: Zap,
  },
  {
    title: "E-commerce Businesses",
    description:
      "Deliver instant customer support and product recommendations.",
    icon: MessageSquare,
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      await signIn.email({
        email: loginForm.email,
        password: loginForm.password,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Welcome back!");
            router.push("/dashboard");
          },
          onError: (ctx) => {
            toast.error(ctx.error.message);
            setIsLoggingIn(false);
          }
        }
      });
    } catch (err) {
      toast.error("An error occurred during login");
      console.error(err);
      setIsLoggingIn(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(
      "Thanks for reaching out! We'll be in touch within 24 hours.",
    );
    setContactForm({ name: "", email: "", company: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">AgentsFlowAI</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />

              {/* Desktop Navigation */}
              <div className="hidden items-center gap-8 md:flex">
                <a
                  href="#features"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Pricing
                </a>
                <a
                  href="#testimonials"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Testimonials
                </a>
                <a
                  href="#contact"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Contact
                </a>
              </div>

              <div className="hidden items-center gap-4 md:flex">
                <Button
                  variant="ghost"
                  onClick={() =>
                    document
                      .getElementById("login")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Login
                </Button>
                <Button
                  onClick={() =>
                    document
                      .getElementById("signup")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Mobile menu button */}
              <button
                className="p-2 md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-b bg-background md:hidden">
            <div className="space-y-4 px-4 py-4">
              <a
                href="#features"
                className="block text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="block text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="block text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className="block text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <div className="flex flex-col gap-2 pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    document
                      .getElementById("login")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Login
                </Button>
                <Button
                  className="w-full"
                  onClick={() =>
                    document
                      .getElementById("signup")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with Login */}
      <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8" id="login">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Hero Content */}
            <div>
              <Badge variant="secondary" className="mb-6">
                <Sparkles className="mr-1 h-3 w-3" />
                AI-Powered Business Automation
              </Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Transform Your Business with{" "}
                <span className="text-primary">Intelligent Automation</span>
              </h1>
              <p className="mb-8 text-xl text-muted-foreground">
                AgentsFlowAI combines multiple AI agents to handle customer
                interactions, qualify leads, recommend services, and provide
                real-time analytics — all automatically.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/fast-chat">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Try AI Chat Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#how-it-works">
                    <Play className="mr-2 h-5 w-5" />
                    See How It Works
                  </a>
                </Button>
              </div>
            </div>

            {/* Login Card */}
            <div className="flex items-center justify-center">
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    Welcome Back
                  </CardTitle>
                  <CardDescription>
                    Sign in to access your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="password"
                        className="mb-2 block text-sm font-medium"
                      >
                        Password
                      </label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({
                            ...loginForm,
                            password: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                  <div className="mt-4 text-center text-sm">
                    <span className="text-muted-foreground">
                      Don&apos;t have an account?{" "}
                    </span>
                    <a
                      href="#signup"
                      className="font-medium text-primary hover:underline"
                    >
                      Sign up
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign Up Section */}
      <section id="signup" className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              Get Started
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Ready to Transform Your Business?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Join hundreds of businesses already using AgentsFlowAI to automate
              their customer interactions and scale faster.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular ? "scale-105 border-primary shadow-xl" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4 text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/sign-up">Start Free Trial</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            All plans include 14-day free trial. No credit card required to
            start.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Everything You Need to Scale
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              A complete suite of AI-powered tools designed to automate your
              business and help you focus on what matters most.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-0 shadow-lg transition-shadow hover:shadow-xl"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              How It Works
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Get Started in Minutes
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Our AI agents work together seamlessly to automate your entire
              customer journey.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="text-xl font-semibold">Customer Arrives</h3>
              </div>
              <p className="ml-14 text-muted-foreground">
                A potential customer visits your website or reaches out through
                any channel. Our AI Chat Agent engages them instantly.
              </p>
              <div className="absolute left-full top-5 hidden h-0.5 w-full -translate-x-1/2 bg-border md:block" />
            </div>

            <div className="relative">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="text-xl font-semibold">
                  AI Qualifies & Recommends
                </h3>
              </div>
              <p className="ml-14 text-muted-foreground">
                The Lead Qualification Agent scores the lead while the Service
                Recommender suggests the perfect package based on their needs.
              </p>
              <div className="absolute left-full top-5 hidden h-0.5 w-full -translate-x-1/2 bg-border md:block" />
            </div>

            <div>
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-semibold">Convert & Analyze</h3>
              </div>
              <p className="ml-14 text-muted-foreground">
                Appointments are scheduled automatically, and you get real-time
                analytics on every interaction to optimize your funnel.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" asChild>
              <Link href="/leads/new">
                Add Your First Lead
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              Testimonials
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Loved by Businesses Worldwide
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              See what our customers have to say about transforming their
              business with AgentsFlowAI.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="mb-6 italic text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="font-semibold text-primary">
                        {testimonial.avatar}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              Pricing
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Choose the plan that fits your business. All plans include a
              14-day free trial.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="rounded-3xl bg-primary p-12 text-primary-foreground">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Ready to Transform Your Business?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg opacity-90">
              Join hundreds of businesses already using AgentsFlowAI to automate
              their customer interactions and scale faster.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/sign-up">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <a href="#contact">Contact Sales</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <Badge variant="outline" className="mb-4">
                Contact Us
              </Badge>
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                Let&apos;s Talk About Your Needs
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Have questions? Want a personalized demo? Our team is here to
                help you find the perfect solution for your business.
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">hello@agentsflowai.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">San Francisco, CA</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Name
                      </label>
                      <Input
                        placeholder="John Doe"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            email: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Company
                    </label>
                    <Input
                      placeholder="Your Company"
                      value={contactForm.company}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          company: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Message
                    </label>
                    <Textarea
                      placeholder="Tell us about your needs..."
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          message: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Send Message
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                <span className="font-bold">AgentsFlowAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Transform your business with AI-powered automation. Qualify
                leads, engage customers, and scale faster.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-primary">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/chat" className="hover:text-primary">
                    AI Chat
                  </Link>
                </li>
                <li>
                  <a href="#login" className="hover:text-primary">
                    Login
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-primary">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between border-t pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2024 AgentsFlowAI. All rights reserved.
            </p>
            <div className="mt-4 flex gap-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
