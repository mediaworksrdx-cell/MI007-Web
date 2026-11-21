/**
 * MI-007 Central User Account Management
 * Handles Client Registration, Profiles, WhatsApp Phone Verification, and Account Deletion
 */

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: string;
  deskId: string;
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEY_ACCOUNT = 'mi007_user_account_v1';
const STORAGE_KEY_SESSION = 'mi007_user_session';
const AUTH_EVENT_NAME = 'mi007_auth_state_changed';

export function getUserAccount(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNT);
    if (!raw) {
      // Check legacy session
      const legacySession = localStorage.getItem(STORAGE_KEY_SESSION);
      if (legacySession) {
        const parsed = JSON.parse(legacySession);
        return {
          id: `ACC-${Math.floor(100000 + Math.random() * 900000)}`,
          name: parsed.name || 'Trader',
          email: `${parsed.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'trader'}@mi007.terminal`,
          phone: localStorage.getItem('mi007_whatsapp_phone_v1') || '+918778123702',
          phoneVerified: localStorage.getItem('mi007_whatsapp_verified_v1') === 'true',
          role: parsed.role || 'Pro Trader',
          deskId: parsed.deskId || 'DESK-007',
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[UserAccount] Failed to parse stored account:', err);
    return null;
  }
}

export function saveUserAccount(account: UserAccount): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    // Also sync session for Navbar
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify({
        name: account.name,
        role: account.role,
        deskId: account.deskId,
      })
    );
    // If phone is verified, sync with alerts
    if (account.phone) {
      localStorage.setItem('mi007_whatsapp_phone_v1', account.phone);
      if (account.phoneVerified) {
        localStorage.setItem('mi007_whatsapp_verified_v1', 'true');
      }
    }
    broadcastAuthChange(account);
  } catch (err) {
    console.warn('[UserAccount] Failed to save account:', err);
  }
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    broadcastAuthChange(null);
  } catch (err) {
    console.warn('[UserAccount] Failed to logout:', err);
  }
}

export function deleteUserAccount(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem('mi007_whatsapp_verified_v1');
    localStorage.removeItem('mi007_whatsapp_phone_v1');
    broadcastAuthChange(null);
  } catch (err) {
    console.warn('[UserAccount] Failed to delete personal account:', err);
  }
}

export function broadcastAuthChange(account: UserAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT_NAME, {
        detail: { account },
      })
    );
  } catch {}
}

export function onAuthChange(callback: (account: UserAccount | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ account: UserAccount | null }>;
    callback(customEvent.detail?.account ?? null);
  };
  window.addEventListener(AUTH_EVENT_NAME, handler);
  return () => window.removeEventListener(AUTH_EVENT_NAME, handler);
}
