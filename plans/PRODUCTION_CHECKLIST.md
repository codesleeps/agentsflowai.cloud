# Production Readiness Checklist

This checklist ensures the AgentsFlowAI application meets industry standards for production deployment.

## Pre-Deployment Verification

### 1. Code Quality ✅

- [x] Run `npm run lint` - No linting errors
- [x] Run `npm run typecheck` - No TypeScript errors
- [x] Run `npm run test` - All tests passing (unit tests fixed)
- [x] Run `npm run build` - Build completes successfully
- [x] Code review completed for recent changes
- [x] No console.log statements in production code
- [x] All TODO comments addressed or documented

### 2. Routes & Navigation 🗺️

#### Public Routes
- [ ] `/` - Root redirects correctly (authenticated → dashboard, unauthenticated → welcome)
- [ ] `/welcome` - Marketing landing page loads
- [ ] `/fast-chat` - Fast chat interface accessible

#### Protected Routes (Dashboard)
- [ ] `/dashboard` - Main dashboard displays correctly
- [ ] `/ai-agents` - AI Agents hub page loads
- [ ] `/ai-agents/seo` - SEO Agent page functional
- [ ] `/ai-agents/content` - Content Creation Agent functional
- [ ] `/ai-agents/social` - Social Media Agent functional
- [ ] `/chat` - AI Chat Agent working
- [ ] `/leads` - Lead management page loads
- [ ] `/leads/new` - Create new lead form works
- [ ] `/leads/[id]/edit` - Edit lead page exists and works
- [ ] `/services` - Service packages display correctly
- [ ] `/appointments` - Appointment scheduling works
- [ ] `/analytics` - Analytics dashboard displays
- [ ] `/ai-usage` - AI usage tracking page loads

### 3. Navigation Links 🔗

#### Sidebar Navigation
- [ ] Dashboard link navigates correctly
- [ ] AI Agents link works
- [ ] AI Chat Agent link works
- [ ] Leads link works
- [ ] Services link works
- [ ] Appointments link works
- [ ] Analytics link works
- [ ] Website link navigates to welcome page

#### Breadcrumbs & Back Links
- [ ] "Back to Dashboard" links work on all pages
- [ ] "Back to AI Agents" links work on sub-pages
- [ ] "Back to Leads" link works on lead forms

#### Welcome Page Links
- [ ] Navigation menu links (Features, How It Works, Pricing, Testimonials, Contact)
- [ ] CTA buttons ("Get Started", "Start Free Trial")
- [ ] Footer links functional
- [ ] Mobile menu works correctly

### 4. Buttons & Interactive Elements 🖱️

#### Forms
- [ ] Lead creation form submits successfully
- [ ] Lead edit form saves changes
- [ ] Appointment booking form works
- [ ] Contact form on welcome page submits
- [ ] All form validation works correctly
- [ ] Error messages display appropriately

#### Buttons
- [ ] All primary action buttons work
- [ ] Cancel buttons navigate correctly
- [ ] Delete buttons show confirmation dialogs
- [ ] Export/Download buttons function
- [ ] Filter/Search buttons work
- [ ] Pagination buttons work

#### Modals & Dialogs
- [ ] Lead details modal opens and closes
- [ ] Confirmation dialogs work
- [ ] Close buttons (X) work on all modals
- [ ] Clicking outside modal closes it (if applicable)

### 5. API Endpoints 🌐

#### Health & Status
- [ ] `GET /api/health` - Returns healthy status
- [ ] Response includes database connectivity check
- [ ] Response includes memory usage

#### Leads
- [ ] `GET /api/leads` - Returns leads list
- [ ] `POST /api/leads` - Creates new lead
- [ ] `GET /api/leads/[id]` - Returns single lead
- [ ] `PATCH /api/leads/[id]` - Updates lead
- [ ] `DELETE /api/leads/[id]` - Deletes lead
- [ ] Filtering by status works
- [ ] Filtering by source works

#### Services
- [ ] `GET /api/services` - Returns services list
- [ ] `POST /api/services` - Creates new service (if applicable)

