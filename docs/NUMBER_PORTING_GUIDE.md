# Number Porting Guide for AI Call Handler

## Overview

This guide explains how to port your existing traditional landline/mobile number to Twilio so you can use it directly with your AI Call Handler system.

## Why Port Your Number?

✅ **Keep your existing phone number** - No need to change business cards or marketing
✅ **Professional setup** - Direct integration without call forwarding
✅ **Better call quality** - No forwarding delays or quality loss
✅ **Full Twilio features** - Access to all advanced telephony features

## Porting Process Overview

### Phase 1: Preparation (1-2 days)

### Phase 2: Port Request (2-4 weeks)

### Phase 3: Activation & Setup (1-2 days)

## Phase 1: Preparation

### Step 1: Gather Required Information

You'll need these details from your current phone provider:

**Account Information:**

- Account Number (from your bill)
- Account PIN/Password (security code)
- Billing Telephone Number (BTN) - usually the main account number
- Account Holder Name (exactly as it appears on the bill)

**Number Information:**

- Phone Number(s) to port
- Service Type (Residential, Business, Wireless)
- Line Type (Landline, Mobile, VoIP)

### Step 2: Verify Porting Eligibility

**Eligibility Requirements:**

- ✅ Number must be active and in good standing
- ✅ Account holder must authorize the port
- ✅ No recent carrier changes (within 60 days)
- ✅ No outstanding balance with current provider
- ✅ Number must be in the same geographic area

**Common Issues That Prevent Porting:**

- ❌ Number is disconnected or suspended
- ❌ Account has unpaid bills
- ❌ Recent carrier change (within 60 days)
- ❌ Number is not in your name
- ❌ Number is a premium/vanity number (may have restrictions)

### Step 3: Contact Your Current Provider

**What to Ask:**

1. "Is my number eligible for porting?"
2. "What is my account number and BTN?"
3. "What is my account PIN/password?"
4. "Are there any early termination fees?"
5. "How long does the porting process take?"

**Important:** Do NOT cancel your service until the port is complete!

## Phase 2: Port Request

### Step 4: Purchase a Temporary Twilio Number

**Why you need this:**

- Your existing number will be disconnected during porting
- Use this number for business during the transition
- Cost: ~$1/month

**How to purchase:**

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Buy a Number**
3. Choose your area code to match your existing number
4. Select **Voice** capability
5. Complete purchase

### Step 5: Submit Port Request to Twilio

**Online Port Request:**

1. Go to [Twilio Porting](https://console.twilio.com/us1/phone-numbers/manage/ports)
2. Click **"Start a new port"**
3. Fill out the porting form with your gathered information
4. Upload required documents (see below)
5. Submit and pay the porting fee

**Required Documents:**

- Recent phone bill (showing account number and number to port)
- Government-issued ID (if requested)
- Letter of Authorization (LOA) - Twilio may provide template

**Porting Fees:**

- **US Numbers:** $5-10 per number
- **International Numbers:** Varies by country
- **Business Numbers:** May have additional verification

### Step 6: Verification Process

**Twilio Review (1-3 business days):**

- Twilio reviews your submission
- May request additional documentation
- Will contact you if issues are found

**Current Provider Verification (varies):**

- Your current provider receives the port request
- They verify account ownership and eligibility
- May contact you for authorization

## Phase 3: Activation & Setup

### Step 7: Porting Date Coordination

**Timeline:**

- **US Numbers:** 5-10 business days
- **International Numbers:** 10-20 business days
- **Business Numbers:** May take longer due to verification

**Important Notes:**

- Your existing service will be disconnected on the port date
- Plan accordingly for business continuity
- Have your temporary Twilio number ready

### Step 8: Number Activation

**On Port Date:**

1. Your existing provider disconnects the number
2. Twilio activates the number on their network
3. Number becomes available in your Twilio Console
4. Test the number immediately

**Testing Checklist:**

- ✅ Incoming calls reach Twilio
- ✅ Outgoing calls work
- ✅ Call quality is good
- ✅ No echo or connection issues

### Step 9: Configure AI Call Handler

**Update Environment Variables:**

```bash
# Update your .env file
TWILIO_PHONE_NUMBER=+1YOURPORTEDNUMBER
```

**Configure Webhooks:**

1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Click on your ported number
3. Configure webhooks:
   - **A CALL COMES IN:** `https://your-domain.com/api/call-handler/incoming`
   - **Status Callback:** `https://your-domain.com/api/call-handler/status`
   - **Speech Recognition:** `https://your-domain.com/api/call-handler/speech`

### Step 10: Test Your AI Call Handler

**Testing Steps:**

1. Call your ported number
2. Verify AI greeting plays
3. Test speech recognition
4. Confirm lead creation works
5. Check call recording and transcripts

## Troubleshooting Common Issues

### Port Request Rejected

**Causes:**

- Incorrect account information
- Number not eligible for porting
- Outstanding balance with current provider

**Solutions:**

- Double-check all information
- Contact current provider to resolve issues
- Ensure account is in good standing

### Porting Takes Too Long

**Causes:**

- Current provider delays
- Missing documentation
- Business number verification complexity

**Solutions:**

- Follow up with Twilio support
- Contact current provider for status
- Ensure all documentation is complete

### Number Not Working After Port

**Causes:**

- Webhooks not configured
- Environment variables not updated
- DNS or routing issues

**Solutions:**

- Verify webhook configuration
- Check environment variables
- Test with different phones/locations

## Cost Breakdown

### Initial Costs

- **Temporary Twilio Number:** $1/month
- **Porting Fee:** $5-10 (one-time)
- **Setup Time:** 2-4 weeks

### Ongoing Costs

- **Ported Number:** $1/month
- **Voice Calls:** $0.0135 per minute (US)
- **Speech Recognition:** $0.0025 per minute
- **Text-to-Speech:** $0.016 per 1000 characters

## Alternative: Call Forwarding (If Porting Fails)

If porting doesn't work, you can always fall back to call forwarding:

1. **Keep your existing number**
2. **Set up call forwarding** to your temporary Twilio number
3. **Configure the Twilio number** with AI Call Handler
4. **Test thoroughly** before going live

## Support Resources

### Twilio Support

- [Porting Documentation](https://www.twilio.com/docs/phone-numbers/hosted-number-order-and-porting-portal-guide)
- [Porting FAQ](https://help.twilio.com/articles/223134888-Porting-Phone-Numbers-to-Twilio-FAQ)
- [Support Contact](https://help.twilio.com/)

### Your Current Provider

- Account management department
- Porting/number transfer department
- Business customer service

## Next Steps Checklist

- [ ] Gather account information from current provider
- [ ] Verify number eligibility
- [ ] Purchase temporary Twilio number
- [ ] Submit port request to Twilio
- [ ] Wait for porting completion (2-4 weeks)
- [ ] Configure webhooks on ported number
- [ ] Update environment variables
- [ ] Test AI Call Handler system
- [ ] Cancel temporary number (optional)

## Timeline Summary

| Phase        | Duration  | Key Actions                       |
| ------------ | --------- | --------------------------------- |
| Preparation  | 1-2 days  | Gather info, verify eligibility   |
| Port Request | 2-4 weeks | Submit request, wait for approval |
| Activation   | 1-2 days  | Configure webhooks, test system   |

**Total Time: 2-4 weeks**

---

**Ready to start the porting process?** Begin with Step 1: gathering your account information from your current phone provider!
