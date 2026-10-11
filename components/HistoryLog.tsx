'use client';
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { currentMonth, dateLabel, goldValue, historyStatistics, money, monthKey, monthLabel, snapshotChanges, sorted, withoutGold, type Snapshot } from '@/lib/finance';

const zeroTolerance = 0.005;

type Props = {
  snapshots: Snapshot[];
  busy: boolean;
  onEdit: (snapshot: Snapshot) => void;
  onDelete: (snapshot: Snapshot) => void;
};

export default function HistoryLog({ snapshots, busy, onEdit, onDelete }: Props) {
  const [month, setMonth] = useState(currentMonth);
  const chronological = useMemo(() => sorted(snapshots), [snapshots]);
  const availableMonths = useMemo(() => [...new Set([currentMonth(), ...chronological.map(s => monthKey(s.date))])].sort().reverse(), [chronological]);
  const previousById = useMemo(() => new Map(chronological.map((s, index) => [s.id, index > 0 ? chronological[index - 1] : undefined] as const)), [chronological]);
  const displayed = useMemo(() => [...chronological].reverse().filter(s => month === 'all' || monthKey(s.date) === month), [chronological, month]);
  const summary = useMemo(() => historyStatistics(chronological, month), [chronological, month]);

  return <section className="readings-screen" aria-labelledby="readings-title">
    <header className="readings-heading">
      <span className="eyebrow">السجل المالي</span>
      <h1 id="readings-title">سجل القراءات</h1>
      <p>كل قراءة محفوظة كما سُجّلت، مع تفاصيل التغيّر عن القراءة السابقة.</p>
    </header>

    <div className="readings-toolbar">
      <div className="readings-summary" aria-label="ملخص القراءات والمصروفات للفترة المحددة">
        <div className="readings-metric readings-metric-count">
          <span>إجمالي القراءات</span>
          <strong dir="ltr">{summary.count}</strong>
        </div>
        <div className="readings-metric readings-metric-spent">
          <span>إجمالي المصروفات</span>
          <strong dir="ltr">{money(summary.spent)}</strong>
        </div>
      </div>
      <label className="readings-month-label">
        <span>عرض القراءات</span>
        <span className="readings-select-wrap">
          <select aria-label="تصفية القراءات حسب الشهر" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="all">جميع الأشهر</option>
            {availableMonths.map(key => <option key={key} value={key}>{monthLabel(key)}</option>)}
          </select>
          <ChevronDown size={17} aria-hidden="true"/>
        </span>
      </label>
    </div>
    {month !== 'all' && <p className="readings-filter-note">{displayed.length} من أصل {chronological.length} قراءة</p>}

    {displayed.length ? <div className="readings-list">
      {displayed.map(item => {
        const before = previousById.get(item.id);
        const delta = before ? withoutGold(item) - withoutGold(before) : null;
        const changes = before ? snapshotChanges(before, item) : [];
        return <article className="reading-card" key={item.id}>
          <div className="reading-card-head">
            <div className="reading-card-date">
              <h2>{dateLabel(item.date)}</h2>
              {item.note && <p className="reading-card-note">{item.note}</p>}
            </div>
            <div className="reading-card-money">
              <strong dir="ltr">{money(withoutGold(item))}</strong>
              <span>ذهب <b dir="ltr">{money(goldValue(item))}</b></span>
              {delta === null ? <small className="reading-delta neutral">أول قراءة</small> :
                <small className={`reading-delta ${delta < -zeroTolerance ? 'negative' : delta > zeroTolerance ? 'positive' : 'neutral'}`}>
                  {delta < -zeroTolerance ? <><TrendingDown size={14}/> صرف <b dir="ltr">{money(Math.abs(delta))}</b></> :
                    delta > zeroTolerance ? <><TrendingUp size={14}/> زيادة <b dir="ltr">{money(delta)}</b></> : 'لا تغيير في الإجمالي'}
                </small>}
            </div>
          </div>
          <div className="reading-card-footer">
            <div className="reading-changes" aria-label="تفصيل تغيّرات الأرصدة">
              {changes.length ? changes.map(change => <span key={change.label} className={`reading-source-chip ${change.delta < 0 ? 'out' : 'in'}`}>
                <span>{change.label}</span><strong dir="ltr">{change.delta > 0 ? '+' : '−'}{money(Math.abs(change.delta))}</strong>
              </span>) : <span className="reading-no-changes">{before ? 'لم تتغير الأرصدة' : 'بداية السجل'}</span>}
            </div>
            <div className="reading-actions">
              <button type="button" onClick={() => onEdit(item)} aria-label={`تعديل قراءة ${dateLabel(item.date)}`} title="تعديل القراءة"><Pencil size={17}/></button>
              <button type="button" className="delete" disabled={busy} onClick={() => onDelete(item)} aria-label={`حذف قراءة ${dateLabel(item.date)}`} title="حذف القراءة"><Trash2 size={17}/></button>
            </div>
          </div>
        </article>;
      })}
    </div> : <div className="readings-empty"><CalendarDays size={30}/><p>لا توجد قراءات مسجّلة في هذه الفترة.</p></div>}
    <p className="readings-explainer">إجمالي المصروفات هو مجموع الانخفاضات الصافية بين القراءات المعروضة وسابقاتها، دون احتساب تغيّر أسعار الذهب أو احتساب الزيادات كمصروفات.</p>
  </section>;
}
