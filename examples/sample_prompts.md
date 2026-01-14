# Sample Miro Board Creation Prompts

This file contains ready-to-use prompts for creating Miro boards with AI assistance. Copy and paste these into Cursor to get started quickly.

## Quick Start Examples

### Example 1: Simple Architecture Diagram

```
Create a new Miro board called "Microservices Architecture" and add a system architecture diagram showing:
- API Gateway (NGINX)
- User Service (Node.js)
- Product Service (Python FastAPI)
- Order Service (Go)
- PostgreSQL database
- Redis cache
- RabbitMQ message queue

Show the connections and data flow between components.
```

### Example 2: Sprint Planning Board

```
Create a sprint planning board for "Sprint 23 - January 2026" with these columns:
- Backlog
- Ready for Dev
- In Progress
- Code Review
- Testing
- Done

Add 5 sample user stories for a todo application with story points.
```

### Example 3: User Flow Diagram

```
Generate a user authentication flow diagram on a new board showing:
1. User enters credentials
2. Frontend validates input
3. API authenticates with database
4. JWT token generated
5. Token stored in browser
6. User redirected to dashboard

Include error handling paths for invalid credentials.
```

## Real-World Scenarios

### Scenario: E-Commerce Platform

```
Create a comprehensive e-commerce platform architecture on Miro:

Frontend Layer:
- React web app
- React Native mobile app

API Layer:
- GraphQL API Gateway
- REST API for legacy integrations

Services:
- Authentication Service (Auth0)
- Product Catalog Service
- Shopping Cart Service
- Order Management Service
- Payment Processing Service (Stripe integration)
- Inventory Service
- Notification Service (email/SMS)

Data Layer:
- PostgreSQL (products, orders, users)
- MongoDB (product reviews, ratings)
- Redis (session cache, cart cache)
- Elasticsearch (product search)

Infrastructure:
- AWS ECS for container orchestration
- S3 for product images
- CloudFront CDN
- RDS for managed databases

Show data flow for: user browsing products, adding to cart, and completing purchase.
```

### Scenario: CI/CD Pipeline

```
Design a complete CI/CD pipeline diagram on Miro for a Node.js application:

1. Developer pushes to GitHub
2. GitHub Actions triggers
3. Run linting (ESLint)
4. Run unit tests (Jest)
5. Run integration tests
6. Build Docker image
7. Push to Docker Hub
8. Deploy to staging (AWS ECS)
9. Run E2E tests (Playwright)
10. Manual approval gate
11. Deploy to production (AWS ECS)
12. Health checks
13. Rollback capability

Include parallel steps where applicable and show success/failure paths.
```

### Scenario: Database Schema

```
Create an entity-relationship diagram for a social media platform:

Entities:
- Users (id, username, email, password_hash, created_at, bio, avatar_url)
- Posts (id, user_id, content, created_at, updated_at, likes_count)
- Comments (id, post_id, user_id, content, created_at)
- Likes (id, user_id, post_id, created_at)
- Follows (id, follower_id, following_id, created_at)
- Messages (id, sender_id, recipient_id, content, created_at, read_at)

Show all relationships with cardinality (one-to-many, many-to-many).
Add indexes on foreign keys.
```

## From Code to Diagram

### Example: Analyze Repository

```
Analyze this GitHub repository: https://github.com/fastapi/fastapi

Create a Miro board showing:
1. Main components and modules
2. Class relationships
3. Data flow through the framework
4. Key design patterns used
```

### Example: Class Diagram from Code

```
Create a UML class diagram on Miro based on this TypeScript code:

[Paste your code here - e.g., a set of related classes]

Show:
- Class properties and methods
- Inheritance relationships
- Interface implementations
- Composition relationships
```

## From Diagram to Code

### Example: API from Diagram

```
Based on the API design diagram on this Miro board: [paste-board-url]

Generate:
1. FastAPI application structure
2. Route handlers for all endpoints
3. Pydantic models for request/response
4. Database models using SQLAlchemy
5. Basic error handling
6. OpenAPI documentation

Use Python type hints and follow FastAPI best practices.
```

### Example: React App from Wireframes

