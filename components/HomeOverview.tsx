'use client';
import { ArrowDownRight, ArrowUpRight, Banknote, Building2, CalendarDays, ChevronLeft, Coins, CreditCard, HandCoins, Landmark, Plus, Wallet, Users } from 'lucide-react';
import { currentMonth, dateLabel, goldValue, money, monthLabel, netWorth, number, sumPeople, withoutGold, type Settings, type Snapshot } from '@/lib/finance';

type Monthly = {items:Snapshot[];spent:number;received:number;net:number}|null;
type Props = {
  snapshots:Snapshot[];
  latest:Snapshot|undefined;
  previous:Snapshot|undefined;
  month:Monthly;
  settings:Settings;
  onNew:()=>void;
  onHistory:()=>void;
  onGold:()=>void;
  onEdit:(snapshot:Snapshot)=>void;
};
const todayLabel=()=>new Intl.DateTimeFormat('ar-EG-u-nu-latn',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());

export default function HomeOverview({snapshots,latest,previous,month,settings,onNew,onHistory,onGold,onEdit}:Props){
  const plain=latest?withoutGold(latest):0;
  const full=latest?netWorth(latest):0;
  const change=latest&&previous?plain-withoutGold(previous):null;
  const gold=latest?.gold;
  const budget=settings.monthlyBudget;
  const remaining=budget===null?null:budget-(month?.spent??0);
  const usedPercent=budget!==null&&budget>0?Math.min(100,((month?.spent??0)/budget)*100):0;
  const accounts=[
    {label:'البنك',value:latest?.bank??0,Icon:Landmark},
    {label:'OFII',value:latest?.ofii??0,Icon:Building2},
    {label:'Redotpay',value:latest?.redotpay??0,Icon:CreditCard},
    {label:'كاش',value:latest?.cash??0,Icon:Banknote},
    {label:'ديون لي',value:latest?sumPeople(latest.people):0,Icon:Users},
    {label:'ديون عليّ',value:latest?-sumPeople(latest.liabilities):0,Icon:HandCoins},
  ];
  return <div className="reference-dashboard">
    <header className="overview-welcome">
      <div><h1>أهلًا أحمد <span aria-hidden="true">👋</span></h1><p>{todayLabel()}</p></div>
      <button className="overview-wallet" type="button" onClick={onGold} aria-label="عرض محفظة الذهب" title="محفظة الذهب"><Wallet size={22}/></button>
    </header>

    <section className="overview-hero" aria-label="ملخص أموالك">
      <p className="overview-hero-label">إجمالي ما أملك بدون الذهب</p>
      <strong className="overview-hero-amount" dir="ltr">{money(plain)}</strong>
      {change!==null&&<div className={`overview-change ${change<0?'negative':'positive'}`}>
        {change<0?<ArrowDownRight size={19}/>:<ArrowUpRight size={19}/>}<span>{change<0?'نقص':'زيادة'} {money(Math.abs(change))} منذ آخر قراءة</span>
      </div>}
      <div className="overview-hero-full"><span>مع الذهب</span><strong dir="ltr">{money(full)}</strong></div>
      <p className="overview-hero-date">{latest?`آخر قراءة: ${dateLabel(latest.date)}`:'لم تُسجّل قراءة بعد'}</p>
      <button className="overview-new" onClick={onNew} type="button"><Plus size={27}/> إضافة قراءة جديدة</button>
    </section>

    <section className="overview-section" aria-labelledby="accounts-heading">
      <h2 id="accounts-heading">أموالي (بدون الذهب)</h2>
      <div className="overview-accounts">
        {accounts.map(({label,value,Icon})=><div className="overview-account" key={label}>
          <Icon size={26} strokeWidth={1.9} aria-hidden="true"/>
          <span>{label}</span>
          <strong dir="ltr" className={value<0?'amount-negative':''}>{money(value)}</strong>
        </div>)}
      </div>
    </section>

    <section className="overview-section overview-gold-section" aria-labelledby="gold-heading">
      <div className="overview-section-heading"><h2 id="gold-heading">مدخرات الذهب (منفصلة)</h2><button className="overview-link" onClick={onGold} type="button">تفاصيل <ChevronLeft size={17}/></button></div>
      <button className="overview-gold-card" onClick={onGold} type="button" aria-label="تفاصيل مدخرات الذهب">
        <span className="overview-gold-icon"><Coins size={26}/></span>
        <span className="overview-gold-description"><span>{gold?`${number(gold.grams)} جم · ${gold.karat}k`:'لا توجد مدخرات مسجلة'}</span><strong dir="ltr">{money(latest?goldValue(latest):0)}</strong></span>
        <span className="overview-gold-price" dir="ltr">{money(gold?.pricePerGram??0)}/جم</span>
      </button>
      <p className="overview-help">مدخرات الذهب لا تُحتسب ضمن المصروف — تغيّر سعرها لا يعني صرفًا أو دخلًا.</p>
    </section>

    <section className="overview-month-card" aria-label="مصروف الشهر">
      <h2>مصروف {monthLabel(currentMonth())} المحسوب</h2>
      <strong className="overview-spent" dir="ltr">{money(month?.spent??0)}</strong>
      <p>محسوب من فروقات {month?.items.length??0} قراءات — دون تسجيل مصروفات يدوية.</p>
      <div className="overview-gained">زيادات في نفس الشهر: <span dir="ltr">{money(month?.received??0)}</span></div>
    </section>

    {budget!==null&&<section className="overview-budget-card" aria-label="الميزانية الشهرية">
      <div className="overview-budget-head"><span>المتبقي من الميزانية</span><span dir="ltr">{money(budget)}</span></div>
      <strong className={remaining!==null&&remaining<0?'overview-budget-negative':'overview-budget-positive'} dir="ltr">{money(remaining??0)}</strong>
      <div className="overview-progress" role="progressbar" aria-label="استخدام الميزانية الشهرية" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usedPercent)}><span style={{width:`${usedPercent}%`}}/></div>
    </section>}

    <section className="overview-section overview-recent" aria-labelledby="recent-heading">
      <div className="overview-section-heading"><h2 id="recent-heading">آخر القراءات</h2><button className="overview-link" type="button" onClick={onHistory}>عرض الكل <ChevronLeft size={17}/></button></div>
      {snapshots.length===0?<div className="overview-empty">لا توجد قراءات بعد. اضغط إضافة قراءة جديدة للبدء.</div>:<div className="overview-recent-list">
        {[...snapshots].reverse().slice(0,4).map(s=>{
          const idx=snapshots.findIndex(x=>x.id===s.id);
          const previousSnapshot=idx>0?snapshots[idx-1]:undefined;
          const delta=previousSnapshot?withoutGold(s)-withoutGold(previousSnapshot):null;
          return <button className="overview-reading" type="button" key={s.id} onClick={()=>onEdit(s)} aria-label={`تعديل قراءة ${dateLabel(s.date)}`}>
            <div className="overview-reading-info"><strong>{dateLabel(s.date)}</strong>{s.note&&<small title={s.note}>{s.note}</small>}</div>
            <div className="overview-reading-totals"><strong dir="ltr">{money(withoutGold(s))}</strong>{delta!==null&&<small className={delta<0?'down':'up'}>{delta<0?'صرف':'زيادة'} <span dir="ltr">{money(Math.abs(delta))}</span></small>}</div>
          </button>;
        })}
      </div>}
    </section>
    <p className="overview-data-note"><CalendarDays size={15}/> جميع الأرقام مأخوذة من قراءاتك المسجلة، دون قيم تجريبية.</p>
  </div>;
}
