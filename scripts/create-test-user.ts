import { auth } from "@/lib/auth";
import { prisma } from "@/server-lib/prisma";

async function createTestUser() {
  try {
    console.log("Creating test user...");
    
    // Create user using Better Auth
    const result = await (auth.api as any).signUpEmail({
      body: {
        email: "test@example.com",
        password: "TestPass123!",
        name: "Test User",
      },
    });
    
    console.log("User created successfully:", result.user);
    
    // Create team for the user
    const teamName = "Test User's Team";
    const teamSlug = `team-${result.user.id.slice(0, 8)}`;
    
    const team = await prisma.team.create({
      data: {
        name: teamName,
        slug: teamSlug,
        owner_id: result.user.id,
      },
    });
    
    console.log("Team created:", team);
    
    // Add user as team member
    await prisma.teamMember.create({
      data: {
        team_id: team.id,
        user_id: result.user.id,
        role: "owner",
        status: "active",
        joined_at: new Date(),
      },
    });
    
    console.log("✅ Test user setup complete!");
    console.log("Email: test@example.com");
    console.log("Password: TestPass123!");
    
  } catch (error) {
    console.error("Error creating test user:", error);
  }
}

createTestUser();