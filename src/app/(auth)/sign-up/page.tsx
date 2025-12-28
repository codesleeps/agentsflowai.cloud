"use client";

import { useState } from "react";
import { signUp } from "@/client-lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();

  // Password strength validation
  const passwordRequirements = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "1 uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "1 lowercase letter", valid: /[a-z]/.test(password) },
    { label: "1 number", valid: /\d/.test(password) },
    {
      label: "1 special character (@$!%*?&)",
      valid: /[@$!%*?&]/.test(password),
    },
  ];

  const strengthScore = passwordRequirements.filter((req) => req.valid).length;
  const strengthPercent = (strengthScore / passwordRequirements.length) * 100;
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;
  const isFormValid =
    email.length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    name.length >= 2 &&
    acceptedTerms &&
    strengthScore >= 4 &&
    passwordsMatch;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please fill in all fields correctly");
      return;
    }
    setLoading(true);
    await signUp.email({
      email,
      password,
      name,
      fetchOptions: {
        onSuccess: () => {
          toast.success("Account created successfully");
          router.push("/onboarding");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
          setLoading(false);
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>
            Join AgentsFlowAI and start automating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
              {password.length > 0 && (
                <div className="space-y-2">
                  <Progress value={strengthPercent} className="h-1" />
                  <div className="flex flex-wrap gap-2 text-xs">
                    {passwordRequirements.map((req, index) => (
                      <span
                        key={index}
                        className={`flex items-center gap-1 ${
                          req.valid ? "text-green-600" : "text-gray-500"
                        }`}
                      >
                        {req.valid ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {req.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
              {confirmPassword.length > 0 && (
                <span
                  className={`flex items-center gap-1 text-xs ${
                    passwordsMatch ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {passwordsMatch ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {passwordsMatch
                    ? "Passwords match"
                    : "Passwords do not match"}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) =>
                  setAcceptedTerms(checked as boolean)
                }
              />
              <label
                htmlFor="terms"
                className="text-sm leading-none text-gray-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-400"
              >
                I agree to the{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="ml-1 underline hover:text-gray-900">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
