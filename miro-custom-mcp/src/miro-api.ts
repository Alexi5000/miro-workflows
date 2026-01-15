// file: miro-custom-mcp/src/miro-api.ts
// description: Miro REST API v2 client wrapper with full board control
// reference: https://developers.miro.com/reference/api-reference

import type {
  MiroItem,
  MiroPosition,
  MiroGeometry,
  MiroStyle,
  MiroStickyNoteData,
  MiroShapeData,
  MiroTextData,
  MiroCardData,
  MiroFrameData,
  MiroConnectorData,
  MiroListResponse,
} from "./types.ts";

const MIRO_API_BASE = "https://api.miro.com/v2";

export class MiroApiClient {
  private access_token: string;

  constructor(access_token: string) {
    if (!access_token || access_token === "your_token_here" || access_token.trim() === "") {
      throw new Error(
        "MIRO_ACCESS_TOKEN is not set. Run: bun run ../scripts/get_miro_token.ts"
      );
    }
    this.access_token = access_token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${MIRO_API_BASE}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const error_text = await response.text();
        throw new Error(
          `Miro API error (${response.status}): ${error_text}`
        );
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Miro API request failed: ${error}`);
    }
  }

  // Create Sticky Note
  async create_sticky_note(
    board_id: string,
    params: {
      content: string;
      color?: string;
      x: number;
      y: number;
      width?: number;
    }
  ): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${board_id}/sticky_notes`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          content: params.content,
          shape: "square",
        },
        style: {
          fillColor: params.color || "#fff9b1", // default yellow
        },
        position: {
          x: params.x,
          y: params.y,
          origin: "center",
        },
        geometry: {
          width: params.width || 200,
        },
      }),
    });
  }

  // Create Shape
  async create_shape(
    board_id: string,
    params: {
      shape: string;
      content?: string;
      fill_color?: string;
      border_color?: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${board_id}/shapes`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          content: params.content || "",
          shape: params.shape,
        },
        style: {
          fillColor: params.fill_color || "#ffffff",
          borderColor: params.border_color || "#1a1a1a",
          borderWidth: "2.0",
        },
        position: {
          x: params.x,
          y: params.y,
          origin: "center",
        },
        geometry: {
          width: params.width,
          height: params.height,
        },
      }),
    });
  }

  // Create Text
  async create_text(
    board_id: string,
    params: {
      content: string;
      x: number;
      y: number;
      width?: number;
      font_size?: string;
      text_color?: string;
      text_align?: "left" | "center" | "right";
    }
  ): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${board_id}/texts`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          content: params.content,
        },
        style: {
          fontSize: params.font_size || "14",
          color: params.text_color || "#1a1a1a",
          textAlign: params.text_align || "center",
        },
        position: {
          x: params.x,
          y: params.y,
          origin: "center",
        },
        geometry: {
          width: params.width || 200,
        },
      }),
    });
  }

  // Create Card
  async create_card(
    board_id: string,
    params: {
      title?: string;
      description?: string;
      x: number;
      y: number;
      width?: number;
      color?: string;
    }
  ): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${board_id}/cards`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          title: params.title || "",
          description: params.description || "",
        },
        style: {
          cardTheme: params.color || "#fff9b1",
        },
        position: {
          x: params.x,
          y: params.y,
          origin: "center",
        },
        geometry: {
          width: params.width || 320,
        },
      }),
    });
  }

  // Create Frame
  async create_frame(
    board_id: string,
    params: {
      title: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fill_color?: string;
    }
  ): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${board_id}/frames`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          title: params.title,
          type: "freeform",
          format: "custom",
        },
        style: {
          fillColor: params.fill_color || "#ffffff",
        },
        position: {
          x: params.x,
          y: params.y,
          origin: "center",
        },
        geometry: {
          width: params.width,
          height: params.height,
        },
      }),
    });
  }

  // Create Connector
  async create_connector(
    board_id: string,
    params: {
      start_item_id: string;
      end_item_id: string;
      shape?: "straight" | "curved" | "elbowed";
      stroke_color?: string;
      caption?: string;
    }
  ): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${board_id}/connectors`, {
      method: "POST",
      body: JSON.stringify({
        startItem: { id: params.start_item_id },
        endItem: { id: params.end_item_id },
        shape: params.shape || "elbowed",
        style: {
          strokeColor: params.stroke_color || "#1a1a1a",
          strokeWidth: "2.0",
        },
        captions: params.caption
          ? [{ content: params.caption }]
          : [],
      }),
    });
  }

  // Get Board Items
  async get_board_items(
    board_id: string,
    params?: {
      type?: string;
      limit?: number;
    }
  ): Promise<MiroListResponse<MiroItem>> {
    const query_params = new URLSearchParams();
    if (params?.type) query_params.set("type", params.type);
    if (params?.limit) query_params.set("limit", params.limit.toString());

    const query_string = query_params.toString();
    const endpoint = `/boards/${board_id}/items${
      query_string ? `?${query_string}` : ""
    }`;

    return this.request<MiroListResponse<MiroItem>>(endpoint);
  }

  // Update Item
  async update_item(
    board_id: string,
    item_id: string,
    params: {
      data?: any;
      style?: MiroStyle;
      position?: { x: number; y: number };
      geometry?: { width?: number; height?: number };
    }
  ): Promise<MiroItem> {
    return this.request<MiroItem>(`/boards/${board_id}/items/${item_id}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    });
  }

  // Delete Item
  async delete_item(board_id: string, item_id: string): Promise<void> {
    await this.request(`/boards/${board_id}/items/${item_id}`, {
      method: "DELETE",
    });
  }
}