#### Appointments
- [ ] `GET /api/appointments` - Returns appointments
- [ ] `POST /api/appointments` - Creates appointment
- [ ] Filtering by lead_id works

#### Conversations & Messages
- [ ] `GET /api/conversations` - Returns conversations
- [ ] `POST /api/conversations` - Creates conversation
- [ ] `GET /api/conversations/[id]/messages` - Returns messages
- [ ] `POST /api/conversations/[id]/messages` - Creates message

#### Dashboard
- [ ] `GET /api/dashboard/stats` - Returns statistics
- [ ] Stats include lead counts, conversion rates, etc.

#### AI Endpoints
- [ ] AI chat endpoint responds correctly
- [ ] AI lead qualification works
- [ ] AI service recommendations work
- [ ] Error handling for AI failures

### 6. Authentication & Authorization 🔐

- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Sign out flow works
- [ ] Protected routes redirect unauthenticated users
- [ ] Session persistence works
- [ ] Token refresh works (if applicable)
- [ ] User profile displays correctly
- [ ] Organization switching works (if multi-tenant)

### 7. Database Operations 💾

- [ ] All migrations applied successfully
- [ ] Seed data loaded (if applicable)
- [ ] CRUD operations work for all models
- [ ] Foreign key relationships maintained
- [ ] Soft deletes work (if implemented)
- [ ] Timestamps (created_at, updated_at) populate correctly
- [ ] Database connection pooling configured

### 8. AI Integration 🤖

#### Chat Agent
- [ ] Chat messages send successfully
- [ ] AI responses generate correctly
- [ ] Conversation history persists
- [ ] Context awareness works
- [ ] Service recommendations appear

#### Lead Qualification
- [ ] AI scoring generates for new leads
- [ ] Budget estimates are reasonable
- [ ] Recommendations are relevant
- [ ] Fallback works if AI fails

#### Content Generation (AI Agents)
- [ ] SEO keyword research works
- [ ] Content creation generates output
- [ ] Social media post generation works
- [ ] Copy to clipboard functionality works

### 9. Error Handling ⚠️

- [ ] 404 page displays for invalid routes
- [ ] Error boundary catches React errors
- [ ] API errors show user-friendly messages
- [ ] Network errors handled gracefully
- [ ] Form validation errors display correctly
- [ ] Toast notifications work for errors
- [ ] Console errors are minimal/expected only

### 10. Performance & Optimization ⚡

- [ ] Initial page load < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] Images optimized (using Next.js Image component)
- [ ] Code splitting implemented
- [ ] Lazy loading for heavy components
- [ ] Database queries optimized (no N+1 queries)
- [ ] API responses cached where appropriate
- [ ] SWR revalidation working correctly

### 11. Responsive Design 📱

- [ ] Desktop view (1920x1080) works correctly
- [ ] Laptop view (1366x768) works correctly
- [ ] Tablet view (768x1024) works correctly
- [ ] Mobile view (375x667) works correctly
- [ ] Sidebar collapses on mobile
- [ ] Mobile menu works
- [ ] Tables scroll horizontally on mobile
- [ ] Forms are usable on mobile
- [ ] Touch targets are appropriately sized

### 12. Security 🔒

#### Headers
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy configured
- [ ] Strict-Transport-Security (HSTS) enabled in production
- [ ] Referrer-Policy set

#### Middleware
- [ ] Rate limiting active (60 requests/minute)
- [ ] CORS configured correctly
- [ ] Authentication middleware protects routes
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS prevention (React escaping)

#### Environment
- [ ] .env files in .gitignore
- [ ] No secrets in code
- [ ] Environment variables validated on startup
- [ ] Sensitive data encrypted in database

### 13. Deployment Configuration 🚀

#### PM2
- [ ] ecosystem.config.mjs exists and is valid
- [ ] Cluster mode configured
- [ ] Auto-restart enabled
- [ ] Memory limits set
- [ ] Log rotation configured
- [ ] Environment variables set for production

#### Nginx (if applicable)
- [ ] Reverse proxy configured
- [ ] SSL/TLS certificate installed
- [ ] HTTP to HTTPS redirect
- [ ] Gzip compression enabled
- [ ] Static file caching configured
- [ ] WebSocket support (if needed)

