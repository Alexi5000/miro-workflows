# Workflow Documentation Template

This document tracks visual workflows and board structures created for the project.

## Active Workflows

### Sprint Planning

**Board URL**: [Add Miro board link here]

**Purpose**: Track sprint tasks, user stories, and progress

**Structure**:
- Backlog
- Sprint Planning
- In Progress
- Code Review
- Testing
- Done

**Team Members**: Builder 1, Builder 2

**Last Updated**: [Date]

---

### System Architecture

**Board URL**: [Add Miro board link here]

**Purpose**: Visual representation of system architecture and component relationships

**Components**:
- List key components here
- Document relationships
- Note dependencies

**Last Updated**: [Date]

---

## Completed Workflows

### [Workflow Name]

**Board URL**: [Add Miro board link here]

**Purpose**: [Description]

**Outcome**: [What was achieved]

**Completion Date**: [Date]

---

## Workflow Templates

Use these templates to document new workflows:

### Template: Feature Development

```markdown
### [Feature Name]

**Board URL**: [Miro board link]

**Purpose**: [What this workflow accomplishes]

**Stakeholders**: [Who's involved]

**Stages**:
1. Requirements gathering
2. Design
3. Implementation
4. Testing
5. Deployment

**Current Stage**: [Stage number and name]

**Blockers**: [Any impediments]

**Next Steps**: [What needs to happen next]

**Last Updated**: [Date]
```

### Template: Architecture Design

```markdown
### [System/Feature Name] Architecture

**Board URL**: [Miro board link]

**Purpose**: [System overview]

**Components**:
- **Component 1**: [Description and responsibility]
- **Component 2**: [Description and responsibility]
- **Component 3**: [Description and responsibility]

**Data Flow**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Technology Stack**:
- Frontend: [Technologies]
- Backend: [Technologies]
- Database: [Technologies]
- Infrastructure: [Technologies]

**Integration Points**: [External systems, APIs, services]

**Last Updated**: [Date]
```

### Template: User Journey

```markdown
### [User Journey Name]

**Board URL**: [Miro board link]

**User Persona**: [Target user description]

**Goal**: [What the user wants to accomplish]

**Journey Steps**:
1. **[Step Name]**: [What happens]
   - Touchpoints: [Where interaction occurs]
   - Pain points: [User frustrations]
   - Opportunities: [Improvements]

2. **[Step Name]**: [What happens]
   - Touchpoints: [Where interaction occurs]
   - Pain points: [User frustrations]
   - Opportunities: [Improvements]

**Insights**: [Key learnings]

**Action Items**: [What to build/improve]

**Last Updated**: [Date]
```

## Board Organization Best Practices

### Naming Conventions

- **Architecture boards**: `[Project] - Architecture - [Date]`
- **Sprint boards**: `Sprint [Number] - [Start Date]`
- **Planning boards**: `[Quarter] Planning - [Year]`
- **Retrospective**: `Retro - Sprint [Number] - [Date]`

### Tagging Strategy

Use consistent tags across boards:
- `#architecture` - System design boards
- `#sprint` - Sprint planning and tracking
- `#planning` - Project planning and roadmaps
- `#retro` - Retrospectives
- `#design` - UI/UX design work
- `#documentation` - Technical documentation

### Access Control

- **Team boards**: Shared with all team members (edit access)
- **Draft boards**: Private until ready for review
- **Archive boards**: View-only after completion

## Collaboration Guidelines

### When Creating New Boards

1. Use descriptive names following conventions above
2. Add appropriate tags
3. Share with team members
4. Document in this file
5. Commit documentation to Git

### When Updating Boards

1. Update the "Last Updated" field in this document
2. Add a note in team chat if major changes
3. Tag relevant team members for review

### When Archiving Boards

1. Move to "Completed Workflows" section
2. Add completion date and outcome
3. Keep board accessible for reference
4. Update any dependent documentation

## Integration with Development

### Linking Boards to Code

When a Miro board influences code:

```markdown
// file: src/services/user_service.ts
// description: User authentication and profile management
// reference: Miro Architecture Board - https://miro.com/app/board/...
```

### Linking Code to Boards

When code is generated from a board, add a note on the board:

```
Generated Code:
- Repository: github.com/username/repo
- Path: src/services/
- Commit: abc123
```

## Metrics and Review

Track workflow effectiveness:

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Boards created per sprint | 3-5 | - | Architecture, planning, retro |
| Board update frequency | Weekly | - | Keep boards current |
| Team engagement | 100% | - | Both builders contributing |

## Resources

- [Miro Best Practices](https://miro.com/guides/)
- [Visual Collaboration Guide](https://miro.com/visual-collaboration/)
- [docs/PROMPTS.md](./PROMPTS.md) - Effective prompts for board creation
