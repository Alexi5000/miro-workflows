/**
 * Miro REST v2 client + minimal interface used by both the live implementation
 * and the in-process `FakeMiroApiClient` for demo mode.
 *
 * Hardening:
 *  - 401 → `MiroAuthError` (caller must re-auth).
 *  - 429 → exponential backoff with jitter, max 4 attempts, respects `Retry-After`.
 *  - 5xx → one retry, then bubble.
 *  - 30s default `AbortController` timeout per call.
 *  - Errors surface a single non-nested message.
 */
import type {
  MiroConnectorData,
  MiroFrameData,
  MiroGeometry,
  MiroItem,
  MiroListResponse,
  MiroPosition,
  MiroStickyNoteData,
  MiroStyle,
  MiroTextData,
  MiroCardData,
  MiroShapeData,
} from "./types.js";

// Re-export so consumers (FakeMiroApiClient, tools) can import the canonical
// Miro envelope types from the same module as the client.
export type { MiroItem, MiroListResponse };

export const MIRO_API_BASE = "https://api.miro.com/v2";

export class MiroAuthError extends Error {
  constructor(message = "Miro authentication failed") {
    super(message);
    this.name = "MiroAuthError";
  }
}

export class MiroRateLimitError extends Error {
  constructor(public readonly retryAfterMs: number, message: string) {
    super(message);
    this.name = "MiroRateLimitError";
  }
}

export interface MiroApiClientOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface CreateStickyNote {
  content: string;
  color?: string;
  x: number;
  y: number;
  width?: number;
}
export interface CreateShape {
  shape: string;
  content?: string;
  fill_color?: string;
  border_color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface CreateText {
  content: string;
  x: number;
  y: number;
  width?: number;
  font_size?: string;
  text_color?: string;
  text_align?: "left" | "center" | "right";
}
export interface CreateCard {
  title?: string;
  description?: string;
  x: number;
  y: number;
  width?: number;
  color?: string;
}
export interface CreateFrame {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill_color?: string;
}
export interface CreateConnector {
  start_item_id: string;
  end_item_id: string;
  shape?: "straight" | "curved" | "elbowed";
  stroke_color?: string;
  caption?: string;
}
export interface CreateImage {
  title?: string;
  data?: string;
  url?: string;
  x: number;
  y: number;
  width: number;
  height?: number;
}
export type UpdateItemInput = {
  position?: { x?: number; y?: number; origin?: MiroPosition["origin"] };
  geometry?: { width?: number; height?: number };
  style?: Record<string, unknown>;
  data?: Record<string, unknown>;
};
export interface BoardSummary {
  id: string;
  name: string;
  description?: string;
  viewLink?: string;
  createdAt?: string;
  owner?: { id: string; name?: string };
}
export interface BoardMember { id: string; name?: string; email?: string; role?: string; }
export interface Subscription { id: string; url?: string; status?: string; }

export interface MiroApiClientLike {
  listBoards(params?: { limit?: number; cursor?: string }): Promise<MiroListResponse<BoardSummary>>;
  createBoard(params: { name: string; description?: string; policy?: { sharingPolicy?: { access?: string; teamAccess?: string } } }): Promise<BoardSummary>;
  getBoard(boardId: string): Promise<BoardSummary>;
  updateBoard(boardId: string, params: { name?: string; description?: string }): Promise<BoardSummary>;
  deleteBoard(boardId: string): Promise<void>;
  listBoardMembers(boardId: string): Promise<MiroListResponse<BoardMember>>;
  listSubscriptions(boardId: string): Promise<MiroListResponse<Subscription>>;

