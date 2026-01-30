import { auth } from "@/lib/auth";

async function debugAuthFlow() {
  console.log("=== DEBUGGING AUTHENTICATION FLOW ===\n");
  
  try {
    // 1. Check if user exists
    console.log("1. Checking if user exists...");
    const users = await (auth.api as any).listUsers({});
    console.log("Existing users:", users.users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name
    })));
    
    // 2. Test sign in
    console.log("\n2. Testing sign in...");
    const signInResult = await (auth.api as any).signInEmail({
      body: {
        email: "test@example.com",
        password: "TestPass123!",
      },
    });
    
    console.log("Sign in result:", JSON.stringify(signInResult, null, 2));
    
    // 3. Check session creation
    console.log("\n3. Checking session...");
    if (signInResult.session) {
      console.log("Session created successfully");
      console.log("Session token:", signInResult.session.token.substring(0, 20) + "...");
      
      // 4. Test session retrieval
      console.log("\n4. Testing session retrieval...");
      const sessionResult = await (auth.api as any).getSession({
        headers: {
          cookie: `better-auth.session_token=${signInResult.session.token}`
        }
      });
      
      console.log("Session retrieval result:", JSON.stringify(sessionResult, null, 2));
    } else {
      console.log("❌ NO SESSION CREATED");
    }
    
    // 5. Check database sessions table
    console.log("\n5. Checking database sessions...");
    // This would require direct database access
    
  } catch (error) {
    console.error("❌ Authentication flow error:", error);
  }
}

debugAuthFlow();