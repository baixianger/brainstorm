# Max Integration Plan: Microsoft Teams & WhatsApp

## Executive Summary

This plan outlines the technical approach for integrating Max (AI-powered requirements gathering) with Microsoft Teams and WhatsApp, enabling users to conduct requirements gathering sessions directly within their preferred communication platforms.

---

## Part 1: Microsoft Teams Integration

### 1.1 Overview

Build a Teams bot that delivers the full 6-phase Max experience natively within Microsoft Teams.

### 1.2 Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Microsoft      │────▶│  Azure Bot       │────▶│  Max Backend    │
│  Teams Client   │◀────│  Service         │◀────│  API            │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Azure Cosmos DB │
                        │  (Session State) │
                        └──────────────────┘
```

### 1.3 Components Required

| Component | Purpose |
|-----------|---------|
| Azure Bot Service | Hosts the bot and handles Teams channel communication |
| Bot Framework SDK | Node.js or C# SDK for building conversational logic |
| Adaptive Cards | Rich UI for phase transitions, choices, and summaries |
| Azure AD | Authentication and single sign-on |
| Azure Functions | Serverless compute for bot logic |
| Cosmos DB | Store conversation state and session data |

### 1.4 User Experience Flow

#### 1.4.1 Invocation Methods
- **Direct message**: User messages the Max bot directly
- **@mention in channel**: `@Max start new requirements session`
- **Messaging extension**: Action from compose box
- **Tab**: Embedded web view for full dashboard

#### 1.4.2 Conversation Flow (6 Phases)

```
User: @Max start session "Mobile Banking App"
Bot:  [Adaptive Card: Welcome + Phase 1 intro]
      "Let's discover your vision. What problem are you solving?"

User: "Customers can't check balances on the go"
Bot:  [Follow-up questions with suggested responses as buttons]
      ...continues through all 6 phases...

Bot:  [Final Adaptive Card: Summary + PDF download link]
      "Your requirements spec is ready! [Download PDF] [Share to Channel]"
```

### 1.5 Technical Implementation

#### 1.5.1 Phase 1: Bot Setup (Week 1-2)

```typescript
// bot.ts - Main bot handler
import { TeamsActivityHandler, CardFactory } from 'botbuilder';

export class MaxBot extends TeamsActivityHandler {
  constructor(conversationState, maxApiClient) {
    super();
    this.conversationState = conversationState;
    this.maxApi = maxApiClient;

    this.onMessage(async (context, next) => {
      const sessionState = await this.getSessionState(context);
      const response = await this.maxApi.processMessage({
        phase: sessionState.currentPhase,
        message: context.activity.text,
        sessionId: sessionState.id
      });

      await context.sendActivity({
        attachments: [this.buildAdaptiveCard(response)]
      });
      await next();
    });
  }
}
```

#### 1.5.2 Phase 2: Adaptive Cards for Rich UI (Week 2-3)

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Phase 2: User Identification",
      "weight": "bolder",
      "size": "large"
    },
    {
      "type": "TextBlock",
      "text": "Who are the primary users of this product?",
      "wrap": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "userTypes",
      "isMultiSelect": true,
      "choices": [
        { "title": "End Consumers", "value": "consumer" },
        { "title": "Business Users", "value": "business" },
        { "title": "Administrators", "value": "admin" },
        { "title": "Other (specify)", "value": "other" }
      ]
    }
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Continue", "data": { "action": "next" } }
  ]
}
```