```
Looking at the wireframes on this Miro board: [paste-board-url]

Generate a React application with:
- TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Component structure matching the wireframes
- Responsive design for mobile and desktop
- Basic state management with React hooks

Create components for each screen shown in the wireframes.
```

## Collaboration Examples

### Example: Team Retrospective

```
Create a sprint retrospective board with:

Section 1: What went well 🎉
- Add 3 placeholder cards

Section 2: What could be improved 🤔
- Add 3 placeholder cards

Section 3: Action items 🎯
- Add 3 placeholder cards with assignees and due dates

Section 4: Shoutouts 👏
- Add space for team recognition

Use different colors for each section.
```

### Example: Product Roadmap

```
Generate a product roadmap for 2026 Q1-Q4:

Q1 (Jan-Mar):
- User authentication and profiles
- Basic dashboard
- MVP launch

Q2 (Apr-Jun):
- Social features (follow, like, comment)
- Mobile app beta
- Performance optimization

Q3 (Jul-Sep):
- Advanced analytics
- API for third-party integrations
- Premium features

Q4 (Oct-Dec):
- AI-powered recommendations
- International expansion
- Year-end review

Show dependencies between features and milestones.
```

## Integration Diagrams

### Example: Third-Party Integrations

```
Create an integration diagram showing our application's connections to:

Authentication:
- Auth0 (OAuth 2.0)
- Google Sign-In
- GitHub OAuth

Payments:
- Stripe (primary)
- PayPal (alternative)

Communications:
- SendGrid (transactional email)
- Twilio (SMS notifications)
- Slack (team notifications)

Storage:
- AWS S3 (file storage)
- Cloudinary (image processing)

Analytics:
- Google Analytics
- Mixpanel
- Sentry (error tracking)

Show authentication methods, data flow, and error handling for each integration.
```

## Advanced Workflows

### Example: Event-Driven Architecture

```
Design an event-driven architecture diagram on Miro:

Event Sources:
- User actions (web/mobile app)
- Scheduled jobs (cron)
- Webhooks (external systems)

Event Bus:
- Apache Kafka topics

Event Consumers:
- Email service (subscribes to: user.registered, order.completed)
- Analytics service (subscribes to: all events)
- Notification service (subscribes to: user.mentioned, post.liked)
- Archive service (subscribes to: all events)

Storage:
- Event store (all events)
- Read models (materialized views)

Show event flow, topic partitions, and consumer groups.
```

### Example: Security Architecture

```
Create a security architecture diagram for our web application:

Layers:
1. Edge Security
   - CloudFlare DDoS protection
   - WAF rules
   - Rate limiting

2. Network Security
   - VPC with public/private subnets
   - Security groups
   - Network ACLs

3. Application Security
   - OAuth 2.0 + JWT
   - HTTPS only
   - CORS configuration
   - Input validation
   - SQL injection prevention

4. Data Security
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.3)
   - Database access controls
   - Secrets management (AWS Secrets Manager)

5. Monitoring & Response
   - Security logs (CloudWatch)
   - Intrusion detection
   - Alert system
   - Incident response workflow

Show data flow through security layers.
```

## Tips for Using These Prompts

1. **Replace Placeholders**: Update `[paste-board-url]` with actual Miro board URLs
2. **Customize Details**: Modify technology stack to match your project
3. **Add Context**: Include specific requirements unique to your use case
4. **Iterate**: Start with basic prompt, then refine with follow-up requests
5. **Be Specific**: More details = better results

## Combining Prompts

You can chain multiple actions:

```
Step 1: Create a new board called "Payment System Design"

Step 2: Add a system architecture diagram showing Stripe integration

Step 3: Generate FastAPI code for the payment endpoints shown in the diagram

Step 4: Create a sequence diagram showing the payment flow from user click to confirmation
```

## Next Steps

- See [docs/PROMPTS.md](../docs/PROMPTS.md) for more prompt patterns
- Check [docs/WORKFLOWS.md](../docs/WORKFLOWS.md) to document your boards
- Visit [Miro MCP Documentation](https://developers.miro.com/docs/miro-mcp) for latest features
