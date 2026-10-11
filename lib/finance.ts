export type Entry = { id: string; amount: number; note?: string };
export type Person = { id: string; name: string; entries: Entry[] };
export type Gold = { grams: number; karat: number; pricePerGram: number };
export type Snapshot = {
  id: string;
  date: string;
  bank: number;
  ofii: number;
  redotpay: number;
  cash: number;
  people: Person[];
  liabilities: Person[];
  gold: Gold;
  note?: string;
};
export type Price = { id: string; date: string; pricePerGram: number };
export type Settings = { monthlyBudget: number | null; defaultKarat: number; defaultGrams: number; onboarded: boolean };
export type AppData = { snapshots: Snapshot[]; goldPrices: Price[]; settings: Settings };

export const sumPeople = (items: Person[] = []) => items.reduce((total, p) => total + p.entries.reduce((v, e) => v + e.amount, 0), 0);
export const liquid = (s: Snapshot) => s.bank + s.ofii + s.redotpay + s.cash;
export const goldValue = (s: Snapshot) => s.gold.grams * s.gold.pricePerGram;
export const withoutGold = (s: Snapshot) => liquid(s) + sumPeople(s.people) - sumPeople(s.liabilities);
export const netWorth = (s: Snapshot) => withoutGold(s) + goldValue(s);

/**
 * Budget-only balance change between readings.
 *
 * Debt principal is part of net worth (withoutGold), but is NOT spending or
 * income. Ignore changes in the receivables/payables ledger itself. A matching
 * cash/bank movement can be a loan payout, borrowing or debt settlement; omit
 * that transfer as well, up to the matching change in debt principal.
 *
 * This is a best-effort estimate from balance snapshots, not a transaction
 * ledger: unrelated same-direction transfers between readings cannot always
 * be disambiguated.
 */
export function budgetBalanceChange(before: Snapshot, current: Snapshot): number {
  const cashChange = liquid(current) - liquid(before);
  const receivableChange = sumPeople(current.people) - sumPeople(before.people);
  const payableChange = sumPeople(current.liabilities) - sumPeople(before.liabilities);
  // Lending/receiving back a receivable moves cash opposite the asset.
  // Taking on/repaying a payable moves cash with the liability.
  const debtCashMovement = payableChange - receivableChange;
  const matchedTransfer = cashChange * debtCashMovement > 0
    ? Math.sign(cashChange) * Math.min(Math.abs(cashChange), Math.abs(debtCashMovement))
    : 0;
  return Math.round((cashChange - matchedTransfer) * 100) / 100;
}

/** Which balance sources changed between two recorded snapshots (gold-price changes are excluded). */
export function snapshotChanges(before: Snapshot, current: Snapshot): {label:string,delta:number}[] {
  const changes = [
    {label:'البنك',delta:current.bank-before.bank},
    {label:'OFII',delta:current.ofii-before.ofii},
    {label:'Redotpay',delta:current.redotpay-before.redotpay},
    {label:'كاش',delta:current.cash-before.cash},
    {label:'ديون لي',delta:sumPeople(current.people)-sumPeople(before.people)},
    // An increased liability is a decrease in the net balance.
    {label:'ديون عليّ',delta:sumPeople(before.liabilities)-sumPeople(current.liabilities)},
  ];
  return changes.filter(x=>Math.abs(x.delta)>=0.005);
}

export const sorted = (list: Snapshot[]) => [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
export const monthKey = (date: string) => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const currentMonth = () => monthKey(new Date().toISOString());
export const money = (n: number) => new Intl.NumberFormat('ar-EG-u-nu-latn', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
export const number = (n: number, digits = 2) => new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: digits }).format(n);
export const dateLabel = (v: string) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
export const monthLabel = (v: string) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(`${v}-01T12:00:00`));
export const monthStatistics = (list: Snapshot[], key: string) => {
  const all = sorted(list);
  const items = all.filter(x => monthKey(x.date) === key);
  if (!items.length) return null;
  let spent = 0, received = 0;
  for (let i = 1; i < all.length; i++) {
    if (monthKey(all[i].date) !== key) continue;
    const diff = budgetBalanceChange(all[i - 1], all[i]);
    if (diff < -0.005) spent -= diff;
    else if (diff > 0.005) received += diff;
  }
  spent = Math.round(spent * 100) / 100;
  received = Math.round(received * 100) / 100;
  return { items, spent, received, net: Math.round((received - spent) * 100) / 100 };
};

/** Totals for a selected history period. Compare each reading to the previous
 * recorded reading, including when that previous reading is in another month.
 * Exclude gold and debt-principal changes / matching debt cash transfers.
 */
export function historyStatistics(list: Snapshot[], month: string): {count: number; spent: number} {
  const snapshots = sorted(list);
  let count = 0;
  let spent = 0;
  for (let i = 0; i < snapshots.length; i++) {
    if (month !== 'all' && monthKey(snapshots[i].date) !== month) continue;
    count++;
    if (i === 0) continue;
    const delta = budgetBalanceChange(snapshots[i - 1], snapshots[i]);
    if (delta < -0.005) spent -= delta;
  }
  return { count, spent: Math.round(spent * 100) / 100 };
}

// JSON files contain no financial data: generate CSV only in the user's browser.
export function toCSV(list: Snapshot[]): string {
  const rows: (string | number)[][] = [
    ['التاريخ','البنك','OFII','Redotpay','النقد','ديون لي','ديون علي','الذهب (جرام)','عيار الذهب','سعر الجرام','بدون ذهب','الذهب','الصافي','ملاحظات'],
    ...sorted(list).map(s => [s.date, s.bank, s.ofii, s.redotpay, s.cash, sumPeople(s.people), sumPeople(s.liabilities), s.gold.grams, s.gold.karat, s.gold.pricePerGram, withoutGold(s), goldValue(s), netWorth(s), s.note || ''])
  ];
  return '\uFEFF' + rows.map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
}
