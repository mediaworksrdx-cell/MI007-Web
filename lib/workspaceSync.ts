'use client';

export type WorkspaceSyncEvent =
  | { type: 'MARKET_CHANGED'; market: 'INDIA' | 'USA' | 'UAE'; timestamp: number }
  | { type: 'THEME_CHANGED'; theme: string; timestamp: number }
  | { type: 'WATCHLIST_UPDATED'; timestamp: number }
  | { type: 'SCREENS_UPDATED'; timestamp: number }
  | { type: 'ALERTS_UPDATED'; timestamp: number }
  | { type: 'LIVE_ALERT_TRIGGERED'; alertName: string; symbol: string; message: string; timestamp: number };

const CHANNEL_NAME = 'mi007_workspace_sync_v1';

class WorkspaceSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(event: WorkspaceSyncEvent) => void>();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (e: MessageEvent<WorkspaceSyncEvent>) => {
          if (e.data && typeof e.data === 'object' && 'type' in e.data) {
            this.listeners.forEach((cb) => {
              try {
                cb(e.data);
              } catch (err) {
                console.warn('[WorkspaceSync] Listener error:', err);
              }
            });
          }
        };
      } catch (err) {
        console.warn('[WorkspaceSync] BroadcastChannel initialization skipped:', err);
      }
    }
  }

  public broadcast(event: WorkspaceSyncEvent): void {
    try {
      this.channel?.postMessage(event);
    } catch {
      // Ignore closed channel or serialization issues
    }
  }

  public subscribe(callback: (event: WorkspaceSyncEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const workspaceSync = new WorkspaceSyncManager();
