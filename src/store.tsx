import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SubmittedProject } from './data/projects';

export type LedgerKind = 'game' | 'course' | 'project' | 'github' | 'adoption' | 'redeem' | 'bonus';

export interface LedgerEntry {
  id: string;
  at: number;
  kind: LedgerKind;
  label: string;
  amount: number;
}

export interface Voucher {
  id: string;
  rewardId: string;
  code: string;
  at: number;
}

export interface AppState {
  name: string;
  ledger: LedgerEntry[];
  coursesDone: string[];
  bestGame: number;
  gamesPlayed: number;
  projects: SubmittedProject[];
  vouchers: Voucher[];
  guardChecks: number;
  crossguardDecisions: number;
  questsDone: string[];
  filterSolved: boolean;
  reflections: Record<string, string>;
}

const initial: AppState = {
  name: 'You',
  ledger: [
    { id: 'welcome', at: Date.now() - 60_000, kind: 'bonus', label: 'Welcome bonus for joining TrustLoop', amount: 100 },
  ],
  coursesDone: [],
  bestGame: 0,
  gamesPlayed: 0,
  projects: [],
  vouchers: [],
  guardChecks: 0,
  crossguardDecisions: 0,
  questsDone: [],
  filterSolved: false,
  reflections: {},
};

const KEY = 'gba-ai-quests-v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...(JSON.parse(raw) as Partial<AppState>) };
  } catch {
    return initial;
  }
}

export interface Toast {
  id: number;
  text: string;
  amount?: number;
}

interface Store {
  state: AppState;
  balance: number;
  earned: number;
  earn: (kind: LedgerKind, label: string, amount: number) => void;
  spend: (label: string, amount: number) => boolean;
  update: (fn: (s: AppState) => AppState) => void;
  reset: () => void;
  toasts: Toast[];
  notify: (text: string, amount?: number) => void;
}

const Ctx = createContext<Store | null>(null);

let uid = 0;
const nextId = () => `${Date.now().toString(36)}-${(uid++).toString(36)}`;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: the demo still works for this visit */
    }
  }, [state]);

  const notify = useCallback((text: string, amount?: number) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text, amount }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const earn = useCallback(
    (kind: LedgerKind, label: string, amount: number) => {
      if (amount <= 0) return;
      setState((s) => ({ ...s, ledger: [{ id: nextId(), at: Date.now(), kind, label, amount }, ...s.ledger] }));
      notify(label, amount);
    },
    [notify],
  );

  const balance = state.ledger.reduce((sum, e) => sum + e.amount, 0);
  const earned = state.ledger.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);

  const spend = useCallback(
    (label: string, amount: number) => {
      if (balance < amount) return false;
      setState((s) => ({
        ...s,
        ledger: [{ id: nextId(), at: Date.now(), kind: 'redeem', label, amount: -amount }, ...s.ledger],
      }));
      notify(label, -amount);
      return true;
    },
    [balance, notify],
  );

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const reset = useCallback(() => setState({ ...initial, ledger: [{ ...initial.ledger[0], at: Date.now() }] }), []);

  const value = useMemo(
    () => ({ state, balance, earned, earn, spend, update, reset, toasts, notify }),
    [state, balance, earned, earn, spend, update, reset, toasts, notify],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

export function voucherCode(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[(h >>> (i * 4)) % alphabet.length];
    h = Math.imul(h ^ (i + 7), 2654435761);
  }
  return `DEMO-${out.slice(0, 4)}-${out.slice(4)}`;
}
