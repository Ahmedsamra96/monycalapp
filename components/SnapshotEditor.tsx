'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Coins, Minus, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { money, netWorth, sorted, sumPeople, withoutGold, type Person, type Settings, type Snapshot } from '@/lib/finance';

type Payload = Omit<Snapshot, 'id'>;
type DebtSide = 'people' | 'liabilities';
const uuid = () => crypto.randomUUID();
const round = (value: number, precision = 2) => Number(value.toFixed(precision));
const clonePeople = (items: Person[] = []) => items.map(p => ({...p, entries: p.entries.map(e => ({...e}))}));
const copySnapshot = (s: Snapshot | undefined, settings: Settings): Payload => s ? {
  date: s.date, bank: s.bank, ofii: s.ofii, redotpay: s.redotpay ?? 0, cash: s.cash,
  people: clonePeople(s.people), liabilities: clonePeople(s.liabilities), gold: {...s.gold}, note: s.note ?? ''
} : {
  date: new Date().toISOString(), bank: 0, ofii: 0, redotpay: 0, cash: 0,
  people: [], liabilities: [], gold: {grams: settings.defaultGrams, karat: settings.defaultKarat, pricePerGram: 0}, note: ''
};

function AmountInput({label, value, onChange, unit='€', digits=2}: {
  label: string; value: number; onChange: (value:number)=>void; unit?:string; digits?:number;
}) {
  const [raw, setRaw] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {if (document.activeElement !== ref.current) setRaw(String(value));}, [value]);
  return <label className="wizard-field"><span>{label}</span><span className="wizard-money-field">
    <input ref={ref} inputMode="decimal" type="text" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" value={raw}
      onChange={e=>{
        const next = e.target.value.replace(',', '.').replace(/[^0-9.]/g,'');
        if ((next.match(/\./g) || []).length > 1) return;
        setRaw(next);
        const n = Number(next);
        if (next !== '' && Number.isFinite(n)) onChange(round(n,digits));
        if (next === '') onChange(0);
      }}
      onBlur={()=>setRaw(String(value))}
      aria-label={label}/><b>{unit}</b>
  </span></label>;
}

function DebtInputs({people, onChange}: {people: Person[]; onChange:(value:Person[])=>void}) {
  const update = (id:string, patch:Partial<Person>) => onChange(people.map(p=>p.id===id?{...p,...patch}:p));
  return <div className="wizard-people-list">
    {people.length===0&&<p className="wizard-empty-debts">لا توجد أسماء في هذا القسم بعد.</p>}
    {people.map((p)=><section className="wizard-person" key={p.id}>
      <div className="wizard-person-top">
        <div className="wizard-person-avatar" aria-hidden="true">{p.name.trim().slice(0,2)||'؟'}</div>
        <input placeholder="اسم الشخص" aria-label="اسم الشخص" value={p.name} maxLength={150} onChange={e=>update(p.id,{name:e.target.value})}/>
        <button type="button" className="wizard-icon-danger" aria-label={`حذف ${p.name||'الشخص'}`} onClick={()=>onChange(people.filter(x=>x.id!==p.id))}><Trash2 size={19}/></button>
      </div>
      <div className="wizard-person-entries">{p.entries.map(en=><div className="wizard-person-entry" key={en.id}>
        <span className="wizard-person-currency">€</span>
        <input aria-label="قيمة المبلغ" inputMode="decimal" type="number" min="0" step="0.01" value={en.amount} onChange={e=>update(p.id,{entries:p.entries.map(x=>x.id===en.id?{...x,amount:round(Math.max(0,Number(e.target.value)||0))}:x)})}/>
        <button type="button" className="wizard-icon-remove" aria-label="حذف المبلغ" onClick={()=>update(p.id,{entries:p.entries.filter(x=>x.id!==en.id)})}><X size={19}/></button>
      </div>)}</div>
      <div className="wizard-person-foot"><button type="button" className="wizard-add-entry" onClick={()=>update(p.id,{entries:[...p.entries,{id:uuid(),amount:0}]})}><Plus size={16}/> مبلغ آخر</button><strong dir="ltr">{money(sumPeople([p]))}</strong></div>
    </section>)}
    <button type="button" className="wizard-add-person" onClick={()=>onChange([...people,{id:uuid(),name:'',entries:[{id:uuid(),amount:0}]}])}><Plus size={23}/> إضافة شخص</button>
  </div>;
}

const titles = ['الأرصدة','الديون','الذهب','المراجعة'];
const balances: {field:'bank'|'ofii'|'redotpay'|'cash';label:string}[] = [
  {field:'bank',label:'رصيد البنك'}, {field:'ofii',label:'رصيد OFII'},
  {field:'redotpay',label:'محفظة Redotpay'}, {field:'cash',label:'الكاش في اليد'}
];

