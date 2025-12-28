# AI Call Handler System

## Overview

The AI Call Handler is a sophisticated telephony system that integrates with your existing AgentsFlowAI application to provide intelligent phone call answering, lead qualification, and customer service automation.

## Architecture

```
Phone Call → Twilio Integration → AI Processing → AgentsFlowAI Integration
```

### Core Components

1. **Twilio Service** (`src/server-lib/call-handler/twilio-service.ts`)

   - Handles incoming/outgoing calls via Twilio API
   - Manages call sessions and speech recognition
   - Generates TwiML responses for call flow control

2. **API Endpoints** (`src/app/api/call-handler/route.ts`)

   - `/api/call-handler/incoming` - Handle incoming call webhooks
   - `/api/call-handler/speech` - Process speech recognition results
   - `/api/call-handler/analyze` - Analyze input and generate responses
   - `/api/call-handler/voicemail` - Handle voicemail recordings
   - `/api/call-handler/status` - Update call status

3. **Database Models** (Prisma Schema)
   - `CallSession` - Main call session tracking
   - `CallTranscript` - Speech-to-text transcripts
   - `CallResponse` - AI-generated responses

## Features

### 🎯 **Core Functionality**

- **24/7 Call Answering**: Never miss a call with AI-powered answering
- **Speech Recognition**: Real-time transcription of caller input
- **AI Response Generation**: Leverage existing OpenRouter integration
- **Lead Creation**: Automatically create leads from calls
- **Call Recording**: Full call recording and transcription
- **Business Hours**: Respect business hours with voicemail outside hours

### 🔧 **Advanced Features**

- **Intent Recognition**: Identify caller intent (sales, support, information)
- **Sentiment Analysis**: Analyze caller sentiment and urgency
- **Lead Qualification**: Score and qualify leads based on conversation
- **Follow-up Automation**: Schedule callbacks and send follow-up emails
- **Multi-channel Integration**: Connect calls to web chat and email

### 📊 **Analytics & Reporting**

- **Call Metrics**: Track call volume, duration, and success rates
- **Conversion Tracking**: Measure call-to-lead conversion rates
- **AI Performance**: Monitor AI response quality and accuracy
- **Business Insights**: Identify common caller questions and issues

## Setup & Configuration

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenRouter Configuration (already configured)
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional: Google Speech-to-Text (for enhanced accuracy)
GOOGLE_SPEECH_API_KEY=your_google_speech_key
```

### 2. Twilio Setup

1. **Purchase a Phone Number** in Twilio Console
2. **Configure Webhooks** for your phone number:

   - Voice & Fax → A CALL COMES IN: `POST https://your-domain.com/api/call-handler/incoming`
   - Status Callback: `POST https://your-domain.com/api/call-handler/status`
   - Speech Recognition: `POST https://your-domain.com/api/call-handler/speech`

3. **Enable Speech Recognition** in Twilio Console:
   - Go to Phone Numbers → Active Numbers → Your Number
   - Configure "Voice & Fax" settings
   - Enable "Speech Recognition" feature

### 3. Database Migration

Run the database migration to create call handler tables:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Install Dependencies

```bash
npm install twilio @google-cloud/speech
```

## Usage Examples

### Basic Call Flow

1. **Incoming Call**: Twilio receives call and calls `/api/call-handler/incoming`
2. **Welcome Message**: AI greets caller and asks how to help
3. **Speech Recognition**: Caller speaks, Twilio transcribes and sends to `/api/call-handler/speech`
4. **AI Processing**: System analyzes input and generates response
5. **Response**: AI speaks response back to caller
6. **Lead Creation**: If caller provides contact info, create lead in AgentsFlowAI
7. **Follow-up**: Schedule callback or send email based on conversation

### Integration with AgentsFlowAI

The call handler seamlessly integrates with your existing AgentsFlowAI system:

```typescript
// Example: Creating a lead from a call
const leadData = {
  name: "John Doe",
  phone: "+1234567890",
  email: "john@example.com",
  source: "phone_call",
  status: "new",
  notes: "Called asking about pricing and availability",
  budget: "medium",
  timeline: "1-3months",
};

// This integrates with your existing lead creation system
await createLead(leadData);
```

## API Reference

### Call Session Management

```typescript
// Get call session details
GET /api/call-handler?sessionId=abc123

// Response:
{
  "id": "abc123",
  "phoneNumber": "+1234567890",
  "callerId": "+0987654321",
  "startTime": "2024-12-24T08:00:00Z",
  "endTime": "2024-12-24T08:05:00Z",
  "status": "completed",
  "transcripts": [...],
  "responses": [...]
}
```