#### 1.5.3 Phase 3: Teams App Manifest (Week 3)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "id": "{{BOT_ID}}",
  "version": "1.0.0",
  "name": { "short": "Max", "full": "Max Requirements AI" },
  "description": {
    "short": "AI-powered requirements gathering",
    "full": "Transform ideas into complete specification documents through guided AI conversation"
  },
  "bots": [{
    "botId": "{{BOT_ID}}",
    "scopes": ["personal", "team", "groupchat"],
    "commandLists": [{
      "scopes": ["personal"],
      "commands": [
        { "title": "start", "description": "Start a new requirements session" },
        { "title": "resume", "description": "Resume an existing session" },
        { "title": "export", "description": "Export current spec as PDF" }
      ]
    }]
  }],
  "staticTabs": [{
    "entityId": "dashboard",
    "name": "My Specs",
    "contentUrl": "https://max.omika.ai/teams/dashboard",
    "scopes": ["personal"]
  }]
}
```

### 1.6 Features Matrix

| Feature | Personal Chat | Group Chat | Channel |
|---------|--------------|------------|---------|
| Start session | ✓ | ✓ | ✓ |
| Multi-user collaboration | - | ✓ | ✓ |
| @mention notifications | - | ✓ | ✓ |
| PDF export | ✓ | ✓ | ✓ |
| Dashboard tab | ✓ | - | ✓ |

### 1.7 Deployment & Publishing

1. **Development**: Test with Teams Developer Portal sideloading
2. **Organization**: Publish to your tenant's app catalog
3. **Public**: Submit to Microsoft AppSource (requires certification)

### 1.8 Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup & Scaffolding | Week 1-2 | Bot registered, basic echo working |
| Core Conversation Flow | Week 3-5 | 6 phases working in personal chat |
| Adaptive Cards & UI | Week 6-7 | Rich interactive cards |
| Collaboration Features | Week 8-9 | Group/channel support |
| Testing & Polish | Week 10 | Bug fixes, edge cases |
| AppSource Submission | Week 11-12 | Certification process |

---

## Part 2: WhatsApp Integration

### 2.1 Overview

Build a WhatsApp Business bot using Meta's Cloud API to deliver Max's requirements gathering experience via mobile messaging.

### 2.2 Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  WhatsApp       │────▶│  Meta Cloud API  │────▶│  Webhook        │
│  User           │◀────│  (Graph API)     │◀────│  Server         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                 ┌─────────────────┐
                                                 │  Max Backend    │
                                                 │  API            │
                                                 └─────────────────┘
```

### 2.3 Prerequisites

| Requirement | Details |
|-------------|---------|
| Meta Business Account | Create at business.facebook.com |
| WhatsApp Business Account | Link to Meta Business |
| Business Verification | Submit documents for Meta verification |
| Phone Number | Dedicated number for the bot |
| SSL Certificate | Required for webhook endpoint |

### 2.4 User Experience Flow

```
User: Hi
Bot:  Welcome to Max! I help turn your ideas into complete
      requirement specs. Reply with your project name to begin.

User: Mobile Banking App
Bot:  Great! Let's start with *Phase 1: Discovery*

      What problem does "Mobile Banking App" solve for your users?

      Reply with your answer, or choose:
      1. Help me brainstorm
      2. Show example answers

User: 1
Bot:  Here are some questions to consider:
      • What frustration do users currently have?
      • What would success look like?
      • Who benefits most from this solution?

      Take your time and describe the core problem.

User: Customers can't easily check their balance on mobile
Bot:  Got it! ✓

      *Phase 1 Progress: 1/4 questions*

      Next: What's your vision for the ideal solution?
      ...
```

### 2.5 Technical Implementation

#### 2.5.1 Webhook Setup

```typescript
// webhook.ts
import express from 'express';
import crypto from 'crypto';

const app = express();

// Verification endpoint (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Message handler (POST)
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!verifySignature(req.body, signature)) {
    return res.sendStatus(401);
  }

  const { entry } = req.body;
  for (const e of entry) {
    for (const change of e.changes) {
      if (change.value.messages) {
        await handleMessage(change.value.messages[0]);
      }
    }
  }
  res.sendStatus(200);
});
```

#### 2.5.2 Message Handler

```typescript
// messageHandler.ts
import { MaxApiClient } from './maxApi';
import { WhatsAppClient } from './whatsappClient';

const maxApi = new MaxApiClient();
const wa = new WhatsAppClient(process.env.WHATSAPP_TOKEN);

async function handleMessage(message: WhatsAppMessage) {
  const { from, text, type } = message;

  // Get or create session
  const session = await getSession(from);

  // Process through Max API
  const response = await maxApi.processMessage({
    sessionId: session.id,
    phase: session.currentPhase,
    message: text.body
  });

  // Send response
  if (response.options) {
    await wa.sendInteractiveList(from, response.text, response.options);
  } else {
    await wa.sendText(from, response.text);
  }

  // Update session state
  await updateSession(from, response.newPhase);
}
```

#### 2.5.3 Sending Messages

```typescript
// whatsappClient.ts
export class WhatsAppClient {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  async sendText(to: string, text: string) {
    await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      })
    });
  }

  async sendInteractiveList(to: string, body: string, options: string[]) {
    await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: body },
          action: {
            button: 'Choose option',
            sections: [{
              title: 'Options',
              rows: options.map((opt, i) => ({
                id: `option_${i}`,
                title: opt.substring(0, 24)
              }))
            }]
          }
        }
      })
    });
  }
}
```

