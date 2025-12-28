import Twilio from "twilio";
import type { Twilio as TwilioClient } from "twilio";
import {
  CallSession,
  CallTranscript,
  CallResponse,
  TwilioCallWebhook,
  TwilioSpeechResult,
  CallConfig,
} from "./types";
import { prisma } from "../prisma";
import { executeSimpleGeneration } from "../ai-fallback-handler";

class TwilioService {
  private client: TwilioClient | null = null;
  private config: CallConfig;
  private initialized = false;

  private initializeClient(): void {
    if (this.initialized) return;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.",
      );
    }

    this.client = Twilio(accountSid, authToken);
    this.initialized = true;
  }

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getClient(): TwilioClient {
    this.initializeClient();
    if (!this.client) {
      throw new Error("Twilio client not initialized");
    }
    return this.client;
  }

  private getDefaultConfig(): CallConfig {
    return {
      welcomeMessage:
        "Hello! Thank you for calling [Company Name]. I'm an AI assistant here to help you. How can I assist you today?",
      businessHours: {
        start: "09:00",
        end: "17:00",
        timezone: "America/New_York",
      },
      maxCallDuration: 1800, // 30 minutes
      voicemailEnabled: true,
      transferOptions: {
        agentTransfer: true,
        callbackOption: true,
        emailFollowup: true,
      },
      aiSettings: {
        model: "anthropic/claude-3.5-sonnet",
        temperature: 0.7,
        maxTokens: 1000,
        voice: "Polly.Amy-Neural",
      },
    };
  }

  /**
   * Generate TwiML response for incoming calls
   */
  async handleIncomingCall(webhook: TwilioCallWebhook): Promise<string> {
    const twiml = new Twilio.twiml.VoiceResponse();

    // Check business hours
    if (!this.isBusinessHours()) {
      if (this.config.voicemailEnabled) {
        twiml.say(
          "We're currently outside of business hours. Please leave a message and we'll get back to you.",
        );
        twiml.record({
          transcribe: true,
          transcribeCallback: "/api/call-handler/voicemail",
          maxLength: 120,
        });
      } else {
        twiml.say(
          "We're currently unavailable. Please call back during business hours.",
        );
      }
      twiml.hangup();
      return twiml.toString();
    }

    // Create call session
    const session = await this.createCallSession(webhook);

    // Start recording with speech recognition
    twiml
      .start({
        action: "/api/call-handler/speech",
        method: "POST",
      })
      .stream({
        name: "call-stream",
        track: "inbound_track",
      });

    // Welcome message
    twiml.say(this.config.welcomeMessage);

    // Gather user input
    const gather = twiml.gather({
      input: ["speech"],
      action: "/api/call-handler/analyze",
      method: "POST",
      speechTimeout: "auto",
      timeout: 10,
    });

    gather.say(
      "Please tell me how I can help you, or say 'goodbye' to end the call.",
    );

    // Fallback if no speech detected
    twiml.redirect(
      {
        method: "POST",
      },
      "/api/call-handler/analyze",
    );

    return twiml.toString();
  }

  /**
   * Handle speech recognition results
   */
  async handleSpeechResult(
    sessionId: string,
    speechResult: TwilioSpeechResult,
  ): Promise<void> {
    if (!speechResult.final) return;

    const session = await this.getCallSession(sessionId);
    if (!session) return;

    // Save transcript
    const transcript: CallTranscript = {
      id: `transcript_${Date.now()}`,
      sessionId,
      speaker: "caller",
      content: speechResult.speech_result,
      timestamp: new Date(),
      confidence: speechResult.confidence,
    };

    await this.saveTranscript(transcript);

    // Analyze and respond
    await this.processCallInput(sessionId, speechResult.speech_result);
  }

  /**
   * Process call input and generate AI response
   */
  async processCallInput(
    sessionId: string,
    userInput: string,
  ): Promise<string> {
    const session = await this.getCallSession(sessionId);
    if (!session) return "";

    try {
      // Get conversation history
      const history = await this.getConversationHistory(sessionId);

      // Generate AI response using existing OpenRouter integration
      const response = await executeSimpleGeneration({
        prompt: userInput,
        enableWebSearch: false,
        enableDeepResearch: false,
        reasoningEffort: "medium",
        modelProvider: "openai",
        userId: "system", // Use system user for call handling
      });

      // Save AI response
      const aiResponse: CallResponse = {
        id: `response_${Date.now()}`,
        sessionId,
        content: response.text,
        timestamp: new Date(),
        modelUsed: response.provider,
        responseTime: 0, // Not available from simple generation
      };

      await this.saveResponse(aiResponse);

      // Send response back to Twilio (this would be handled by the API endpoint)
      return response.text;
    } catch (error) {
      console.error("Error processing call input:", error);
      await this.handleCallError(sessionId, error as Error);
      return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
    }
  }

  /**
   * Handle voicemail recordings
   */
  async handleVoicemail(
    recordingUrl: string,
    transcription: string,
  ): Promise<void> {
    // Process voicemail and create lead
    const leadData = {
      name: "Voicemail Caller",
      email: `voicemail_${Date.now()}@unknown.com`, // Generate a placeholder email
      phone: "Unknown",
      source: "voicemail",
      status: "new",
      notes: `Voicemail: ${transcription}`,
      recordingUrl,
    };

    // Create lead in AgentsFlowAI
    await this.createLeadFromVoicemail(leadData);
  }

  /**
   * Create call session in database
   */
  private async createCallSession(
    webhook: TwilioCallWebhook,
  ): Promise<CallSession> {
    const session: CallSession = {
      id: webhook.CallSid,
      phoneNumber: webhook.To,
      callerId: webhook.From,
      startTime: new Date(),
      status: "ringing",
      transcript: [],
      aiResponses: [],
    };

    await prisma.callSession.create({
      data: {
        id: session.id,
        phoneNumber: session.phoneNumber,
        callerId: session.callerId,
        startTime: session.startTime,
        status: session.status,
      },
    });

    return session;
  }

  /**
   * Get call session from database
   */
  private async getCallSession(sessionId: string): Promise<CallSession | null> {
    const sessionData = await prisma.callSession.findUnique({
      where: { id: sessionId },
    });

    if (!sessionData) return null;

    const transcripts = await prisma.callTranscript.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });

    const responses = await prisma.callResponse.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });

    return {
      ...sessionData,
      transcript: transcripts,
      aiResponses: responses,
    };
  }

  /**
   * Save transcript to database
   */
  private async saveTranscript(transcript: CallTranscript): Promise<void> {
    await prisma.callTranscript.create({
      data: {
        id: transcript.id,
        sessionId: transcript.sessionId,
        speaker: transcript.speaker,
        content: transcript.content,
        timestamp: transcript.timestamp,
        confidence: transcript.confidence,
        duration: transcript.duration,
      },
    });
  }

  /**
   * Save AI response to database
   */
  private async saveResponse(response: CallResponse): Promise<void> {
    await prisma.callResponse.create({
      data: {
        id: response.id,
        sessionId: response.sessionId,
        content: response.content,
        timestamp: response.timestamp,
        modelUsed: response.modelUsed,
        responseTime: response.responseTime,
      },
    });
  }

  /**
   * Get conversation history for AI context
   */
  private async getConversationHistory(
    sessionId: string,
  ): Promise<Array<{ role: string; content: string }>> {
    const transcripts = await prisma.callTranscript.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });

    const responses = await prisma.callResponse.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });

    // Combine and sort by timestamp
    const allMessages = [
      ...transcripts.map((t) => ({
        role: t.speaker,
        content: t.content,
        timestamp: t.timestamp,
      })),
      ...responses.map((r) => ({
        role: "assistant",
        content: r.content,
        timestamp: r.timestamp,
      })),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return allMessages.map((m) => ({ role: m.role, content: m.content }));
  }

  /**
   * Update call session
   */
  private async updateCallSession(
    sessionId: string,
    updates: Partial<CallSession>,
  ): Promise<void> {
    await prisma.callSession.update({
      where: { id: sessionId },
      data: updates,
    });
  }

  /**
   * Handle call errors
   */
  private async handleCallError(
    sessionId: string,
    error: Error,
  ): Promise<void> {
    await this.updateCallSession(sessionId, {
      status: "failed",
      endTime: new Date(),
    });

    // Log error
    console.error(`Call session ${sessionId} failed:`, error);
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    const [startHour, startMinute] = this.config.businessHours.start
      .split(":")
      .map(Number);
    const [endHour, endMinute] = this.config.businessHours.end
      .split(":")
      .map(Number);

    start.setHours(startHour, startMinute, 0, 0);
    end.setHours(endHour, endMinute, 0, 0);

    return now >= start && now <= end;
  }

  /**
   * Create lead from voicemail in AgentsFlowAI
   */
  private async createLeadFromVoicemail(leadData: any): Promise<void> {
    // This would integrate with your existing lead creation API
    // For now, we'll create a basic lead record
    await prisma.lead.create({
      data: {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        source: leadData.source,
        status: leadData.status,
        notes: leadData.notes,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
}

export const twilioService = new TwilioService();