  create_sticky_note(boardId: string, params: CreateStickyNote): Promise<MiroItem>;
  create_shape(boardId: string, params: CreateShape): Promise<MiroItem>;
  create_text(boardId: string, params: CreateText): Promise<MiroItem>;
  create_card(boardId: string, params: CreateCard): Promise<MiroItem>;
  create_frame(boardId: string, params: CreateFrame): Promise<MiroItem>;
  create_connector(boardId: string, params: CreateConnector): Promise<MiroItem>;
  create_image(boardId: string, params: CreateImage): Promise<MiroItem>;
  get_board_items(boardId: string, params?: { type?: string; limit?: number }): Promise<MiroListResponse<MiroItem>>;
  update_item(boardId: string, itemId: string, params: UpdateItemInput): Promise<MiroItem>;
  delete_item(boardId: string, itemId: string): Promise<void>;
}

/** Sleep helper (exported for tests). */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MiroApiClient implements MiroApiClientLike {
  private readonly access_token: string;
  private readonly opts: Required<MiroApiClientOptions>;

  constructor(access_token: string, options: MiroApiClientOptions = {}) {
    if (!access_token || access_token === "your_token_here" || access_token.trim() === "") {
      throw new Error(
        "MIRO_ACCESS_TOKEN is not set. Export MIRO_ACCESS_TOKEN before starting the custom MCP server.",
      );
    }
    this.access_token = access_token;
    this.opts = {
      maxRetries: options.maxRetries ?? 4,
      baseDelayMs: options.baseDelayMs ?? 250,
      maxDelayMs: options.maxDelayMs ?? 4_000,
      timeoutMs: options.timeoutMs ?? 30_000,
      fetchImpl: options.fetchImpl ?? fetch,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, expectJson = true): Promise<T> {
    const url = `${MIRO_API_BASE}${endpoint}`;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs);
      try {
        const response = await this.opts.fetchImpl(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.access_token}`,
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.status === 401) {
          throw new MiroAuthError(`Miro API unauthorized (401)`);
        }
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("retry-after");
          const retryAfterMs = retryAfterHeader ? Math.max(0, Number(retryAfterHeader) * 1000) : 0;
          const backoff = Math.min(this.opts.maxDelayMs, this.opts.baseDelayMs * 2 ** attempt) + Math.floor(Math.random() * 100);
          if (attempt < this.opts.maxRetries) {
            await delay(Math.max(retryAfterMs, backoff));
            continue;
          }
          throw new MiroRateLimitError(retryAfterMs || backoff, `Miro API rate-limited (429) — exhausted retries`);
        }
        if (response.status >= 500 && response.status <= 599) {
          if (attempt < Math.min(this.opts.maxRetries, 1)) {
            await delay(Math.min(this.opts.maxDelayMs, this.opts.baseDelayMs * 2 ** attempt));
            continue;
          }
          throw new Error(`Miro API error (${response.status}): upstream returned ${response.status}`);
        }
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Miro API error (${response.status}): ${text}`);
        }
        if (!expectJson || response.status === 204) {
          return undefined as T;
        }
        return (await response.json()) as T;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err;
        if (err instanceof MiroAuthError) throw err;
        if (err instanceof MiroRateLimitError) throw err;
        // For typed upstream errors thrown above, surface immediately.
        if (err instanceof Error && /Miro API error/.test(err.message)) throw err;
        if (attempt < this.opts.maxRetries && err instanceof Error && err.name === "AbortError") {
          await delay(this.opts.baseDelayMs * 2 ** attempt);
          continue;
        }
        if (attempt >= this.opts.maxRetries) {
          throw err instanceof Error ? err : new Error(String(err));
        }
        await delay(this.opts.baseDelayMs * 2 ** attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Miro request failed");
  }

  // ---------- Boards ----------

  async listBoards(params: { limit?: number; cursor?: string } = {}): Promise<MiroListResponse<BoardSummary>> {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", String(params.limit));
    if (params.cursor) q.set("cursor", params.cursor);
    const query = q.toString();
    return this.request<MiroListResponse<BoardSummary>>(`/boards${query ? `?${query}` : ""}`);
  }

  async createBoard(params: { name: string; description?: string; policy?: Record<string, unknown> }): Promise<BoardSummary> {
    return this.request<BoardSummary>("/boards", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getBoard(boardId: string): Promise<BoardSummary> {
    return this.request<BoardSummary>(`/boards/${encodeURIComponent(boardId)}`);
  }

  async updateBoard(boardId: string, params: { name?: string; description?: string }): Promise<BoardSummary> {
    return this.request<BoardSummary>(`/boards/${encodeURIComponent(boardId)}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    });
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.request<void>(`/boards/${encodeURIComponent(boardId)}`, { method: "DELETE" });
  }

  async listBoardMembers(boardId: string): Promise<MiroListResponse<BoardMember>> {
    return this.request<MiroListResponse<BoardMember>>(`/boards/${encodeURIComponent(boardId)}/members`);
  }

  async listSubscriptions(boardId: string): Promise<MiroListResponse<Subscription>> {
    return this.request<MiroListResponse<Subscription>>(`/boards/${encodeURIComponent(boardId)}/subscriptions`);
  }

  // ---------- Item creation ----------

  async create_sticky_note(boardId: string, params: CreateStickyNote): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/sticky_notes`, {
      method: "POST",
      body: JSON.stringify({
        data: { content: params.content, shape: "square" },
        style: { fillColor: params.color || "#fff9b1" },
        position: { x: params.x, y: params.y, origin: "center" },
        geometry: { width: params.width || 200 },
      }),
    });
  }

  async create_shape(boardId: string, params: CreateShape): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/shapes`, {
      method: "POST",
      body: JSON.stringify({
        data: { content: params.content ?? "", shape: params.shape },
        style: {
          fillColor: params.fill_color ?? "#ffffff",
          borderColor: params.border_color ?? "#1a1a1a",
          borderWidth: "2.0",
        },
        position: { x: params.x, y: params.y, origin: "center" },
        geometry: { width: params.width, height: params.height },
      }),
    });
  }

  async create_text(boardId: string, params: CreateText): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/texts`, {
      method: "POST",
      body: JSON.stringify({
        data: { content: params.content },
        style: {
          fontSize: params.font_size ?? "14",
          color: params.text_color ?? "#1a1a1a",
          textAlign: params.text_align ?? "center",
        },
        position: { x: params.x, y: params.y, origin: "center" },
        geometry: { width: params.width ?? 200 },
      }),
    });
  }

  async create_card(boardId: string, params: CreateCard): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/cards`, {
      method: "POST",
      body: JSON.stringify({
        data: { title: params.title ?? "", description: params.description ?? "" },
        style: { cardTheme: params.color ?? "#fff9b1" },
        position: { x: params.x, y: params.y, origin: "center" },
        geometry: { width: params.width ?? 320 },
      }),
    });
  }

  async create_frame(boardId: string, params: CreateFrame): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/frames`, {
      method: "POST",
      body: JSON.stringify({
        data: { title: params.title, type: "freeform", format: "custom" },
        style: { fillColor: params.fill_color ?? "#ffffff" },
        position: { x: params.x, y: params.y, origin: "center" },
        geometry: { width: params.width, height: params.height },
      }),
    });
  }

  async create_connector(boardId: string, params: CreateConnector): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/connectors`, {
      method: "POST",
      body: JSON.stringify({
        startItem: { id: params.start_item_id },
        endItem: { id: params.end_item_id },
        shape: params.shape ?? "elbowed",
        style: { strokeColor: params.stroke_color ?? "#1a1a1a", strokeWidth: "2.0" },
        captions: params.caption ? [{ content: params.caption }] : [],
      }),
    });
  }

  async create_image(boardId: string, params: CreateImage): Promise<MiroItem> {
    const data: Record<string, unknown> = { title: params.title };
    if (params.data) data.image = params.data; // base64 payload
    if (params.url) data.url = params.url;
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/images`, {
      method: "POST",
      body: JSON.stringify({
        data,
        position: { x: params.x, y: params.y, origin: "center" },
        geometry: { width: params.width, height: params.height },
      }),
    });
  }

  // ---------- Item reads / updates / deletes ----------

  async get_board_items(boardId: string, params: { type?: string; limit?: number } = {}): Promise<MiroListResponse<MiroItem>> {
    const q = new URLSearchParams();
    if (params.type) q.set("type", params.type);
    if (params.limit) q.set("limit", String(params.limit));
    const query = q.toString();
    return this.request<MiroListResponse<MiroItem>>(
      `/boards/${encodeURIComponent(boardId)}/items${query ? `?${query}` : ""}`,
    );
  }

  async update_item(boardId: string, itemId: string, params: UpdateItemInput): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${encodeURIComponent(boardId)}/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    });
  }

  async delete_item(boardId: string, itemId: string): Promise<void> {
    await this.request(`/boards/${encodeURIComponent(boardId)}/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    });
  }
}

// Touch imported Miro data types so tsc does not strip them.
type _MiroUsed = MiroStickyNoteData | MiroShapeData | MiroTextData | MiroCardData | MiroFrameData | MiroConnectorData;
const _usedMarker: _MiroUsed | undefined = undefined;
void _usedMarker;
