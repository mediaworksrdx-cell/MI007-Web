export type DrawingToolType =
  | 'NONE'
  // Lines & Rays
  | 'TRENDLINE'
  | 'RAY'
  | 'INFO_LINE'
  | 'EXTENDED_LINE'
  | 'TREND_ANGLE'
  | 'HORIZONTAL'
  | 'HORIZONTAL_RAY'
  | 'VERTICAL_LINE'
  | 'CROSS_LINE'
  | 'CHANNEL'
  | 'DISJOINT_CHANNEL'
  // Fibonacci & Gann
  | 'FIBONACCI'
  | 'FIBONACCI_EXTENSION'
  | 'FIB_CHANNEL'
  | 'FIB_TIME_ZONE'
  | 'GANN_BOX'
  | 'GANN_FAN'
  // Geometric Shapes
  | 'RECTANGLE'
  | 'ROTATED_RECTANGLE'
  | 'CIRCLE'
  | 'ELLIPSE'
  | 'TRIANGLE'
  | 'POLYLINE'
  | 'CURVE'
  | 'BRUSH'
  | 'HIGHLIGHTER'
  // Patterns & Waves
  | 'HEAD_AND_SHOULDERS'
  | 'ELLIOTT_IMPULSE'
  | 'ELLIOTT_CORRECTION'
  | 'XABCD_PATTERN'
  | 'ABCD_PATTERN'
  // Risk & Forecasting
  | 'RISK_REWARD_LONG'
  | 'RISK_REWARD_SHORT'
  | 'PRICE_RANGE'
  | 'DATE_RANGE'
  | 'MEASURE'
  | 'BARS_PATTERN'
  // Annotations & Markers
  | 'TEXT'
  | 'ANCHORED_TEXT'
  | 'CALLOUT'
  | 'PRICE_LABEL'
  | 'ARROW_UP'
  | 'ARROW_DOWN'
  | 'FLAG';

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
  // Enhanced properties for trading suite
  riskRewardRatio?: number;
  entryPrice?: number;
  targetPrice?: number;
  stopPrice?: number;
  fillColor?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  locked?: boolean;
  hidden?: boolean;
}
