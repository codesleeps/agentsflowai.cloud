import { auth } from "@/lib/auth";

async function testAuth() {
  try {
    console.log("Testing authentication...");
    
    // Test sign in
    const result = await (auth.api as any).signInEmail({
      body: {
        email: "test@example.com",
        password: "TestPass123!",
      },
    });
    
    console.log("Sign in result:", result);
    
    if (result.session) {
      console.log("✅ Authentication successful!");
      console.log("User:", result.user);
      console.log("Session token:", result.session.token.substring(0, 20) + "...");
    } else {
      console.log("❌ Authentication failed");
    }
    
  } catch (error) {
    console.error("Authentication error:", error);
  }
}

testAuth();