### Speech Recognition

Twilio automatically sends speech recognition results to `/api/call-handler/speech`:

```typescript
// Twilio POST data:
{
  "AccountSid": "AC...",
  "CallSid": "CA...",
  "Confidence": "0.95",
  "Final": "true",
  "SpeechResult": "I'm interested in your services",
  "Timestamp": "1234567890",
  "Track": "inbound"
}
```

## Customization

### Call Flow Customization

Modify the call flow in `twilio-service.ts`:

```typescript
private getDefaultConfig(): CallConfig {
  return {
    welcomeMessage: "Custom welcome message",
    businessHours: {
      start: "08:00",
      end: "18:00",
      timezone: "America/Los_Angeles"
    },
    aiSettings: {
      model: "openai/gpt-4-turbo", // Use different model
      temperature: 0.8,
      maxTokens: 1500
    }
  };
}
```

### AI Agent Selection

Configure which AI agent handles calls:

```typescript
// In processCallInput method
const response = await executeWithFallback({
  agentId: "your-preferred-agent", // Use specific agent
  message: userInput,
  conversationHistory: history,
});
```

### Lead Qualification Rules

Customize lead qualification logic:

```typescript
// Add to call processing
if (userInput.includes("pricing")) {
  await this.createLeadFromCall(sessionId, {
    budget: "high",
    timeline: "immediate",
  });
}
```

## Monitoring & Debugging

### Call Logs

All calls are logged with full transcripts:

```sql
-- View recent calls
SELECT * FROM call_sessions
WHERE start_time > NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;
```

### Error Handling

The system includes comprehensive error handling:

- **Twilio API Errors**: Automatic retry with exponential backoff
- **AI Model Failures**: Fallback to alternative models
- **Database Errors**: Graceful degradation with logging
- **Network Issues**: Circuit breaker pattern for external APIs

### Performance Monitoring

Monitor key metrics:

```typescript
// Call metrics
{
  totalCalls: 150,
  answeredCalls: 142,
  missedCalls: 8,
  averageCallDuration: 180, // seconds
  averageResponseTime: 2.5, // seconds
  customerSatisfaction: 4.2, // out of 5
  conversionRate: 0.25 // 25%
}
```

## Security Considerations

### Data Privacy

- **Call Recording**: Comply with local recording laws
- **PII Protection**: Encrypt sensitive personal information
- **Data Retention**: Configure automatic data deletion policies
- **Access Control**: Restrict access to call recordings and transcripts

### Authentication

- **Twilio Signature Verification**: Verify all webhook requests
- **API Security**: Use HTTPS and proper authentication
- **Rate Limiting**: Prevent abuse of call handling endpoints

## Troubleshooting

### Common Issues

1. **Calls Not Connecting**

   - Check Twilio webhook URLs are correct
   - Verify phone number is configured properly
   - Check for network connectivity issues

2. **Speech Recognition Not Working**

   - Ensure speech recognition is enabled in Twilio Console
   - Check audio quality and background noise
   - Verify caller is speaking clearly

3. **AI Responses Slow**

   - Check OpenRouter API key and rate limits
   - Monitor model availability
   - Consider using faster local models

4. **Database Errors**
   - Run migrations if schema changed
   - Check database connection
   - Verify Prisma client is up to date

### Debug Mode

Enable debug logging:

```typescript
// In twilio-service.ts
private async handleCallError(sessionId: string, error: Error): Promise<void> {
  console.error(`Call session ${sessionId} failed:`, error);
  // Add additional debugging here
}
```

## Future Enhancements

### Planned Features

- **Multi-language Support**: Handle calls in multiple languages
- **Advanced Analytics**: Sentiment analysis and trend detection
- **Integration with CRM**: Direct integration with popular CRMs
- **Call Routing**: Intelligent call routing to human agents
- **Voice Biometrics**: Speaker identification and verification

### API Extensions

- **Real-time Call Monitoring**: Live call dashboard
- **Call Quality Metrics**: Audio quality and connection metrics
- **Integration Webhooks**: Notify external systems of call events

## Support

For support and questions:

1. Check the troubleshooting section above
2. Review Twilio documentation for telephony issues
3. Check OpenRouter documentation for AI model issues
4. File issues on the project repository

## License

This AI Call Handler system is part of the AgentsFlowAI project and follows the same license terms.
