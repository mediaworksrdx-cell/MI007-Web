'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { SmcSetupType } from '@/lib/smcEngine';
import {
  ALL_SMC_TIMEFRAMES,
  DEFAULT_CHANNEL_SETTINGS,
  QUICK_WISH_INSTRUMENTS,
  SMC_ALERT_SETUP_OPTIONS,
  TOP_6_SMC_SETUPS,
  SmcAlertAssetClass,
  SmcAlertChannelSettings,
  SmcAlertDirection,
  SmcAlertStage,
  SmcAlertWatchItem,
  SmcTriggeredAlert,
  loadAlertHistory,
  loadAlertSettings,
  loadAlertWatchlist,
  saveAlertHistory,
  saveAlertSettings,
  saveAlertWatchlist,
  loadSentAlertIds,
  recordSentAlertIds,
} from '@/lib/alerts/smcAlerts';
import {
  getUserAccount,
  saveUserAccount,
  deleteUserAccount,
  logoutUser,
  onAuthChange,
  UserAccount,
} from '@/lib/auth/userAccount';

let sharedAlertAudioCtx: AudioContext | null = null;

function playAlertChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAlertAudioCtx || sharedAlertAudioCtx.state === 'closed') {
      sharedAlertAudioCtx = new AudioCtx();
    }
    if (sharedAlertAudioCtx.state === 'suspended') {
      sharedAlertAudioCtx.resume().catch(() => {});
    }
    const ctx = sharedAlertAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
  } catch {
    // ignore audio autoplay restriction
  }
}