export default function SnapshotEditor({item,latest,snapshots,settings,onClose,onSave,busy}: {
  item?: Snapshot; latest?: Snapshot; snapshots?: Snapshot[]; settings: Settings;
  onClose:()=>void; onSave:(data:Payload)=>Promise<void>; busy:boolean;
}) {
  const [form,setForm] = useState<Payload>(()=>copySnapshot(item??latest,settings));
  const [step,setStep] = useState(0);
  const [debtSide,setDebtSide] = useState<DebtSide>('people');
  const [error,setError] = useState('');
  const [goldBusy,setGoldBusy] = useState(false);
  const [goldHint,setGoldHint] = useState('');
  const autoGold = useRef(false);
  const [date,setDate] = useState(()=>{
    const d = new Date(item?.date ?? new Date().toISOString());
    return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  });
  const patch = (partial:Partial<Payload>) => setForm(current=>({...current,...partial}));
  const draft: Snapshot = {...form,id:item?.id??'preview'};
  const prev = useMemo(()=>{
    if (!item) return latest;
    if (!snapshots) return undefined;
    const ordered = sorted(snapshots);
    const index = ordered.findIndex(s=>s.id===item.id);
    return index>0?ordered[index-1]:undefined;
  },[item,latest,snapshots]);
  const delta = prev?withoutGold(draft)-withoutGold(prev):0;
  const lines = useMemo(()=>{
    if (!prev)return [];
    return [
      {name:'البنك',change:form.bank-prev.bank},
      {name:'OFII',change:form.ofii-prev.ofii},
      {name:'Redotpay',change:form.redotpay-prev.redotpay},
      {name:'الكاش',change:form.cash-prev.cash},
      {name:'ديون لي',change:sumPeople(form.people)-sumPeople(prev.people)},
      {name:'ديون عليّ',change:sumPeople(prev.liabilities)-sumPeople(form.liabilities)}
    ].filter(x=>Math.abs(x.change)>0.004);
  },[form,prev]);

  const refreshGold = useCallback(async (silent=false)=>{
    setGoldBusy(true);setGoldHint('');
    try {
      const res=await fetch(`/api/gold-live?karat=${form.gold.karat}`,{cache:'no-store'});
      const body=await res.json();
      if (!res.ok || !(Number(body.pricePerGram)>0))throw Error(body?.error||'تعذّر جلب السعر الآن');
      setForm(current=>({...current,gold:{...current.gold,pricePerGram:Number(body.pricePerGram)}}));
      if (!silent)setGoldHint('تم جلب السعر. سيُحفظ فقط بعد تأكيد القراءة.');
    } catch(e) {
      if(!silent)setGoldHint(e instanceof Error?e.message:'تعذّر جلب السعر. يمكنك إدخاله يدويًا.');
    } finally {setGoldBusy(false);}
  },[form.gold.karat]);
  useEffect(()=>{
    if(step===2 && !item && !autoGold.current){autoGold.current=true;void refreshGold(true);}
  },[step,item,refreshGold]);
  useEffect(()=>{
    const before=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=before;};
  },[]);
  async function save(){
    if([...form.people,...form.liabilities].some(p=>!p.name.trim()||p.entries.some(e=>!Number.isFinite(e.amount)||e.amount<0))){
      setError('أدخل اسمًا ومبالغ صحيحة لكل شخص أو احذف الصف الفارغ.');setStep(1);return;
    }
    if ([form.bank,form.ofii,form.redotpay,form.cash,form.gold.grams,form.gold.pricePerGram].some(n=>!Number.isFinite(n)||n<0)){
      setError('يرجى التأكد من صحة جميع المبالغ.');return;
    }
    if (!item && !Number.isFinite(new Date(date).getTime())) {setError('يرجى اختيار تاريخ صالح.');return;}
    try{setError('');await onSave({...form,date:item?.date??new Date(date).toISOString()});}
    catch(e){setError(e instanceof Error?e.message:'تعذّر حفظ القراءة.');}
  }
  return <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label={item?'تعديل قراءة':'قراءة جديدة'}>
    <div className="wizard-sheet" dir="rtl">
      <header className="wizard-header">
        <button type="button" className="wizard-close" aria-label="إغلاق" onClick={onClose}><X size={24}/></button>
        <div className="wizard-heading"><h2>{item?'تعديل قراءة':'قراءة جديدة'}</h2><p>خطوة {step+1} من 4 · {titles[step]}</p></div>
        <strong className="wizard-running-total" dir="ltr">{money(withoutGold(draft))}</strong>
      </header>
      <div className="wizard-progress" aria-label={`الخطوة ${step+1} من 4`}>
        {titles.map((title,i)=><button key={title} type="button" aria-label={`انتقل إلى ${title}`} aria-current={step===i?'step':undefined} className={i<=step?'active':''} onClick={()=>{setStep(i);setError('');}}/>)}
      </div>
      <div className="wizard-content" key={step}>
        {step===0&&<><p className="wizard-instructions">اكتب المبالغ الحالية كما هي الآن — ليست مصروفات، بل رصيد اللحظة.</p>
          {balances.map(({field,label})=><AmountInput key={field} label={label} value={form[field]} onChange={n=>patch({[field]:n})}/>)}
        </>}
        {step===1&&<><p className="wizard-instructions">سجّل الأموال المستحقة لك أو التي عليك، مع تفاصيل كل شخص.</p>
          <div className="wizard-debt-switch" role="group" aria-label="نوع الدين"><button type="button" className={debtSide==='people'?'selected':''} onClick={()=>setDebtSide('people')}>ديون لي</button><button type="button" className={debtSide==='liabilities'?'selected':''} onClick={()=>setDebtSide('liabilities')}>ديون عليّ</button></div>
          <p className="wizard-debt-description">{debtSide==='people'?'الفلوس اللي عند الناس ولسه ما رجعتش لك.':'المبالغ التي عليك دفعها وتُخصم من صافي أموالك.'}</p>
          <DebtInputs people={form[debtSide]} onChange={value=>patch({[debtSide]:value})}/>
          <div className="wizard-debt-total"><span>إجمالي {debtSide==='people'?'الديون لي':'الديون عليّ'}</span><strong dir="ltr">{money(sumPeople(form[debtSide]))}</strong></div>
        </>}
        {step===2&&<>
          <AmountInput label="الجرامات" unit="جم" digits={4} value={form.gold.grams} onChange={n=>patch({gold:{...form.gold,grams:n}})}/>
          <div className="wizard-field"><span>العيار</span><div className="wizard-karats" role="group" aria-label="عيار الذهب">{[24,22,21,18].map(k=><button type="button" key={k} className={k===form.gold.karat?'selected':''} onClick={()=>patch({gold:{...form.gold,karat:k}})}>{k}k</button>)}</div></div>
          <AmountInput label="سعر الجرام" value={form.gold.pricePerGram} onChange={n=>patch({gold:{...form.gold,pricePerGram:n}})}/>
          <p className="wizard-help">يمكن جلب السعر المباشر حسب العيار، أو تعديله يدويًا. عند تعديل قراءة قديمة لا نغيّر سعرها التاريخي تلقائيًا.</p>
          <button className="wizard-gold-refresh" type="button" disabled={goldBusy} onClick={()=>void refreshGold()}><RefreshCw size={21} className={goldBusy?'spin':''}/>{goldBusy?'جاري جلب السعر…':'جلب السعر المباشر'}</button>
          {goldHint&&<p className="wizard-help" role="status">{goldHint}</p>}
          <div className="wizard-gold-total"><span>قيمة الذهب</span><strong dir="ltr">{money(form.gold.grams*form.gold.pricePerGram)}</strong><Coins size={23}/></div>
        </>}
        {step===3&&<><div className="wizard-review-hero"><span>إجمالي القراءة بدون الذهب</span><strong dir="ltr">{money(withoutGold(draft))}</strong>
          <span className={`wizard-review-delta ${delta<0?'down':delta>0?'up':''}`}>{!prev?<><Minus size={17}/> أول قراءة</>:delta===0?<><Minus size={17}/> لا تغيير عن القراءة السابقة</>:delta>0?<><TrendingUp size={19}/> زيادة {money(delta)}</>:<><TrendingDown size={19}/> صرف {money(Math.abs(delta))}</>}</span>
          <div className="wizard-review-with-gold"><span>مع الذهب</span><strong dir="ltr">{money(netWorth(draft))}</strong></div></div>
          <p className="wizard-help">المصروف يُحسب من الأصول بدون الذهب فقط؛ قيمة الذهب تتغيّر مع سعر السوق.</p>
          <div className="wizard-diff-list">{lines.length?lines.map(line=><div key={line.name}><span>{line.name}</span><strong className={line.change<0?'negative':'positive'} dir="ltr">{line.change>0?'+':'−'} {money(Math.abs(line.change))}</strong></div>):<p>لا يوجد أي تغيير في الأرصدة.</p>}</div>
          {!item&&<details className="wizard-date-details"><summary>تعديل تاريخ القراءة <ChevronDown size={16}/></summary><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} aria-label="تاريخ القراءة"/></details>}
          <label className="wizard-notes"><textarea placeholder="ملاحظة اختيارية… مثال: اشتريت حبر، دفعت 20 يورو" rows={3} maxLength={2000} value={form.note??''} onChange={e=>patch({note:e.target.value})}/></label>
          <p className="wizard-help">الملاحظة اختيارية ولا تدخل في حساب المصروف — الحساب يعتمد على فرق المجاميع فقط.</p>
        </>}
      </div>
      {error&&<div className="wizard-error" role="alert">{error}</div>}
      <footer className="wizard-footer">
        {step>0&&<button type="button" disabled={busy} className="wizard-back" onClick={()=>{setStep(x=>x-1);setError('');}}>رجوع <ArrowRight size={18}/></button>}
        <button type="button" disabled={busy||goldBusy} className="wizard-next" onClick={()=>step===3?void save():setStep(x=>x+1)}>{busy?'جاري الحفظ...':step===3?item?'حفظ التعديل':'حفظ القراءة':'التالي'}{step===3?<Check size={21}/>:<ArrowLeft size={21}/>}</button>
      </footer>
    </div>
  </div>;
}
