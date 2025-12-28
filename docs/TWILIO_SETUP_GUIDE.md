# Twilio Setup Guide for AI Call Handler

## Your Twilio Credentials

⚠️ **IMPORTANT: Keep your Twilio credentials secure!** Never commit them to version control.

**To get your credentials:**

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Account Info** → **API Credentials**
3. Copy your **Account SID** and **Auth Token**

```
Account SID: [Your Account SID from Twilio Console]
Auth Token: [Your Auth Token from Twilio Console]
```

## Step 1: Install Dependencies

```bash
npm install twilio @google-cloud/speech
```

## Step 2: Environment Configuration

Add your Twilio credentials to your `.env` file:

```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**⚠️ IMPORTANT:** Replace the placeholder values with your actual Twilio credentials and phone number.

## Step 3: Twilio Console Setup

### 1. Purchase a Phone Number

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Buy a Number**
3. Choose your country and features (SMS/Voice)
4. Purchase a number

### 2. Configure Webhooks

For your purchased phone number:

1. Click on your phone number
2. Scroll to **Voice & Fax** section
3. Configure the following webhooks:

**A. A CALL COMES IN:**

- **Webhook URL:** `https://your-domain.com/api/call-handler/incoming`
- **Method:** `POST`

**B. Status Callback:**

- **Webhook URL:** `https://your-domain.com/api/call-handler/status`
- **Method:** `POST`

**C. Speech Recognition (Optional but recommended):**

- **Webhook URL:** `https://your-domain.com/api/call-handler/speech`
- **Method:** `POST`

### 3. Enable Speech Recognition

1. In your phone number settings, find **Speech Recognition**
2. Enable it and select your preferred speech recognition service
3. Set the **Speech Recognition URL** to: `https://your-domain.com/api/call-handler/speech`

## Step 4: Database Migration

```bash
npm run db:generate
npm run db:migrate
```

## Step 5: Test Your Setup

### Local Testing (with ngrok)

1. **Start your development server:**

   ```bash
   npm run dev
   ```

2. **Expose your local server:**

   ```bash
   npx ngrok http 3000
   ```

3. **Update Twilio webhooks** with your ngrok URL:
   - Replace `https://your-domain.com` with your ngrok URL
   - Example: `https://abc123.ngrok.io/api/call-handler/incoming`

### Production Deployment

1. **Deploy to your VPS/server**
2. **Update Twilio webhooks** with your production URL
3. **Test with a real phone call**

## Step 6: Test Call Flow

1. **Call your Twilio number**
2. **Listen for the AI greeting**
3. **Speak your request** (e.g., "I'm interested in your services")
4. **Listen to the AI response**
5. **Check the database** for call logs:
   ```sql
   SELECT * FROM call_sessions ORDER BY start_time DESC LIMIT 5;
   ```

## Troubleshooting

### Common Issues

**1. Calls not connecting:**

- Check Twilio webhook URLs are correct
- Verify your server is running and accessible
- Check firewall settings

**2. Speech recognition not working:**

- Ensure speech recognition is enabled in Twilio Console
- Check that the speech recognition webhook is configured
- Verify your server can receive POST requests

**3. AI responses slow:**

- Check your OpenRouter API key is valid
- Monitor OpenRouter rate limits
- Consider using faster local models

**4. Database errors:**

- Run migrations: `npm run db:migrate`
- Check database connection
- Verify Prisma client is up to date

### Debug Mode

Enable debug logging by adding this to your code:

```typescript
// In twilio-service.ts
private async handleCallError(sessionId: string, error: Error): Promise<void> {
  console.error(`Call session ${sessionId} failed:`, error);
  // Add additional debugging here
}
```

## Security Notes

1. **Keep your credentials secure** - Never commit `.env` files to version control
2. **Verify Twilio signatures** - The system includes signature verification
3. **Use HTTPS** - Always use HTTPS in production
4. **Rate limiting** - Implement rate limiting for webhook endpoints

## Next Steps

1. **Customize the call flow** in `twilio-service.ts`
2. **Train your AI agents** for better responses
3. **Set up call analytics** and monitoring
4. **Integrate with your CRM** for lead management

## Support

For Twilio-specific issues:

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Support](https://support.twilio.com/)

For AI Call Handler issues:

- Check the troubleshooting section above
- Review the main documentation: `docs/AI_CALL_HANDLER.md`
