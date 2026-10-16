// ─── Saved Screens Management Workspace ────────────────────────────────────
'use client';

import React from 'react';
import { SavedScreen } from '@/lib/screener/types';

interface SavedScreensViewProps {
  screens: SavedScreen[];
  onRunScreen: (screen: SavedScreen) => void;
  onEditScreen: (screen: SavedScreen) => void;
  onDuplicateScreen: (screen: SavedScreen) => void;
  onDeleteScreen: (screenId: string) => void;
}

export function SavedScreensView({
  screens,
  onRunScreen,
  onEditScreen,
  onDuplicateScreen,
  onDeleteScreen,
}: SavedScreensViewProps) {
  const exportScreenJson = (screen: SavedScreen) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(screen, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${screen.name.replace(/\s+/g, '_')}_screen.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="p-6 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
              Saved Screens Management
            </h2>
          </div>
          <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
            Access, modify, clone, and export your persistent screening filters and customized column configurations.
          </p>
        </div>
      </div>

      {/* Screens Table */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left mono text-[13px]">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] text-[11px] font-black uppercase">
                <th className="py-3 px-4">Screen Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Market</th>
                <th className="py-3 px-4">Columns</th>
                <th className="py-3 px-4">Query Conditions</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50">
              {screens.map((screen) => (
                <tr key={screen.id} className="hover:bg-emerald-500/5 transition-colors group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors">
                        {screen.name}
                      </span>
                      {screen.isPredefined && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                          System
                        </span>
                      )}
                    </div>
                    {screen.description && (
                      <p className="text-[11.5px] text-[var(--theme-card-text-muted)] font-sans mt-0.5 line-clamp-1">
                        {screen.description}
                      </p>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-[12px] text-[var(--theme-card-text-muted)]">
                    {screen.category || 'Custom'}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-[12px] text-[var(--theme-card-text-muted)]">
                    {screen.market}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-[12px] text-[var(--theme-card-text-muted)]">
                    {screen.columns.length} Active
                  </td>

                  <td className="py-3 px-4">
                    <pre className="text-[11.5px] text-emerald-300 font-bold whitespace-pre-wrap max-w-xs line-clamp-2">
                      {screen.query}
                    </pre>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRunScreen(screen)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[11.5px] font-black hover:bg-emerald-400 transition-colors shadow-xs"
                      >
                        Run ▶
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditScreen(screen)}
                        className="px-2 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 text-[11.5px] font-bold transition-all"
                        title="Edit Screen"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicateScreen(screen)}
                        className="px-2 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 text-[11.5px] font-bold transition-all"
                        title="Duplicate Screen"
                      >
                        Clone
                      </button>

                      <button
                        type="button"
                        onClick={() => exportScreenJson(screen)}
                        className="px-2 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 text-[11.5px] font-bold transition-all"
                        title="Export JSON"
                      >
                        Export
                      </button>

                      {!screen.isPredefined && (
                        <button
                          type="button"
                          onClick={() => onDeleteScreen(screen.id)}
                          className="px-2 py-1 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-[11.5px] font-bold transition-all"
                          title="Delete Screen"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
