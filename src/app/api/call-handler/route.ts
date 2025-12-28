import { NextRequest, NextResponse } from "next/server";
import { twilioService } from "@/server-lib/call-handler/twilio-service";
import { prisma } from "@/server-lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle different call webhook endpoints
    if (pathname === "/api/call-handler/incoming") {
      return handleIncomingCall(request);
    } else if (pathname === "/api/call-handler/speech") {
      return handleSpeechResult(request);
    } else if (pathname === "/api/call-handler/analyze") {
      return handleAnalyzeInput(request);
    } else if (pathname === "/api/call-handler/voicemail") {
      return handleVoicemail(request);
    } else if (pathname === "/api/call-handler/status") {
      return handleCallStatus(request);
    } else {
      return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
    }
  } catch (error) {
    console.error("Call handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle incoming call webhook from Twilio
 */
async function handleIncomingCall(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const webhookData = Object.fromEntries(formData.entries()) as any;

  // Validate Twilio signature
  // Note: In production, you should verify the Twilio signature for security

  const twimlResponse = await twilioService.handleIncomingCall(webhookData);

  return new NextResponse(twimlResponse, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

/**
 * Handle speech recognition results from Twilio
 */
async function handleSpeechResult(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const sessionId = formData.get("CallSid") as string;
  const speechResult = {
    account_sid: formData.get("AccountSid") as string,
    call_sid: formData.get("CallSid") as string,
    confidence: parseFloat(formData.get("Confidence") as string),
    final: formData.get("Final") === "true",
    speech_result: formData.get("SpeechResult") as string,
    timestamp: parseInt(formData.get("Timestamp") as string),
    track: formData.get("Track") as "inbound" | "outbound",
  };

  await twilioService.handleSpeechResult(sessionId, speechResult);

  return NextResponse.json({ success: true });
}

/**
 * Handle call analysis and AI response
 */
async function handleAnalyzeInput(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const sessionId = formData.get("CallSid") as string;
  const userInput = formData.get("SpeechResult") as string;

  if (!userInput) {
    // No speech detected, prompt again
    const twiml = new (await import("twilio")).twiml.VoiceResponse();
    twiml.say("I didn't catch that. Please repeat your request.");
    twiml.redirect(
      {
        method: "POST",
      },
      "/api/call-handler/analyze",
    );

    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }

  // Process the input
  const response = await twilioService.processCallInput(sessionId, userInput);

  // Generate TwiML response
  const twiml = new (await import("twilio")).twiml.VoiceResponse();
  twiml.say(response || "Thank you for calling. Goodbye!");
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

/**
 * Handle voicemail recordings
 */
async function handleVoicemail(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const recordingUrl = formData.get("RecordingUrl") as string;
  const transcription = formData.get("TranscriptionText") as string;

  await twilioService.handleVoicemail(recordingUrl, transcription);

  return NextResponse.json({ success: true });
}

/**
 * Handle call status updates
 */
async function handleCallStatus(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const sessionId = formData.get("CallSid") as string;
  const callStatus = formData.get("CallStatus") as string;

  // Update call session status
  await prisma.callSession.update({
    where: { id: sessionId },
    data: {
      status: callStatus as any,
      endTime: callStatus === "completed" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true });
}

/**
 * Get call session details
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 },
      );
    }

    const session = await prisma.callSession.findUnique({
      where: { id: sessionId },
      include: {
        transcripts: true,
        responses: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error getting call session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
