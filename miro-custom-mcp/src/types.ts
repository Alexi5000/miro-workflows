// file: miro-custom-mcp/src/types.ts
// description: TypeScript types for Miro REST API v2
// reference: https://developers.miro.com/reference/api-reference

export interface MiroPosition {
  x: number;
  y: number;
  origin?: "center" | "top_left";
  relativeTo?: "canvas_center" | "parent_top_left";
}

export interface MiroGeometry {
  width?: number;
  height?: number;
  rotation?: number;
}

export interface MiroStyle {
  fillColor?: string;
  fillOpacity?: string;
  fontFamily?: string;
  fontSize?: string;
  borderColor?: string;
  borderWidth?: string;
  borderOpacity?: string;
  borderStyle?: "normal" | "dotted" | "dashed";
  textAlign?: "left" | "center" | "right";
  textAlignVertical?: "top" | "middle" | "bottom";
  color?: string; // text color
}

export interface MiroStickyNoteData {
  content: string;
  shape?: "square" | "rectangle";
}

export interface MiroShapeData {
  content?: string;
  shape: "rectangle" | "round_rectangle" | "circle" | "triangle" | "rhombus" | "parallelogram" | "trapezoid" | "pentagon" | "hexagon" | "octagon" | "wedge_round_rectangle_callout" | "star" | "flow_chart_predefined_process" | "cloud" | "cross" | "can" | "right_arrow" | "left_arrow" | "left_right_arrow" | "left_brace" | "right_brace";
}

export interface MiroTextData {
  content: string;
}

export interface MiroCardData {
  title?: string;
  description?: string;
  dueDate?: string;
  assigneeId?: string;
  fields?: Array<{
    value: string;
    iconShape?: string;
    fillColor?: string;
    tooltip?: string;
  }>;
}

export interface MiroFrameData {
  title?: string;
  type?: "freeform" | "kanban";
  format?: "custom" | "a4" | "a5" | "letter";
  showContent?: boolean;
}

export interface MiroConnectorData {
  shape?: "straight" | "curved" | "elbowed";
  style?: MiroStyle & {
    strokeStyle?: "normal" | "dotted" | "dashed";
    strokeColor?: string;
    strokeWidth?: string;
    startStrokeCap?: string;
    endStrokeCap?: string;
  };
  startItem?: {
    id: string;
    position?: {
      x?: string;
      y?: string;
    };
  };
  endItem?: {
    id: string;
    position?: {
      x?: string;
      y?: string;
    };
  };
  captions?: Array<{
    content: string;
    position?: string;
  }>;
}

export interface MiroItem {
  id: string;
  type: string;
  data?: any;
  style?: MiroStyle;
  position?: MiroPosition;
  geometry?: MiroGeometry;
  parent?: {
    id: string;
  };
  createdAt?: string;
  createdBy?: {
    id: string;
    type: string;
  };
  modifiedAt?: string;
  modifiedBy?: {
    id: string;
    type: string;
  };
}

export interface MiroApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface MiroListResponse<T> {
  data: T[];
  total?: number;
  size?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}
