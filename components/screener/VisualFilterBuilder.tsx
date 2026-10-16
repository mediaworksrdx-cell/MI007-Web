// ─── Screener Visual Filter Builder Component ───────────────────────────────
'use client';

import React from 'react';
import { VisualFilter, ComparisonOperator } from '@/lib/screener/types';
import { METRIC_DEFINITIONS, getMetricDefinition } from '@/lib/screener/metrics';

interface VisualFilterBuilderProps {
  filters: VisualFilter[];
  onChangeFilters: (filters: VisualFilter[]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const OPERATORS: { op: ComparisonOperator; label: string }[] = [
  { op: '>', label: '> Greater than' },
  { op: '>=', label: '>= At least' },
  { op: '<', label: '< Less than' },
  { op: '<=', label: '<= At most' },
  { op: '==', label: '= Equal to' },
  { op: '!=', label: '!= Not equal' },
  { op: 'BETWEEN', label: 'BETWEEN Range' },
];

export function VisualFilterBuilder({
  filters,
  onChangeFilters,
  onApplyFilters,
  onClearFilters,
}: VisualFilterBuilderProps) {
  const addFilter = () => {
    const newFilter: VisualFilter = {
      id: `vf-${Date.now()}`,
      metricKey: 'roce',
      operator: '>',
      value: 15,
    };
    onChangeFilters([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<VisualFilter>) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], ...updates };
    onChangeFilters(updated);
  };

  const removeFilter = (index: number) => {
    const updated = filters.filter((_, i) => i !== index);
    onChangeFilters(updated);
  };

  return (
    <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
        <div className="flex items-center gap-2">
          <span className="mono text-[13.5px] font-black inst-card-text tracking-wider uppercase">
            Visual Filter Builder
          </span>
          <span className="mono text-[11px] font-bold px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)]">
            {filters.length} Conditions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addFilter}
            className="px-3 py-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 mono text-[12px] font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Add Condition</span>
          </button>
        </div>
      </div>

      {/* Filter Rows List */}
      <div className="p-4 flex flex-col gap-2.5">
        {filters.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-[var(--theme-card-border)]">
            <p className="mono text-[13px] text-[var(--theme-card-text-muted)] mb-3">
              No visual conditions configured. Click below to add a fundamental screening filter.
            </p>
            <button
              type="button"
              onClick={addFilter}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black hover:bg-emerald-400 transition-colors shadow-xs"
            >
              + Add First Filter
            </button>
          </div>
        ) : (
          filters.map((filter, index) => {
            const def = getMetricDefinition(filter.metricKey);
            return (
              <div
                key={filter.id}
                className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]"
              >
                {/* Metric Selector */}
                <select
                  value={filter.metricKey}
                  onChange={(e) => updateFilter(index, { metricKey: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] mono text-[13px] font-bold focus:outline-none focus:border-emerald-500 min-w-44 flex-1"
                >
                  {METRIC_DEFINITIONS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.unit || m.dataType})
                    </option>
                  ))}
                </select>

                {/* Operator Selector */}
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter(index, {
                      operator: e.target.value as ComparisonOperator,
                      value2: e.target.value === 'BETWEEN' ? (filter.value || 0) + 10 : undefined,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-emerald-400 mono text-[13px] font-bold focus:outline-none focus:border-emerald-500"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.op} value={op.op}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {/* Value 1 */}
                <input
                  type="number"
                  step="any"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, { value: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] mono text-[13px] font-bold focus:outline-none focus:border-emerald-500 text-right"
                />

                {/* Range Value 2 if BETWEEN */}
                {filter.operator === 'BETWEEN' && (
                  <>
                    <span className="mono text-[12px] font-bold text-[var(--theme-card-text-muted)]">to</span>
                    <input
                      type="number"
                      step="any"
                      value={filter.value2 ?? (filter.value + 10)}
                      onChange={(e) =>
                        updateFilter(index, { value2: parseFloat(e.target.value) || 0 })
                      }
                      className="w-24 px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] mono text-[13px] font-bold focus:outline-none focus:border-emerald-500 text-right"
                    />
                  </>
                )}

                {/* Unit Tag */}
                <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]">
                  {def?.unit || ''}
                </span>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeFilter(index)}
                  className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Remove condition"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filters.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <button
            type="button"
            onClick={onClearFilters}
            className="mono text-[12px] font-bold text-[var(--theme-card-text-muted)] hover:text-white transition-colors"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={onApplyFilters}
            className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black tracking-wide hover:bg-emerald-400 transition-colors shadow-xs"
          >
            Apply Visual Filters
          </button>
        </div>
      )}
    </div>
  );
}
