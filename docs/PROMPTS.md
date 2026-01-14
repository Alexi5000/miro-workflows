# Effective Miro MCP Prompts

This document contains curated prompts for working with Miro boards through the MCP server. These prompts leverage the official Miro MCP capabilities.

## Board Management

### List Boards

```
List all my Miro boards
```

```
Show me boards from the last 7 days
```

### Create New Board

```
Create a new Miro board called "Project Planning Q1 2026"
```

```
Create a board for our sprint retrospective and add a basic retro template
```

## Diagram Generation

### Architecture Diagrams

```
Create a system architecture diagram on a new Miro board showing:
- API Gateway
- Three microservices (Auth, Orders, Inventory)
- PostgreSQL database
- Redis cache
- Message queue (RabbitMQ)
```

```
Generate a cloud architecture diagram for a serverless application using AWS Lambda, API Gateway, DynamoDB, and S3
```

### Workflow Diagrams

```
Create a user authentication flow diagram on my Miro board showing the OAuth 2.0 process
```

```
Generate a CI/CD pipeline diagram including GitHub Actions, Docker, testing stages, and deployment to production
```

### Data Flow Diagrams

```
Create a data flow diagram showing how user data moves through our application from frontend to database
```

## Code to Diagram

### From Repository

```
Analyze the code in this repository and create a class diagram on Miro showing the relationships between components
```

```
Generate a system architecture diagram based on the microservices in our GitHub repository [repository-url]
```

### From Code Snippets

```
Create a sequence diagram on Miro based on this authentication code:
[paste code here]
```

## Diagram to Code

### Generate Code from Boards

```
Generate a Node.js Express application based on the API design on this Miro board: [board-url]
```

```
Create Python FastAPI endpoints based on the API specification diagram on my Miro board
```

```
Generate TypeScript interfaces and types based on the data model diagram at [board-url]
```

### From PRD or Wireframes

```
Build a React component based on the wireframe on this Miro board: [board-url]
```

```
Generate a complete REST API from the PRD and system design on my Miro board
```

## Project Planning

### Sprint Planning

```
Create a sprint planning board with:
- Backlog column
- To Do column
- In Progress column
- Review column
- Done column
Add sample user stories for a todo app
```

### Roadmap Creation

```
Generate a product roadmap for Q1-Q4 2026 on a new Miro board including:
- Feature releases
- Milestones
- Dependencies
```

## Team Collaboration

### Retrospective Boards

```
Create a sprint retrospective board with sections for:
- What went well
- What could be improved
- Action items
```

### Brainstorming

```
Set up a brainstorming board for new feature ideas with voting dots and categorization
```

## Database Design

### ER Diagrams

```
Create an entity-relationship diagram for an e-commerce database with:
- Users
- Products
- Orders
- Payments
- Reviews
```

```
Generate a database schema diagram from this SQL:
[paste SQL schema here]
```

## Advanced Prompts

### Multi-Step Workflows

```
Create a comprehensive onboarding workflow on Miro that includes:
1. User registration flow
2. Email verification process
3. Profile setup steps
4. First-time user tutorial
Make it visual with swim lanes for different actors
```

### Integration Diagrams

```
Design an integration diagram showing how our application connects to:
- Stripe for payments
- SendGrid for emails
- AWS S3 for storage
- Auth0 for authentication
Include data flow and authentication methods
```

### Conversion Workflows

```
Take the PRD and wireframes from this Miro board [board-url] and:
1. Generate the database schema
2. Create the API endpoints
3. Build the React components
4. Provide a deployment guide
```

## Tips for Effective Prompts

1. **Be Specific**: Include exact details about what you want
   - ❌ "Create a diagram"
   - ✅ "Create a system architecture diagram with 3 microservices, a load balancer, and a database"

2. **Provide Context**: Reference board URLs when working with existing boards
   - Use full Miro board URLs
   - Specify which elements to focus on

3. **Use Technical Terms**: MCP understands technical terminology
   - Microservices, APIs, databases, workflows, etc.
   - Architecture patterns (MVC, MVVM, microservices, etc.)

4. **Iterate**: Start broad, then refine
   - First: "Create an architecture diagram"
   - Then: "Add authentication flow to the diagram"
   - Finally: "Show how the cache layer integrates"

5. **Combine Actions**: Chain multiple operations
   - "Create a board, add a diagram, and generate code from it"

## Common Patterns

### Pattern: Repository Analysis

```
Analyze [github-url], create an architecture diagram on Miro, 
and generate documentation for each component
```

### Pattern: Design to Implementation

```
Based on the wireframes at [board-url], generate:
1. React components
2. TypeScript types
3. API endpoints
4. Database schema
```

### Pattern: Documentation

```
Create a technical documentation board for our API with:
- Endpoint reference
- Authentication flow
- Error codes
- Example requests/responses
```

## Resources

- [Official Miro MCP Documentation](https://developers.miro.com/docs/miro-mcp)
- [MCP Tools & Prompts Reference](https://developers.miro.com/docs/miro-mcp-prompts)
- [Miro Developer Community](https://community.miro.com/developer-platform-and-apis-57)
