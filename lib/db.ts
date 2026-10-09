import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { AppData, Price, Settings, Snapshot } from './finance';

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY on the server');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function fromSnapshotRow(r: Record<string, unknown>): Snapshot {
  return {
    id: String(r.id), date: String(r.recorded_at),
    bank: Number(r.bank ?? 0), ofii: Number(r.ofii ?? 0), redotpay: Number(r.redotpay ?? 0), cash: Number(r.cash ?? 0),
    people: Array.isArray(r.people) ? r.people : [], liabilities: Array.isArray(r.liabilities) ? r.liabilities : [],
    gold: { grams: Number(r.gold_grams ?? 0), karat: Number(r.gold_karat ?? 24), pricePerGram: Number(r.gold_price_per_gram ?? 0) },
    ...(r.note == null ? {} : { note: String(r.note) })
  };
}
export function toSnapshotRow(s: Omit<Snapshot, 'id'>) {
  return {
    recorded_at: s.date, bank: s.bank, ofii: s.ofii, redotpay: s.redotpay, cash: s.cash,
    people: s.people, liabilities: s.liabilities, gold_grams: s.gold.grams, gold_karat: s.gold.karat,
    gold_price_per_gram: s.gold.pricePerGram, note: s.note ?? null
  };
}
async function allRows(table: 'snapshots' | 'gold_prices') {
  const client = db();
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 20000; offset += pageSize) {
    const { data, error } = await client.from(table).select('*').order('recorded_at', { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) return rows;
  }
  throw new Error('Too many rows, please implement pagination');
}
export async function loadData(): Promise<AppData> {
  const client = db();
  const [snapshots, goldPrices, settingResult] = await Promise.all([
    allRows('snapshots'), allRows('gold_prices'), client.from('app_settings').select('*').eq('id', 'default').maybeSingle()
  ]);
  if (settingResult.error) throw settingResult.error;
  const s = settingResult.data;
  const settings: Settings = s ? {
    monthlyBudget: s.monthly_budget == null ? null : Number(s.monthly_budget),
    defaultKarat: Number(s.default_karat), defaultGrams: Number(s.default_grams), onboarded: !!s.onboarded
  } : { monthlyBudget: null, defaultKarat: 24, defaultGrams: 0, onboarded: false };
  return {
    snapshots: snapshots.map(fromSnapshotRow),
    goldPrices: goldPrices.map(r => ({ id: String(r.id), date: String(r.recorded_at), pricePerGram: Number(r.price_per_gram) } as Price)),
    settings
  };
}
