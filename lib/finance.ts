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
export const sorted = (list: Snapshot[]) => [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
export const monthKey = (date: string) => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const currentMonth = () => monthKey(new Date().toISOString());
export const money = (n: number) => new Intl.NumberFormat('ar-EG-u-nu-latn', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
export const number = (n: number, digits = 2) => new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: digits }).format(n);
export const dateLabel = (v: string) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
export const monthLabel = (v: string) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(`${v}-01T12:00:00`));
export const monthStatistics = (list: Snapshot[], key: string) => {
  const items = sorted(list).filter(x => monthKey(x.date) === key);
  if (!items.length) return null;
  let spent = 0, received = 0;
  for (let i = 1; i < items.length; i++) {
    const diff = withoutGold(items[i]) - withoutGold(items[i-1]);
    if (diff < 0) spent -= diff; else received += diff;
  }
  return { items, spent, received, net: withoutGold(items[items.length - 1]) - withoutGold(items[0]) };
};

// JSON files contain no financial data: generate CSV only in the user's browser.
export function toCSV(list: Snapshot[]): string {
  const rows: (string | number)[][] = [
    ['التاريخ','البنك','OFII','Redotpay','النقد','ديون لي','ديون علي','الذهب (جرام)','عيار الذهب','سعر الجرام','بدون ذهب','الذهب','الصافي','ملاحظات'],
    ...sorted(list).map(s => [s.date, s.bank, s.ofii, s.redotpay, s.cash, sumPeople(s.people), sumPeople(s.liabilities), s.gold.grams, s.gold.karat, s.gold.pricePerGram, withoutGold(s), goldValue(s), netWorth(s), s.note || ''])
  ];
  return '\uFEFF' + rows.map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
}
