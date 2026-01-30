"use client";

import { useState } from "react";
import { signIn } from "@/client-lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AuthDebugPage() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("TestPass123!");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestAuth = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log("Attempting sign in with:", { email, password });
      
      const response = await signIn.email({
        email,
        password,
      });
      
      console.log("Sign in response:", response);
      setResult(response);
      
      if (response?.data?.user) {
        toast.success("Authentication successful!");
      } else {
        toast.error("Authentication failed - no user data returned");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      setResult({ error: error.message || "Unknown error" });
      toast.error(`Authentication error: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label>Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div className="space-y-2">
            <label>Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="TestPass123!"
            />
          </div>
          <Button 
            onClick={handleTestAuth} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Authentication"}
          </Button>
          
          {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <h3 className="font-medium">Result:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}