### 2.6 Message Templates (Required for Outbound)

Pre-approved templates for proactive messages:

```
Template: session_reminder
Language: en
Category: UTILITY
Body: "Hi {{1}}! You have an unfinished requirements session for *{{2}}*.
       Reply 'resume' to continue where you left off."

Template: spec_ready
Language: en
Category: UTILITY
Body: "Your requirements spec for *{{1}}* is ready!
       Download it here: {{2}}"
```

### 2.7 Limitations & Workarounds

| Limitation | Workaround |
|------------|------------|
| No rich cards like Teams | Use interactive lists, buttons (max 3), and formatted text |
| 24-hour messaging window | Use approved templates for follow-ups |
| Max 3 buttons per message | Use list messages for more options |
| No file uploads from bot | Send download links instead |
| Character limits | Break long responses into multiple messages |

### 2.8 Pricing Considerations

| Conversation Type | Cost (approx.) |
|-------------------|----------------|
| User-initiated (24h window) | $0.005 - $0.08 per conversation |
| Business-initiated (templates) | $0.015 - $0.15 per conversation |

*Costs vary by country. A typical 6-phase session staying within 24h = 1 conversation.*

### 2.9 Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Meta Business Setup | Week 1 | Accounts created, verification submitted |
| Webhook Infrastructure | Week 2 | Server deployed, webhook verified |
| Core Message Flow | Week 3-4 | Basic 6-phase conversation working |
| Interactive Elements | Week 5 | Lists, buttons, quick replies |
| Template Approval | Week 6 | Notification templates approved |
| Testing & Polish | Week 7-8 | Multi-user testing, edge cases |

---

## Part 3: Shared Backend Considerations

### 3.1 API Design

Create a unified Max API that both integrations consume:

```typescript
interface MaxApiRequest {
  sessionId: string;
  platform: 'web' | 'teams' | 'whatsapp';
  userId: string;
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6;
  message: string;
  messageType: 'text' | 'selection' | 'command';
}

interface MaxApiResponse {
  text: string;
  phase: number;
  phaseComplete: boolean;
  options?: string[];
  adaptiveCard?: object;  // Teams-specific
  exportReady?: boolean;
  exportUrl?: string;
}
```

### 3.2 Session State Management

Store sessions in a platform-agnostic way:

```typescript
interface Session {
  id: string;
  platform: 'web' | 'teams' | 'whatsapp';
  platformUserId: string;
  projectName: string;
  currentPhase: number;
  phaseData: {
    discovery: DiscoveryData;
    userIdentification: UserData;
    userStories: StoryData;
    prioritization: PriorityData;
    uxDesign: UXData;
    documentation: DocData;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Platform-Specific Adaptations

| Aspect | Teams | WhatsApp |
|--------|-------|----------|
| Rich UI | Adaptive Cards | Interactive Lists |
| Buttons | Unlimited | Max 3 |
| File sharing | Direct upload | Download links |
| Collaboration | Multi-user in channel | Single user |
| Session persistence | Indefinite | 24h active window |

---

## Part 4: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up Azure resources for Teams bot
- [ ] Set up Meta Business accounts for WhatsApp
- [ ] Design unified Max API extensions
- [ ] Build session state management layer

### Phase 2: Teams MVP (Weeks 5-8)
- [ ] Implement Teams bot with basic conversation
- [ ] Build Adaptive Cards for all 6 phases
- [ ] Add PDF export integration
- [ ] Internal testing

### Phase 3: WhatsApp MVP (Weeks 9-12)
- [ ] Implement webhook server
- [ ] Build message handlers for all phases
- [ ] Submit message templates for approval
- [ ] Internal testing

### Phase 4: Polish & Launch (Weeks 13-16)
- [ ] Cross-platform testing
- [ ] Error handling and edge cases
- [ ] Documentation and help content
- [ ] Teams AppSource submission
- [ ] WhatsApp production launch

---

## Part 5: Success Metrics

| Metric | Target |
|--------|--------|
| Session completion rate | >60% |
| Average session duration | <30 min |
| User satisfaction (NPS) | >40 |
| Platform adoption (Teams) | 30% of users |
| Platform adoption (WhatsApp) | 20% of users |

---

## Appendix: Resources

### Teams
- [Bot Framework Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Teams App Certification](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish)

### WhatsApp
- [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
