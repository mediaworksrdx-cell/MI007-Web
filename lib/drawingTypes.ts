export type DrawingToolType = 'NONE' | 'TRENDLINE' | 'HORIZONTAL' | 'RECTANGLE' | 'FIBONACCI';

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
}