#### Server
- [ ] Firewall configured (UFW)
- [ ] SSH hardened (key-only, no root)
- [ ] Fail2ban configured
- [ ] Automatic security updates enabled
- [ ] Monitoring setup (PM2, logs)
- [ ] Backup strategy in place

### 14. Environment Variables 🔐

Required:
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXT_PUBLIC_APP_URL` - Application URL
- [ ] `NODE_ENV=production`
- [ ] `PORT` - Application port (default 3000)

Recommended:
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `ANTHROPIC_API_KEY` - Anthropic API key
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI key
- [ ] `SESSION_SECRET` - Session encryption key
- [ ] `INNGEST_EVENT_KEY` - Inngest event key
- [ ] `INNGEST_SIGNING_KEY` - Inngest signing key

### 15. Monitoring & Logging 📊

- [ ] Application logs to file
- [ ] Error logs separate from access logs
- [ ] Log rotation configured
- [ ] Health endpoint monitored
- [ ] Uptime monitoring setup
- [ ] Error tracking (Sentry, etc.) configured
- [ ] Performance monitoring active
- [ ] Database query monitoring

### 16. Data & Content ✍️

- [ ] All placeholder text replaced
- [ ] Sample data seeded (if applicable)
- [ ] Images have alt text
- [ ] Links have descriptive text
- [ ] Meta tags configured (title, description)
- [ ] Favicon present
- [ ] Open Graph tags for social sharing
- [ ] robots.txt configured
- [ ] sitemap.xml generated

### 17. Browser Compatibility 🌐

- [ ] Chrome (latest) ✅
- [ ] Firefox (latest) ✅
- [ ] Safari (latest) ✅
- [ ] Edge (latest) ✅
- [ ] Mobile Safari (iOS) ✅
- [ ] Chrome Mobile (Android) ✅

### 18. Accessibility ♿

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels on interactive elements
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader compatible
- [ ] Form labels associated with inputs
- [ ] Error messages announced to screen readers

### 19. Final Checks ✨

- [ ] Run automated verification script: `tsx scripts/production-verify.ts`
- [ ] All automated tests pass
- [ ] Manual smoke test completed
- [ ] Staging environment tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Documentation updated
- [ ] Changelog updated

---

## Deployment Day Checklist

### Pre-Deployment (1 hour before)
1. [ ] Notify team of deployment window
2. [ ] Create database backup
3. [ ] Create code backup
4. [ ] Verify environment variables on server
5. [ ] Test rollback procedure

### Deployment
1. [ ] Pull latest code from main branch
2. [ ] Run `npm ci` to install dependencies
3. [ ] Run database migrations: `npm run db:migrate`
4. [ ] Run build: `npm run build`
5. [ ] Start with PM2: `pm2 reload ecosystem.config.mjs --env production`
6. [ ] Verify PM2 status: `pm2 status`
7. [ ] Check logs: `pm2 logs agentsflow-ai --lines 50`

### Post-Deployment (15 minutes after)
1. [ ] Visit application URL and verify it loads
2. [ ] Test critical user flows (sign in, create lead, chat)
3. [ ] Check `/api/health` endpoint
4. [ ] Monitor error logs for issues
5. [ ] Verify database connections
6. [ ] Test AI functionality
7. [ ] Check performance metrics

### If Issues Occur
1. [ ] Check PM2 logs: `pm2 logs agentsflow-ai`
2. [ ] Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. [ ] Verify environment variables
4. [ ] Check database connectivity
5. [ ] If critical: Execute rollback: `./deploy/rollback.sh`

---

## Sign-Off

- [ ] **Developer**: All code changes tested and verified
- [ ] **QA**: Manual testing completed, no critical bugs
- [ ] **DevOps**: Server configuration verified, monitoring active
- [ ] **Product Owner**: Features meet requirements
- [ ] **Security**: Security review completed

**Deployment Date**: _______________

**Deployed By**: _______________

**Version**: _______________

**Notes**:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
