export type DrawingToolType =
  | 'NONE'
  | 'TRENDLINE'
  | 'RAY'
  | 'HORIZONTAL'
  | 'VERTICAL_LINE'
  | 'CHANNEL'
  | 'RECTANGLE'
  | 'FIBONACCI'
  | 'FIBONACCI_EXTENSION'
  | 'MEASURE'
  | 'TEXT';

export interface DrawingPoint {
  index: number;
  time?: number;
  price: number;
}

export interface DrawingItem {
  id: string;
  tool: DrawingToolType;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  completed: boolean;
  text?: string;
}

