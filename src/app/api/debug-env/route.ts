import { NextResponse } from "next/server";

export async function GET() {
    const dbUrl = process.env.DATABASE_URL || "NOT_SET";
    const maskedUrl = dbUrl.replace(/:\/\/.*@/, "://user:password@");

    return NextResponse.json({
        databaseUrl: maskedUrl,
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd(),
    });
}
