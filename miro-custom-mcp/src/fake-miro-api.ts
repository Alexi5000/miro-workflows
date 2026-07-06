/**
 * In-process FakeMiroApiClient used when MIRO_ACCESS_TOKEN is not configured.
 * Lets the MCP server expose its full surface to agents during development
 * without hitting Miro.
 *
 * All IDs are deterministic so re-running a workflow yields stable fixtures.
 */
import type {
  BoardMember,
  BoardSummary,
  MiroApiClientLike,
  MiroItem,
  MiroListResponse,
  Subscription,
  UpdateItemInput,
} from "./miro-api.js";
import type {
  CreateCard,
  CreateConnector,
  CreateFrame,
  CreateImage,
  CreateShape,
  CreateStickyNote,
  CreateText,
} from "./miro-api.js";

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export class FakeMiroApiClient implements MiroApiClientLike {
  private boards = new Map<string, BoardSummary>();
  private items = new Map<string, MiroItem[]>();
  private subscriptions = new Map<string, Subscription[]>();

  constructor(seed: { boards?: BoardSummary[] } = {}) {
    if (seed.boards) for (const b of seed.boards) this.boards.set(b.id, b);
  }

  async listBoards(params: { limit?: number; cursor?: string } = {}): Promise<MiroListResponse<BoardSummary>> {
    const all = Array.from(this.boards.values());
    return { data: all.slice(0, params.limit ?? 50), cursor: "" };
  }
  async createBoard(params: { name: string; description?: string }): Promise<BoardSummary> {
    const board: BoardSummary = { id: id("board"), name: params.name, description: params.description, createdAt: new Date().toISOString() };
    this.boards.set(board.id, board);
    return board;
  }
  async getBoard(boardId: string): Promise<BoardSummary> {
    const b = this.boards.get(boardId);
    if (!b) throw new Error(`Mock: board ${boardId} not found`);
    return b;
  }
  async updateBoard(boardId: string, params: { name?: string; description?: string }): Promise<BoardSummary> {
    const b = await this.getBoard(boardId);
    const next = { ...b, ...params };
    this.boards.set(boardId, next);
    return next;
  }
  async deleteBoard(boardId: string): Promise<void> {
    this.boards.delete(boardId);
    this.items.delete(boardId);
  }
  async listBoardMembers(_boardId: string): Promise<MiroListResponse<BoardMember>> {
    return { data: [{ id: "u-demo", name: "Demo User", email: "demo@example.com", role: "owner" }], cursor: "" };
  }
  async listSubscriptions(boardId: string): Promise<MiroListResponse<Subscription>> {
    return { data: this.subscriptions.get(boardId) ?? [], cursor: "" };
  }

  private appendItem(boardId: string, item: MiroItem): MiroItem {
    const list = this.items.get(boardId) ?? [];
    list.push(item);
    this.items.set(boardId, list);
    return item;
  }
  private mkItem(boardId: string, type: MiroItem["type"], data: Record<string, unknown>): MiroItem {
    return {
      id: id("item"),
      type,
      data,
      position: { x: 0, y: 0, origin: "center" },
      geometry: {},
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    } as unknown as MiroItem;
  }

  async create_sticky_note(boardId: string, p: CreateStickyNote): Promise<MiroItem> {
    return this.appendItem(boardId, this.mkItem(boardId, "sticky_note", { content: p.content, color: p.color ?? "#fff9b1" }));
  }
  async create_shape(boardId: string, p: CreateShape): Promise<MiroItem> {
    return this.appendItem(boardId, this.mkItem(boardId, "shape", { shape: p.shape, content: p.content ?? "" }));
  }
  async create_text(boardId: string, p: CreateText): Promise<MiroItem> {
    return this.appendItem(boardId, this.mkItem(boardId, "text", { content: p.content }));
  }
  async create_card(boardId: string, p: CreateCard): Promise<MiroItem> {
    return this.appendItem(boardId, this.mkItem(boardId, "card", { title: p.title ?? "", description: p.description ?? "" }));
  }
  async create_frame(boardId: string, p: CreateFrame): Promise<MiroItem> {
    return this.appendItem(boardId, this.mkItem(boardId, "frame", { title: p.title }));
  }
  async create_connector(boardId: string, p: CreateConnector): Promise<MiroItem> {
    return this.appendItem(boardId, this.mkItem(boardId, "connector", { startItem: { id: p.start_item_id }, endItem: { id: p.end_item_id } }));
  }
  async create_image(boardId: string, p: CreateImage): Promise<MiroItem> {
    return this.appendItem(boardId, this.mkItem(boardId, "image", { title: p.title ?? "" }));
  }

  async get_board_items(boardId: string, params: { type?: string; limit?: number } = {}): Promise<MiroListResponse<MiroItem>> {
    const all = this.items.get(boardId) ?? [];
    const filtered = params.type ? all.filter((i) => i.type === params.type) : all;
    return { data: filtered.slice(0, params.limit ?? 50), cursor: "" };
  }

  async update_item(boardId: string, itemId: string, params: UpdateItemInput): Promise<MiroItem> {
    const list = this.items.get(boardId) ?? [];
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error(`Mock: item ${itemId} not found`);
    list[idx] = { ...list[idx], ...(params as Record<string, unknown>) } as MiroItem;
    this.items.set(boardId, list);
    return list[idx];
  }
  async delete_item(boardId: string, itemId: string): Promise<void> {
    const list = this.items.get(boardId) ?? [];
    this.items.set(boardId, list.filter((i) => i.id !== itemId));
  }
}
