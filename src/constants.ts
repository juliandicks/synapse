import type { Zone, VerticalSide, HorizontalSide, LabelAlign, BezierConfig } from './types';

export const CENTRAL_RADIUS = 40;
export const CHILD_RADIUS = 18;
export const CENTRAL_STROKE_WIDTH = 4;
export const CHILD_STROKE_WIDTH = 2;
export const HORIZONTAL_OFFSET = 300;
export const VERTICAL_OFFSET = 200;
export const RIGHT_ZONE_DISTANCE = 300;
export const NODE_VERTICAL_SPACING = 65;
export const LABEL_GAP = 8;
export const DEFAULT_LABEL_WIDTH = 96;
export const BEZIER_SEGMENTS = 20;
export const CURVE_HIT_THRESHOLD = 12;

export const POSITION_THRESHOLD = 0.5;
export const RADIUS_THRESHOLD = 0.3;
export const OPACITY_THRESHOLD = 0.01;
export const ANIMATION_SPEED = 5;

export const COLORS = {
  background: '#1a1a2e',
  centralFill: '#16213e',
  centralStroke: '#e94560',
  nodeFill: '#0f3460',
  nodeStroke: '#533483',
  nodeStrokeHover: '#facc15',
  bezier: '#533483',
  label: '#eaeaea',
} as const;

export const BEZIER_CONFIG: Record<Zone, BezierConfig> = {
  topLeft: { startExtend: 0.6, startOffset: -0.05, endExtend: 0.5, endOffset: -0.1 },
  topRight: { startExtend: 0.6, startOffset: 0.05, endExtend: 0.5, endOffset: 0.1 },
  bottomLeft: { startExtend: 0.6, startOffset: 0.05, endExtend: 0.5, endOffset: 0.1 },
  bottomRight: { startExtend: 0.6, startOffset: -0.05, endExtend: 0.5, endOffset: -0.1 },
  right: { startExtend: 0.55, startOffset: 0, endExtend: 0.55, endOffset: 0 },
};

export function zoneToVerticalSide(zone: Zone): VerticalSide {
  switch (zone) {
    case 'topLeft':
    case 'topRight':
      return 'top';
    case 'bottomLeft':
    case 'bottomRight':
      return 'bottom';
    case 'right':
      return 'right';
  }
}

export function zoneToHorizontalSide(zone: Zone): HorizontalSide {
  switch (zone) {
    case 'topLeft':
    case 'bottomLeft':
      return 'right';
    case 'topRight':
    case 'bottomRight':
    case 'right':
      return 'left';
  }
}

export function zoneToLabelAlign(zone: Zone): LabelAlign {
  switch (zone) {
    case 'topLeft':
    case 'bottomLeft':
      return 'left';
    case 'topRight':
    case 'bottomRight':
    case 'right':
      return 'right';
  }
}
