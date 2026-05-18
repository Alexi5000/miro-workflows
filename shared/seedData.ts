import type { Board, WorkflowTemplate, Workspace, IntegrationCredential } from "./types.js";

const now = new Date("2026-05-17T12:00:00.000Z").toISOString();

export const seedWorkspaces: Workspace[] = [
  {
    id: "workspace-demo-product",
    name: "Product Architecture Studio",
    slug: "product-architecture-studio",
    provider: "miro",
    mode: "demo",
    status: "connected",
    createdAt: now,
    updatedAt: now,
  },
];

export const seedCredentials: IntegrationCredential[] = [
  {
    id: "credential-demo-miro",
    workspaceId: "workspace-demo-product",
    provider: "miro",
    credentialLabel: "Demo Miro connection metadata",
    scopes: ["board:read", "board:write"],
    expiresAt: null,
    status: "connected",
  },
];

export const seedBoards: Board[] = [
  {
    id: "board-discovery-room",
    workspaceId: "workspace-demo-product",
    providerBoardId: "demo-discovery-room",
    name: "Discovery Room",
    description: "A demo board for product discovery, feature prioritization, and research synthesis.",
    viewLink: "https://miro.com/app/board/demo-discovery-room/",
    status: "active",
    lastSyncedAt: now,
    createdAt: now,
  },
  {
    id: "board-delivery-command",
    workspaceId: "workspace-demo-product",
    providerBoardId: "demo-delivery-command",
    name: "Delivery Command Center",
    description: "A demo board for sprint orchestration, delivery risk review, and stakeholder reporting.",
    viewLink: "https://miro.com/app/board/demo-delivery-command/",
    status: "active",
    lastSyncedAt: now,
    createdAt: now,
  },
];

export const seedTemplates: WorkflowTemplate[] = [
  {
    id: "template-prd-to-board",
    slug: "prd-to-board",
    name: "PRD to Board Blueprint",
    category: "Product Strategy",
    description: "Transforms a product requirements document into frames, sticky notes, success criteria, risks, and owner cards.",
    outcome: "A structured Miro board that product, design, and engineering can use for kickoff alignment.",
    defaultBoardId: "board-discovery-room",
    estimatedMinutes: 12,
    status: "active",
    createdAt: now,
    updatedAt: now,
    steps: [
      { id: "frame-context", name: "Create context frame", type: "frame", description: "Creates the kickoff frame and strategic context area.", config: { color: "#F4F1FF" } },
      { id: "sticky-problems", name: "Map problem statements", type: "sticky_note", description: "Adds problem and opportunity notes grouped by customer segment.", config: { color: "light_yellow", count: 6 } },
      { id: "card-owners", name: "Assign owners", type: "card", description: "Creates ownership cards for product, design, engineering, and data.", config: { count: 4 } },
      { id: "review", name: "Generate review checklist", type: "review", description: "Writes a launch-readiness checklist and records audit metadata.", config: { checklistItems: 8 } },
    ],
  },
  {
    id: "template-sprint-retro",
    slug: "sprint-retro-system",
    name: "Sprint Retro System",
    category: "Agile Operations",
    description: "Builds a facilitation-ready retrospective board with prompts, voting lanes, follow-up actions, and metrics.",
    outcome: "A repeatable retrospective workspace with measurable follow-through.",
    defaultBoardId: "board-delivery-command",
    estimatedMinutes: 8,
    status: "active",
    createdAt: now,
    updatedAt: now,
    steps: [
      { id: "frame-retro", name: "Create retro lanes", type: "frame", description: "Creates went-well, improve, questions, and action frames.", config: { lanes: 4 } },
      { id: "sticky-prompts", name: "Add facilitation prompts", type: "sticky_note", description: "Adds prompts for each lane with clear team instructions.", config: { color: "blue", count: 10 } },
      { id: "connector-themes", name: "Connect recurring themes", type: "connector", description: "Links related notes and decision points.", config: { style: "elbowed" } },
      { id: "sync-actions", name: "Sync action register", type: "sync", description: "Records follow-up action metadata for API consumers.", config: { actionCount: 5 } },
    ],
  },
  {
    id: "template-architecture-review",
    slug: "architecture-review",
    name: "Architecture Review Map",
    category: "Engineering Architecture",
    description: "Creates a technical decision board with system boundaries, risks, alternatives, and implementation checkpoints.",
    outcome: "A board-ready architecture review package that supports asynchronous decision-making.",
    defaultBoardId: "board-delivery-command",
    estimatedMinutes: 15,
    status: "active",
    createdAt: now,
    updatedAt: now,
    steps: [
      { id: "frame-system", name: "Create system boundary", type: "frame", description: "Creates system, actor, and dependency frames.", config: { color: "#EAF7FF" } },
      { id: "shape-components", name: "Place component shapes", type: "card", description: "Places service, database, integration, and UI component cards.", config: { count: 9 } },
      { id: "connector-flows", name: "Connect data flows", type: "connector", description: "Draws directional integration paths and data ownership notes.", config: { count: 8 } },
      { id: "review-risks", name: "Generate risk register", type: "review", description: "Creates architecture risk notes with mitigation owners.", config: { checklistItems: 10 } },
    ],
  },
];
