// ─── MI007 Chart Template Management System ──────────────────────────────────
// 5 Persistent User Template Slots with custom naming, renaming, editing, and removal.
import { Timeframe, ChartType, IndicatorType, IndicatorConfig } from './types';

export interface ChartTemplate {
  id: string; // 'tpl_1' | 'tpl_2' | 'tpl_3' | 'tpl_4' | 'tpl_5'
  slotNumber: number; // 1 to 5
  name: string;
  timeframe: Timeframe;
  chartType: ChartType;
  activeIndicators: IndicatorType[];
  indicatorConfigs?: IndicatorConfig[];
  customConfigs?: Partial<Record<IndicatorType, Partial<IndicatorConfig>>>;
  showVolume: boolean;
  showSmcOverlay: boolean;
  showVolumeProfile: boolean;
  updatedAt: number;
}

const STORAGE_KEY = 'mi007_chart_templates_v2';
const ACTIVE_TEMPLATE_KEY = 'mi007_active_template_id';

export const DEFAULT_TEMPLATES: ChartTemplate[] = [
  {
    id: 'tpl_1',
    slotNumber: 1,
    name: 'Template 1',
    timeframe: '1H',
    chartType: 'CANDLESTICK',
    activeIndicators: [], // Clean price action by default
    showVolume: true,
    showSmcOverlay: false,
    showVolumeProfile: false,
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_2',
    slotNumber: 2,
    name: 'Template 2',
    timeframe: '15m',
    chartType: 'CANDLESTICK',
    activeIndicators: ['EMA', 'RSI'],
    showVolume: true,
    showSmcOverlay: false,
    showVolumeProfile: false,
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_3',
    slotNumber: 3,
    name: 'Template 3',
    timeframe: '1D',
    chartType: 'CANDLESTICK',
    activeIndicators: ['SMA', 'MACD'],
    showVolume: true,
    showSmcOverlay: false,
    showVolumeProfile: false,
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_4',
    slotNumber: 4,
    name: 'Template 4',
    timeframe: '1H',
    chartType: 'CANDLESTICK',
    activeIndicators: ['BOLLINGER_BANDS'],
    showVolume: true,
    showSmcOverlay: false,
    showVolumeProfile: false,
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_5',
    slotNumber: 5,
    name: 'Template 5',
    timeframe: '4H',
    chartType: 'CANDLESTICK',
    activeIndicators: ['SUPERTREND'],
    showVolume: true,
    showSmcOverlay: false,
    showVolumeProfile: false,
    updatedAt: Date.now(),
  },
];

/** Retrieve all 5 templates from storage or initialize defaults */
export function getStoredTemplates(): ChartTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    const parsed: ChartTemplate[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 5) {
      return parsed;
    }
    // Reconcile to guarantee exactly 5 slots
    const list: ChartTemplate[] = [];
    for (let i = 1; i <= 5; i++) {
      const existing = parsed.find(t => t.slotNumber === i || t.id === `tpl_${i}`);
      list.push(existing || DEFAULT_TEMPLATES[i - 1]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (err) {
    console.warn('[ChartTemplates] Error loading templates:', err);
    return DEFAULT_TEMPLATES;
  }
}

/** Save / Overwrite a specific template slot */
export function saveTemplate(template: ChartTemplate): ChartTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const all = getStoredTemplates();
    const updated = all.map(t => (t.id === template.id ? { ...template, updatedAt: Date.now() } : t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(ACTIVE_TEMPLATE_KEY, template.id);
    return updated;
  } catch (err) {
    console.error('[ChartTemplates] Error saving template:', err);
    return getStoredTemplates();
  }
}

/** Rename a template */
export function renameTemplate(id: string, newName: string): ChartTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const all = getStoredTemplates();
    const updated = all.map(t => (t.id === id ? { ...t, name: newName.trim(), updatedAt: Date.now() } : t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[ChartTemplates] Error renaming template:', err);
    return getStoredTemplates();
  }
}

/** Remove / Reset a template back to a clean default state */
export function removeTemplate(id: string): ChartTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const all = getStoredTemplates();
    const defaultTpl = DEFAULT_TEMPLATES.find(d => d.id === id);
    const updated = all.map(t => {
      if (t.id === id) {
        return {
          id: t.id,
          slotNumber: t.slotNumber,
          name: `Template ${t.slotNumber}`,
          timeframe: '1H' as Timeframe,
          chartType: 'CANDLESTICK' as ChartType,
          activeIndicators: [], // completely clean
          showVolume: true,
          showSmcOverlay: false,
          showVolumeProfile: false,
          updatedAt: Date.now(),
        };
      }
      return t;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[ChartTemplates] Error removing template:', err);
    return getStoredTemplates();
  }
}

/** Get active template ID */
export function getActiveTemplateId(): string {
  if (typeof window === 'undefined') return 'tpl_1';
  try {
    return localStorage.getItem(ACTIVE_TEMPLATE_KEY) || 'tpl_1';
  } catch {
    return 'tpl_1';
  }
}

/** Set active template ID */
export function setActiveTemplateId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_TEMPLATE_KEY, id);
  } catch {}
}