function formatPriceVal(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) < 10) return v.toFixed(4);
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SmcAlertsTabView() {
  const [watchlist, setWatchlist] = useState<SmcAlertWatchItem[]>([]);
  const [settings, setSettings] = useState<SmcAlertChannelSettings>(DEFAULT_CHANNEL_SETTINGS);
  const [history, setHistory] = useState<SmcTriggeredAlert[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Add Wish Instrument form state
  const [symbolInput, setSymbolInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [assetClass, setAssetClass] = useState<SmcAlertAssetClass>('INDEX');
  const [market, setMarket] = useState<'INDIA' | 'USA' | 'UAE'>('INDIA');
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>(['15m', '1H']);
  const [setupMode, setSetupMode] = useState<'ALL' | 'TOP6' | 'CUSTOM'>('TOP6');
  const [customSetups, setCustomSetups] = useState<SmcSetupType[]>(TOP_6_SMC_SETUPS);
  const [direction, setDirection] = useState<SmcAlertDirection>('BOTH');
  const [minQuality, setMinQuality] = useState<number>(70);
  const [triggerStages, setTriggerStages] = useState<SmcAlertStage[]>(['ACTIONABLE', 'TP_HIT', 'SL_HIT']);
  const [ruleChannels, setRuleChannels] = useState({ browser: true, whatsapp: true, gmail: true });
  const [quickFilter, setQuickFilter] = useState<'ALL' | SmcAlertAssetClass>('ALL');

  // Evaluation & Delivery feedback state
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<string>('default');
  const [testFeedback, setTestFeedback] = useState<{ channel: string; ok: boolean; msg: string } | null>(null);
  const [showChannelsConfig, setShowChannelsConfig] = useState(true);

  // Central MI-007 OTP Engine State
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isOtpLoading, setIsOtpLoading] = useState<boolean>(false);

  // User Account State for Alerts
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [isSignInMode, setIsSignInMode] = useState<boolean>(false);
  const [showAdvancedSmtp, setShowAdvancedSmtp] = useState<boolean>(false);

  const historyRef = useRef<SmcTriggeredAlert[]>([]);
  historyRef.current = history;
  const sentIdsRef = useRef<Record<string, number>>({});
  const hasSeededRef = useRef<boolean>(false);

  useEffect(() => {
    setWatchlist(loadAlertWatchlist());
    setSettings(loadAlertSettings());
    setHistory(loadAlertHistory());
    sentIdsRef.current = loadSentAlertIds();
    if (Object.keys(sentIdsRef.current).length > 0) {
      hasSeededRef.current = true;
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
    const acc = getUserAccount();
    if (acc) {
      setUserAccount(acc);
      if (acc.phone) {
        setSettings((s) => ({ ...s, whatsappPhone: acc.phone }));
      }
      if (acc.phoneVerified) {
        setOtpVerified(true);
      }
    } else if (typeof window !== 'undefined') {
      const isVer = localStorage.getItem('mi007_whatsapp_verified_v1') === 'true';
      if (isVer) setOtpVerified(true);
      const savedPhone = localStorage.getItem('mi007_whatsapp_phone_v1');
      if (savedPhone) {
        setSettings((s) => ({ ...s, whatsappPhone: savedPhone }));
      }
    }
    setHydrated(true);

    const unsubscribe = onAuthChange((newAcc) => {
      setUserAccount(newAcc);
      if (newAcc) {
        if (newAcc.phone) {
          setSettings((s) => ({ ...s, whatsappPhone: newAcc.phone, whatsappEnabled: true }));
        }
        if (newAcc.phoneVerified) {
          setOtpVerified(true);
        }
      } else {
        setOtpVerified(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (hydrated) saveAlertWatchlist(watchlist);
  }, [watchlist, hydrated]);

  useEffect(() => {
    if (hydrated) saveAlertSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (hydrated) saveAlertHistory(history);
  }, [history, hydrated]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSendOtp = async (channel: 'whatsapp' | 'email' = 'whatsapp') => {
    const destination = (channel === 'whatsapp' ? settings.whatsappPhone : settings.gmailTo || settings.gmailUser || '').trim();
    if (!destination || destination.length < 5) {
      setTestFeedback({
        channel: channel === 'whatsapp' ? 'WhatsApp' : 'Gmail',
        ok: false,
        msg: channel === 'whatsapp'
          ? 'Please enter a valid mobile number with country code (e.g. +918778123702).'
          : 'Please enter a valid recipient email address.',
      });
      return;
    }
    setIsOtpLoading(true);
    try {
      const res = await fetch('/api/v1/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, channel, purpose: 'alerts' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        setOtpSent(true);
        if (data.challenge_id) setOtpChallengeId(data.challenge_id);
        setResendCooldown(data.cooldown || 60);
        setTestFeedback({
          channel: channel === 'whatsapp' ? 'WhatsApp' : 'Gmail',
          ok: true,
          msg: `6-Digit OTP sent to ${destination} via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}. Enter code below.`,
        });
      } else {
        const rawErr = String(data?.error || '');
        const cleanMsg =
          rawErr.toLowerCase().includes('pairing') || rawErr.toLowerCase().includes('connect')
            ? 'Unable to deliver WhatsApp OTP to this number right now. Please try again or verify your country code.'
            : rawErr || 'Failed to dispatch verification OTP.';
        setTestFeedback({
          channel: channel === 'whatsapp' ? 'WhatsApp' : 'Gmail',
          ok: false,
          msg: cleanMsg,
        });
      }
    } catch (err: any) {
      setTestFeedback({
        channel: channel === 'whatsapp' ? 'WhatsApp' : 'Gmail',
        ok: false,
        msg: err?.message || 'Network error requesting OTP.',
      });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpInput.trim().replace(/[^0-9]/g, '');
    if (code.length !== 6) {
      setTestFeedback({ channel: 'WhatsApp', ok: false, msg: 'Please enter the complete 6-digit OTP code.' });
      return;
    }
    setIsOtpLoading(true);
    try {
      const res = await fetch('/api/v1/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: otpChallengeId || '',
          otp: code,
          destination: settings.whatsappPhone || '+918778123702',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data.verified) {
        const phone = data.destination || settings.whatsappPhone || '+918778123702';
        const accName = regName.trim() || 'MI-007 Trader';
        const accEmail = regEmail.trim().toLowerCase() || `${phone.replace(/[^0-9]/g, '')}@mi007.terminal`;
        const newAcc: UserAccount = {
          id: `ACC-${Date.now().toString(36).toUpperCase()}`,
          name: accName,
          email: accEmail,
          phone,
          phoneVerified: true,
          role: 'Pro Trader',
          deskId: `DESK-${Math.floor(100 + Math.random() * 900)}`,
          createdAt: new Date().toISOString(),
        };
        saveUserAccount(newAcc);
        setUserAccount(newAcc);
        setOtpVerified(true);
        setOtpSent(false);
        setOtpInput('');
        setOtpChallengeId(null);
        setSettings((s) => ({ ...s, whatsappEnabled: true, whatsappPhone: phone }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('mi007_whatsapp_verified_v1', 'true');
        }
        setTestFeedback({
          channel: 'WhatsApp',
          ok: true,
          msg: `✓ Account registered & verified! Live SMC trade alerts active for ${accName} (${phone}).`,
        });
      } else {
        setTestFeedback({
          channel: 'WhatsApp',
          ok: false,
          msg: data?.error || 'Invalid OTP code. Please try again.',
        });
      }
    } catch (err: any) {
      setTestFeedback({
        channel: 'WhatsApp',
        ok: false,
        msg: err?.message || 'Verification failed. Please try again.',
      });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResetOtp = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Delete personal account and reset verification?')) return;
    deleteUserAccount();
    setUserAccount(null);
    setOtpVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setOtpChallengeId(null);
    setResendCooldown(0);
    setTestFeedback({
      channel: 'WhatsApp',
      ok: true,
      msg: 'Personal account deleted. Enter your name, mobile, and email to register.',
    });
  };

  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setTestFeedback({ channel: 'Browser', ok: false, msg: 'Browser Notifications API is not supported in this browser.' });
      return;
    }
    const perm = await Notification.requestPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      setSettings((s) => ({ ...s, browserEnabled: true }));
      setTestFeedback({ channel: 'Browser', ok: true, msg: 'Browser notifications enabled!' });
    } else {
      setTestFeedback({ channel: 'Browser', ok: false, msg: `Browser notification permission: ${perm}` });
    }
  };

  const dispatchSingleAlert = useCallback(
    async (alert: SmcTriggeredAlert, itemChannels: SmcAlertWatchItem['channels']) => {
      const delivery: NonNullable<SmcTriggeredAlert['delivery']> = {};

      // 1. Browser Notification + Sound
      if (itemChannels.browser && settings.browserEnabled) {
        if (settings.soundEnabled) playAlertChime();
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const dirLabel = alert.direction === 'BULLISH' ? '▲ LONG' : '▼ SHORT';
            new Notification(`MI-007 SMC ${dirLabel}: ${alert.symbol} (${alert.timeframe})`, {
              body: `${alert.setupName} • Q${alert.qualityScore} • Entry ${formatPriceVal(alert.entryPrice)} | SL ${formatPriceVal(alert.stopLoss)} | TP1 ${formatPriceVal(alert.targetPrice)} (${alert.statusLabel})`,
            });
            delivery.browser = 'sent';
          } catch {
            delivery.browser = 'failed';
          }
        } else {
          delivery.browser = 'skipped';
        }
      }

      // 2. Server-side WhatsApp & Gmail dispatch
      const wantWa = Boolean(itemChannels.whatsapp && settings.whatsappEnabled);
      const wantGmail = Boolean(itemChannels.gmail && settings.gmailEnabled);
      if (wantWa || wantGmail) {
        try {
          const res = await fetch('/api/alerts/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alert,
              channels: { whatsapp: wantWa, gmail: wantGmail },
              config: {
                whatsappProvider: settings.whatsappProvider,
                whatsappPhone: settings.whatsappPhone,
                selfhostedUrl: settings.selfhostedUrl,
                callmebotApiKey: settings.callmebotApiKey,
                twilioAccountSid: settings.twilioAccountSid,
                twilioAuthToken: settings.twilioAuthToken,
                gmailTo: settings.gmailTo,
                gmailUser: settings.gmailUser,
                gmailAppPassword: settings.gmailAppPassword,
                originUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
              },
            }),
          });
          const data = await res.json();
          if (wantWa) {
            delivery.whatsapp = data?.results?.whatsapp?.ok ? 'sent' : 'failed';
            delivery.whatsappMsg = data?.results?.whatsapp?.message;
          }
          if (wantGmail) {
            delivery.gmail = data?.results?.gmail?.ok ? 'sent' : 'failed';
            delivery.gmailMsg = data?.results?.gmail?.message;
          }
        } catch (err: any) {
          if (wantWa) {
            delivery.whatsapp = 'failed';
            delivery.whatsappMsg = err?.message || 'Network error';
          }
          if (wantGmail) {
            delivery.gmail = 'failed';
            delivery.gmailMsg = err?.message || 'Network error';
          }
        }
      }

      return { ...alert, delivery };
    },
    [settings]
  );

  const runScan = useCallback(async () => {
    const enabled = watchlist.filter((w) => w.enabled);
    if (enabled.length === 0 || isScanning) return;

    setIsScanning(true);
    try {
      const isInitial = !hasSeededRef.current && Object.keys(sentIdsRef.current).length === 0;
      const alreadySentIds = Object.keys(sentIdsRef.current);
      const res = await fetch('/api/alerts/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: enabled,
          alreadySentIds,
          isInitialSeed: isInitial,
        }),
      });
      const data = await res.json();
      setLastScanTime(new Date().toLocaleTimeString());

      if (isInitial && Array.isArray(data?.baselineIds)) {
        sentIdsRef.current = recordSentAlertIds(data.baselineIds);
        hasSeededRef.current = true;
        setScanSummary(`Initialized baseline for ${data.evaluatedPairs || 0} symbol/TF pairs. Actively watching for new setups.`);
        return;
      }

      hasSeededRef.current = true;
      const newlyTriggered: SmcTriggeredAlert[] = Array.isArray(data?.triggered) ? data.triggered : [];

      if (newlyTriggered.length > 0) {
        // Record all newly triggered IDs into persistent sent store immediately
        sentIdsRef.current = recordSentAlertIds(newlyTriggered.map((t) => t.id));

        const watchById = new Map(enabled.map((w) => [w.id, w]));
        const dispatched: SmcTriggeredAlert[] = [];
        for (const al of newlyTriggered) {
          const item = watchById.get(al.watchItemId);
          const withDelivery = await dispatchSingleAlert(
            al,
            item?.channels || { browser: true, whatsapp: false, gmail: false }
          );
          dispatched.push(withDelivery);
        }
        const missingCount = Array.isArray(data?.pairStatuses)
          ? data.pairStatuses.filter((p: any) => p.status !== 'ok').length
          : 0;
        const missingSuffix = missingCount > 0 ? ` (${missingCount} pair(s) had insufficient data)` : '';
        setHistory((prev) => [...dispatched, ...prev].slice(0, 150));
        setScanSummary(`Checked ${data.evaluatedPairs || 0} symbol/TF pairs${missingSuffix} • ${dispatched.length} new SMC alert(s) triggered.`);
      } else {
        const missingCount = Array.isArray(data?.pairStatuses)
          ? data.pairStatuses.filter((p: any) => p.status !== 'ok').length
          : 0;
        const missingSuffix = missingCount > 0 ? ` (${missingCount} pair(s) had insufficient data)` : '';
        setScanSummary(`Checked ${data.evaluatedPairs || 0} symbol/TF pairs${missingSuffix} • No new setups since last check.`);
      }
    } catch (err: any) {
      setScanSummary(`Scan error: ${err?.message || 'Unable to reach /api/alerts/evaluate'}`);
    } finally {
      setIsScanning(false);
    }
  }, [watchlist, isScanning, dispatchSingleAlert]);

  // Initial scan once hydrated to establish baseline or check active setups
  useEffect(() => {
    if (!hydrated || watchlist.filter((w) => w.enabled).length === 0) return;
    const initialTimer = setTimeout(() => {
      runScan();
    }, 1200);
    return () => clearTimeout(initialTimer);
  }, [hydrated, watchlist, runScan]);

  // Auto-scan recurring interval
  useEffect(() => {
    if (!hydrated || !settings.autoScanEnabled || watchlist.filter((w) => w.enabled).length === 0) return;
    const ms = Math.max(30, settings.pollIntervalSec || 60) * 1000;
    const timer = setInterval(() => {
      runScan();
    }, ms);
    return () => clearInterval(timer);
  }, [hydrated, settings.autoScanEnabled, settings.pollIntervalSec, watchlist, runScan]);

  const handleSendTest = async (channel: 'browser' | 'whatsapp' | 'gmail') => {
    setTestFeedback({ channel, ok: true, msg: `Sending test ${channel} alert...` });
    const sampleAlert = {
      symbol: 'GOLD',
      name: 'Gold Spot (XAU/USD)',
      timeframe: '15m',
      market: 'USA',
      assetClass: 'COMMODITY',
      setupName: 'OB + FVG Confluence (Bullish)',
      direction: 'BULLISH' as const,
      qualityScore: 84,
      entryPrice: 3770.3,
      stopLoss: 3755.0,
      targetPrice: 3800.9,
      targetPrice2: 3824.0,
      riskReward: 2.0,
      statusLabel: 'ENTRY READY',
      triggeredAt: new Date().toISOString(),
    };

    if (channel === 'browser') {
      if (settings.soundEnabled) playAlertChime();
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setTestFeedback({ channel: 'Browser', ok: false, msg: 'Browser Notifications API not supported.' });
        return;
      }
      let perm = Notification.permission;
      if (perm !== 'granted') {
        perm = await Notification.requestPermission();
        setBrowserPermission(perm);
      }
      if (perm === 'granted') {
        new Notification('🧪 TEST MI-007 SMC ▲ LONG: GOLD (15m)', {
          body: 'OB + FVG Confluence • Q84 • Entry 3,770.30 | SL 3,755.00 | TP1 3,800.90 (ENTRY READY)',
        });
        setTestFeedback({ channel: 'Browser', ok: true, msg: 'Test browser notification fired!' });
      } else {
        setTestFeedback({ channel: 'Browser', ok: false, msg: 'Please allow notifications in your browser address bar.' });
      }
      return;
    }

    if (channel === 'whatsapp' && !otpVerified) {
      setTestFeedback({
        channel: 'WhatsApp',
        ok: false,
        msg: 'Please verify your mobile number with OTP first by clicking "Send Verification OTP".',
      });
      return;
    }

    try {
      const res = await fetch('/api/alerts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTest: true,
          alert: sampleAlert,
          channels: { whatsapp: channel === 'whatsapp', gmail: channel === 'gmail' },
          config: {
            whatsappProvider: settings.whatsappProvider,
            whatsappPhone: settings.whatsappPhone,
            selfhostedUrl: settings.selfhostedUrl,
            callmebotApiKey: settings.callmebotApiKey,
            twilioAccountSid: settings.twilioAccountSid,
            twilioAuthToken: settings.twilioAuthToken,
            gmailTo: settings.gmailTo,
            gmailUser: settings.gmailUser,
            gmailAppPassword: settings.gmailAppPassword,
            originUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        }),
      });
      const data = await res.json();
      const r = channel === 'whatsapp' ? data?.results?.whatsapp : data?.results?.gmail;
      setTestFeedback({
        channel: channel === 'whatsapp' ? 'WhatsApp' : 'Gmail',
        ok: Boolean(r?.ok),
        msg: r?.message || data?.error || 'Unknown response',
      });
    } catch (err: any) {
      setTestFeedback({ channel, ok: false, msg: err?.message || 'Request failed' });
    }
  };

  const handleAddWatchItem = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = symbolInput.trim().toUpperCase();
    if (!sym || selectedTimeframes.length === 0) return;

    const chosenSetups: SmcSetupType[] =
      setupMode === 'ALL' ? [] : setupMode === 'TOP6' ? TOP_6_SMC_SETUPS : customSetups;

    const newItem: SmcAlertWatchItem = {
      id: `smc_watch_${sym}_${Date.now()}`,
      symbol: sym,
      name: nameInput.trim() || sym,
      assetClass,
      market,
      timeframes: [...selectedTimeframes],
      setupTypes: chosenSetups,
      direction,
      minQuality,
      triggerStages: triggerStages.length > 0 ? [...triggerStages] : ['ACTIONABLE', 'TP_HIT', 'SL_HIT'],
      channels: { ...ruleChannels },
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    setWatchlist((prev) => [newItem, ...prev]);
    setSymbolInput('');
    setNameInput('');
  };

  const toggleTimeframe = (tf: string) => {
    setSelectedTimeframes((prev) =>
      prev.includes(tf) ? (prev.length > 1 ? prev.filter((x) => x !== tf) : prev) : [...prev, tf]
    );
  };

  const toggleStage = (st: SmcAlertStage) => {
    setTriggerStages((prev) =>
      prev.includes(st) ? (prev.length > 1 ? prev.filter((x) => x !== st) : prev) : [...prev, st]
    );
  };

  const toggleCustomSetup = (t: SmcSetupType) => {
    setCustomSetups((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const filteredQuick = QUICK_WISH_INSTRUMENTS.filter((q) =>
    quickFilter === 'ALL' ? true : q.assetClass === quickFilter
  );

  const setupCategories = ['Market Structure', 'Order Blocks & Breakers', 'FVG & OTE', 'Liquidity & MTF'] as const;

  return (
    <div className="space-y-6">
      {/* Header Control Bar */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔔</span>
              <h2 className="text-lg font-black tracking-tight text-[var(--theme-card-text)]">
                SMC Selective Instrument Alerts
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                Closed-Candle Verified
              </span>
            </div>
            <p className="text-xs text-[var(--theme-card-text-muted)] mt-1">
              Watch only your chosen Stocks, Indices, Commodities, Forex, and Crypto — receive instant Browser, WhatsApp, and Gmail alerts when SMC setups trigger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label
              title="Continuous background scanning runs automatically while this Terminal tab is open."
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-slate-500/5 text-xs font-semibold cursor-pointer"
            >
              <input
                type="checkbox"
                checked={settings.autoScanEnabled}
                onChange={(e) => setSettings((s) => ({ ...s, autoScanEnabled: e.target.checked }))}
                className="accent-emerald-500"
              />
              <span>Auto-Check ({settings.pollIntervalSec}s)</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold hidden sm:inline">● Live in Tab</span>
            </label>

            <button
              type="button"
              onClick={() => setShowChannelsConfig((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] hover:border-emerald-500/50 text-xs font-bold transition-colors cursor-pointer"
            >
              ⚙️ {showChannelsConfig ? 'Hide' : 'Configure'} Browser / WhatsApp / Gmail
            </button>

            <button
              type="button"
              onClick={runScan}
              disabled={isScanning || watchlist.filter((w) => w.enabled).length === 0}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{isScanning ? '⏳ Scanning...' : '⚡ Scan Watchlist Now'}</span>
            </button>
          </div>
        </div>

        {(scanSummary || lastScanTime) && (
          <div className="mt-3 pt-3 border-t border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--theme-card-text-muted)] mono">
            <span>{scanSummary || 'Ready to evaluate watched instruments.'}</span>
            {lastScanTime && <span>Last check: {lastScanTime}</span>}
          </div>
        )}
      </div>

      {/* Notification Channels Configuration (Browser + WhatsApp + Gmail) */}
      {showChannelsConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Browser Notifications */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm flex items-center gap-1.5">🌐 Browser & Sound</span>
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.browserEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, browserEnabled: e.target.checked }))}
                    className="accent-emerald-500"
                  />
                  <span>Active</span>
                </label>
              </div>
              <p className="text-[11px] text-[var(--theme-card-text-muted)] mb-3">
                Desktop popups + chime whenever MI-007 is open in a browser tab. Permission:{' '}
                <strong className={browserPermission === 'granted' ? 'text-emerald-500' : 'text-amber-500'}>
                  {browserPermission}
                </strong>
              </p>
              <label className="flex items-center gap-2 text-xs mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, soundEnabled: e.target.checked }))}
                  className="accent-emerald-500"
                />
                <span>Play audio chime on new SMC alert</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              {browserPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-500 text-xs font-bold cursor-pointer"
                >
                  Allow Browser Alerts
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSendTest('browser')}
                className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] hover:border-emerald-500/50 text-xs font-bold cursor-pointer"
              >
                🧪 Test Browser
              </button>
            </div>
          </div>

          {/* 2. WhatsApp Notifications with Integrated User Account Registration & Login */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs text-gray-900">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">WhatsApp Alerts</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.whatsappEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, whatsappEnabled: e.target.checked }))}
                    className="accent-black rounded"
                  />
                  <span>Active</span>
                </label>
              </div>

              {userAccount ? (
                /* ── Logged In User Account View ── */
                <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      REGISTERED ACCOUNT
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          logoutUser();
                          setUserAccount(null);
                          setOtpVerified(false);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                      >
                        Sign Out
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete your personal account? This will permanently remove your profile, saved alerts, and WhatsApp verification.')) {
                            deleteUserAccount();
                            setUserAccount(null);
                            setOtpVerified(false);
                            setSettings((s) => ({ ...s, whatsappEnabled: false }));
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700 underline cursor-pointer"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-medium">Name</span>
                      <span className="font-semibold text-gray-900 truncate block">{userAccount.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-medium">Email</span>
                      <span className="font-medium text-gray-700 truncate block">{userAccount.email}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-medium">WhatsApp Mobile</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">{userAccount.phone}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <span>✓</span> Verified &amp; Active
                    </span>
                  </div>
                </div>
              ) : (
                /* ── Registration / Sign In Form (Name, Mobile, Email) ── */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-800">
                      {isSignInMode ? 'Sign In to Account' : 'Create Trader Account'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignInMode(!isSignInMode);
                        setOtpSent(false);
                        setTestFeedback(null);
                      }}
                      className="text-[11px] text-gray-600 hover:text-black font-medium underline cursor-pointer"
                    >
                      {isSignInMode ? 'Need an account? Register' : 'Already have account? Sign In'}
                    </button>
                  </div>

                  {!isSignInMode && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Darshan"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Mobile Number (with Country Code)
                    </label>
                    <input
                      type="text"
                      placeholder="+918778123702"
                      value={settings.whatsappPhone}
                      onChange={(e) => {
                        setSettings((s) => ({ ...s, whatsappPhone: e.target.value }));
                        if (otpVerified) setOtpVerified(false);
                        if (otpSent) setOtpSent(false);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs font-mono focus:outline-none focus:border-gray-500"
                    />
                  </div>

                  {!isSignInMode && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="you@domain.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  )}

                  {otpSent ? (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center space-y-2">
                      <div className="text-xs font-medium text-gray-800">
                        Enter 6-Digit WhatsApp Code
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Sent to <strong>{settings.whatsappPhone || '+918778123702'}</strong>
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="● ● ● ● ● ●"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          className="w-36 text-center px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 text-base font-mono font-bold tracking-widest focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isOtpLoading || otpInput.trim().length !== 6}
                          className="px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-medium cursor-pointer disabled:opacity-40"
                        >
                          {isOtpLoading ? 'Verifying...' : isSignInMode ? 'Sign In' : 'Complete Registration'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleSendOtp('whatsapp')}
                          disabled={isOtpLoading || resendCooldown > 0}
                          className="text-gray-500 hover:text-gray-800 underline text-[10px] cursor-pointer"
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </button>
                        <button
                          type="button"
                          onClick={handleResetOtp}
                          className="text-gray-400 hover:text-red-600 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp('whatsapp')}
                      disabled={isOtpLoading}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span>
                        {isOtpLoading
                          ? 'Sending WhatsApp Code...'
                          : isSignInMode
                          ? 'Send WhatsApp Login Code'
                          : 'Register & Verify WhatsApp'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSendTest('whatsapp')}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium cursor-pointer transition-all mt-2"
            >
              Send Test WhatsApp Alert
            </button>
          </div>

          {/* 3. Gmail / Email Alerts (Unified with Trader Account) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs text-gray-900">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">Gmail Alerts</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.gmailEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, gmailEnabled: e.target.checked }))}
                    className="accent-black rounded"
                  />
                  <span>Active</span>
                </label>
              </div>

              {userAccount ? (
                /* ── Linked Account Email View ── */
                <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      LINKED ACCOUNT EMAIL
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                      ✓ Ready
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-medium">Recipient Email</span>
                    <span className="font-semibold text-gray-900 text-xs truncate block">{userAccount.email}</span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-relaxed pt-1.5 border-t border-gray-200">
                    Trade setups and chart triggers will be delivered to <strong>{userAccount.email}</strong>.
                  </p>
                </div>
              ) : (
                /* ── Manual Recipient Email Input ── */
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Recipient Gmail / Email
                    </label>
                    <input
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={settings.gmailTo || regEmail}
                      onChange={(e) => {
                        setSettings((s) => ({ ...s, gmailTo: e.target.value }));
                        setRegEmail(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    💡 Tip: Registering in the WhatsApp card on the left automatically connects your email here too.
                  </p>
                </div>
              )}

              {/* Optional Advanced SMTP Config Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSmtp(!showAdvancedSmtp)}
                  className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAdvancedSmtp ? '▼' : '▶'}</span>
                  <span>Advanced / Custom SMTP Sender (Optional)</span>
                </button>

                {showAdvancedSmtp && (
                  <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                          Sender Gmail
                        </label>
                        <input
                          type="email"
                          placeholder="Optional if in .env"
                          value={settings.gmailUser}
                          onChange={(e) => setSettings((s) => ({ ...s, gmailUser: e.target.value }))}
                          className="w-full px-2 py-1 rounded border border-gray-300 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                          App Password
                        </label>
                        <input
                          type="password"
                          placeholder="16-char App Password"
                          value={settings.gmailAppPassword}
                          onChange={(e) => setSettings((s) => ({ ...s, gmailAppPassword: e.target.value }))}
                          className="w-full px-2 py-1 rounded border border-gray-300 bg-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSendTest('gmail')}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium cursor-pointer transition-all mt-2"
            >
              Send Test Gmail
            </button>
          </div>
        </div>
      )}

      {testFeedback && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            testFeedback.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <span>
            <strong>{testFeedback.channel}:</strong> {testFeedback.msg}
          </span>
          <button type="button" onClick={() => setTestFeedback(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Add Wish Instrument Form */}
      <form
        onSubmit={handleAddWatchItem}
        className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--theme-card-text)]">
            ➕ Add Wish Instrument to SMC Alerts
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            {(['ALL', 'INDEX', 'COMMODITY', 'FOREX', 'CRYPTO', 'STOCK'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setQuickFilter(cat)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                  quickFilter === cat
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                    : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] hover:text-emerald-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick-Pick Chips */}
        <div className="flex flex-wrap gap-1.5">
          {filteredQuick.map((q) => (
            <button
              key={`${q.symbol}-${q.market}`}
              type="button"
              onClick={() => {
                setSymbolInput(q.symbol);
                setNameInput(q.name);
                setAssetClass(q.assetClass);
                setMarket(q.market);
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold mono cursor-pointer transition-all ${
                symbolInput.toUpperCase() === q.symbol
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                  : 'border-[var(--theme-card-border)] hover:border-emerald-500/40 text-[var(--theme-card-text-muted)]'
              }`}
            >
              {q.symbol}
            </button>
          ))}
        </div>

        {/* Instrument & Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1">
              Symbol (Any Ticker)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. NIFTY, GOLD, BTCUSDT, RELIANCE"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-card-border)] bg-transparent text-xs font-bold mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1">
              Asset Class
            </label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as SmcAlertAssetClass)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-card-border)] bg-transparent text-xs font-semibold"
            >
              <option value="STOCK">Stock</option>
              <option value="INDEX">Index</option>
              <option value="COMMODITY">Commodity</option>
              <option value="FOREX">Forex</option>
              <option value="CRYPTO">Crypto</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1">
              Market
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as 'INDIA' | 'USA' | 'UAE')}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-card-border)] bg-transparent text-xs font-semibold"
            >
              <option value="INDIA">INDIA (NSE)</option>
              <option value="USA">USA / Global</option>
              <option value="UAE">UAE</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1">
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as SmcAlertDirection)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-card-border)] bg-transparent text-xs font-semibold"
            >
              <option value="BOTH">Both (Long & Short)</option>
              <option value="BULLISH">Long Only (Bullish)</option>
              <option value="BEARISH">Short Only (Bearish)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1">
              Min Quality: <span className="text-emerald-500">{minQuality}/100</span>
            </label>
            <input
              type="range"
              min={60}
              max={90}
              step={5}
              value={minQuality}
              onChange={(e) => setMinQuality(Number(e.target.value))}
              className="w-full accent-emerald-500 mt-2"
            />
          </div>
        </div>

        {/* Timeframes + Stages + Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-[var(--theme-card-border)]">
          <div>
            <div className="text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1.5">
              Timeframes to Watch
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SMC_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => toggleTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold mono cursor-pointer ${
                    selectedTimeframes.includes(tf)
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1.5">
              Trigger Stages
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'EARLY', label: 'Wait Pullback' },
                  { id: 'RETEST', label: 'Retest Touched' },
                  { id: 'ACTIONABLE', label: 'Entry Ready' },
                  { id: 'TP_HIT', label: 'TP1 / TP2 Hit' },
                  { id: 'SL_HIT', label: 'SL / Invalidated' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleStage(st.id)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                    triggerStages.includes(st.id)
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                      : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] mb-1.5">
              Deliver Via
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleChannels.browser}
                  onChange={(e) => setRuleChannels((c) => ({ ...c, browser: e.target.checked }))}
                  className="accent-emerald-500"
                />
                <span>🌐 Browser</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleChannels.whatsapp}
                  onChange={(e) => setRuleChannels((c) => ({ ...c, whatsapp: e.target.checked }))}
                  className="accent-emerald-500"
                />
                <span>💬 WhatsApp</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleChannels.gmail}
                  onChange={(e) => setRuleChannels((c) => ({ ...c, gmail: e.target.checked }))}
                  className="accent-emerald-500"
                />
                <span>📧 Gmail</span>
              </label>
            </div>
          </div>
        </div>

        {/* SMC Setups Selection */}
        <div className="pt-2 border-t border-[var(--theme-card-border)] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)]">
              SMC Setups to Alert On
            </span>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'TOP6', label: 'Top 6 High-Conviction' },
                  { id: 'ALL', label: 'All 16 SMC Setups' },
                  { id: 'CUSTOM', label: 'Custom Pick' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSetupMode(m.id)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                    setupMode === m.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {setupMode === 'CUSTOM' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {setupCategories.map((cat) => (
                <div key={cat} className="rounded-xl border border-[var(--theme-card-border)] p-2.5 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-emerald-500">{cat}</div>
                  {SMC_ALERT_SETUP_OPTIONS.filter((s) => s.category === cat).map((opt) => (
                    <label key={opt.type} className="flex items-start gap-1.5 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customSetups.includes(opt.type)}
                        onChange={() => toggleCustomSetup(opt.type)}
                        className="accent-emerald-500 mt-0.5"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!symbolInput.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer transition-all"
          >
            + Add {symbolInput.trim() || 'Instrument'} to Alert Watchlist
          </button>
        </div>
      </form>

      {/* Active Watchlist & Triggered Alerts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Watched Wish Instruments */}
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider">
              📋 Watched Wish Instruments ({watchlist.length})
            </h3>
          </div>
          {watchlist.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--theme-card-text-muted)]">
              No instruments added yet. Pick any Stock, Index, Commodity, Forex, or Crypto above to start monitoring SMC signals.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 transition-all ${
                    item.enabled
                      ? 'border-[var(--theme-card-border)] bg-slate-500/5'
                      : 'border-[var(--theme-card-border)] opacity-55'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black mono text-sm">{item.symbol}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                        {item.assetClass}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--theme-card-text-muted)]">
                        {item.timeframes.join(' • ')}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--theme-card-text-muted)]">
                        Q≥{item.minQuality}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/chart/${encodeURIComponent(item.symbol)}?market=${encodeURIComponent(item.market)}`}
                        className="px-2 py-1 rounded-md border border-[var(--theme-card-border)] hover:border-emerald-500 text-[10px] font-bold"
                      >
                        Chart ↗
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          setWatchlist((prev) =>
                            prev.map((w) => (w.id === item.id ? { ...w, enabled: !w.enabled } : w))
                          )
                        }
                        className="px-2 py-1 rounded-md border border-[var(--theme-card-border)] text-[10px] font-bold cursor-pointer"
                      >
                        {item.enabled ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatchlist((prev) => prev.filter((w) => w.id !== item.id))}
                        className="px-2 py-1 rounded-md border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--theme-card-text-muted)]">
                    <span>
                      Setups:{' '}
                      <strong>
                        {item.setupTypes.length === 0
                          ? 'All 16 SMC'
                          : item.setupTypes.length === TOP_6_SMC_SETUPS.length &&
                            TOP_6_SMC_SETUPS.every((t) => item.setupTypes.includes(t))
                          ? 'Top 6 High-Conviction'
                          : `${item.setupTypes.length} selected`}
                      </strong>{' '}
                      • Dir: <strong>{item.direction}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {item.channels.browser && <span title="Browser">🌐</span>}
                      {item.channels.whatsapp && <span title="WhatsApp">💬</span>}
                      {item.channels.gmail && <span title="Gmail">📧</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Triggered Alerts Feed */}
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider">
              ⚡ Triggered SMC Alerts ({history.length})
            </h3>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-[11px] text-[var(--theme-card-text-muted)] hover:text-rose-400 cursor-pointer"
              >
                Clear Log
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--theme-card-text-muted)]">
              No SMC alerts triggered yet. Add your wish instruments and click <strong>Scan Watchlist Now</strong> (or keep Auto-Check enabled).
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {history.map((al) => {
                const isBull = al.direction === 'BULLISH';
                return (
                  <div
                    key={al.id}
                    className={`rounded-xl border p-3 ${
                      isBull
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            isBull ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {isBull ? '▲ LONG' : '▼ SHORT'}
                        </span>
                        <span className="font-black mono text-sm">{al.symbol}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-[10px] font-bold mono">
                          {al.timeframe}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-500">Q{al.qualityScore}</span>
                      </div>
                      <Link
                        href={`/chart/${encodeURIComponent(al.symbol)}?market=${encodeURIComponent(al.market)}`}
                        className="px-2 py-0.5 rounded-md border border-[var(--theme-card-border)] hover:border-emerald-500 text-[10px] font-bold"
                      >
                        Open Chart ↗
                      </Link>
                    </div>
                    <div className="text-xs font-bold mt-1">
                      {al.setupName}{' '}
                      <span className="text-[10px] font-semibold text-[var(--theme-card-text-muted)]">
                        • {al.statusLabel}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] mono">
                      <span>Entry: <strong>{formatPriceVal(al.entryPrice)}</strong></span>
                      <span className="text-rose-400">SL: <strong>{formatPriceVal(al.stopLoss)}</strong></span>
                      <span className="text-emerald-500">
                        TP1: <strong>{formatPriceVal(al.targetPrice)}</strong> (1:{al.riskReward.toFixed(1)})
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--theme-card-text-muted)]">
                      <span>{new Date(al.triggeredAt).toLocaleString()}</span>
                      <span className="flex items-center gap-2">
                        {al.delivery?.browser && <span>🌐 {al.delivery.browser}</span>}
                        {al.delivery?.whatsapp && (
                          <span title={al.delivery.whatsappMsg}>💬 {al.delivery.whatsapp}</span>
                        )}
                        {al.delivery?.gmail && (
                          <span title={al.delivery.gmailMsg}>📧 {al.delivery.gmail}</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
