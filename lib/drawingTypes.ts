export type DrawingToolType =
  | 'NONE'
  | 'TRENDLINE'
  | 'RAY'
  | 'HORIZONTAL'
  | 'HORIZONTAL_RAY'
  | 'EXTENDED_LINE'
  | 'VERTICAL_LINE'
  | 'CHANNEL'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'FIBONACCI'
  | 'FIBONACCI_EXTENSION'
  | 'RISK_REWARD_LONG'
  | 'RISK_REWARD_SHORT'
  | 'MEASURE'
  | 'TEXT'
  | 'CALLOUT'
  | 'BRUSH';

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
  // Enhanced properties for institutional trading suite
  riskRewardRatio?: number;
  entryPrice?: number;
  targetPrice?: number;
  stopPrice?: number;
  fillColor?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  locked?: boolean;
  hidden?: boolean;
}
