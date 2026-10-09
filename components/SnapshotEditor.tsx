'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, X } from 'lucide-react';
import { money, netWorth, sumPeople, withoutGold, type Person, type Snapshot, type Settings } from '@/lib/finance';

type Payload = Omit<Snapshot, 'id'>;
const id = () => crypto.randomUUID();
const clonePeople = (items: Person[]) => items.map(p => ({...p, entries: p.entries.map(e => ({...e}))}));
const clone = (s: Snapshot | undefined, settings: Settings): Payload => s ? {
  date: s.date, bank: s.bank, ofii: s.ofii, redotpay: s.redotpay,
  cash: s.cash, people: clonePeople(s.people), liabilities: clonePeople(s.liabilities),
  gold: {...s.gold}, note: s.note ?? ''
} : {date: new Date().toISOString(), bank: 0, ofii: 0, redotpay: 0, cash: 0,
  people: [], liabilities: [], gold: {grams: settings.defaultGrams, karat: settings.defaultKarat, pricePerGram: 0}, note: ''};
const round2 = (v: number) => Math.round((v + Number.EPSILON)*100)/100;
function NumberInput({label, value, onChange, unit='€'}: {label:string,value:number,onChange:(n:number)=>void,unit?:string}) {
  return <label className="field"><span>{label}</span><div className="number-input"><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={e=>onChange(round2(Number(e.target.value)))} /><b>{unit}</b></div></label>;
}
function PeopleEditor({title,description,value,onChange}: {title:string,description:string,value:Person[],onChange:(v:Person[])=>void}) {
  const add = () => onChange([...value,{id:id(),name:'',entries:[{id:id(),amount:0}]}]);
  return <div className="stack-sm"><div><h3 className="section-title">{title}</h3><p className="muted small">{description}</p></div>
    {value.map((p,i)=><div className="person-editor" key={p.id}><div className="inline-fields"><input aria-label="اسم الشخص" placeholder="اسم الشخص" value={p.name} onChange={e=>onChange(value.map((v,n)=>n===i?{...v,name:e.target.value}:v))}/><button aria-label="حذف الشخص" type="button" className="icon-button dangerous" onClick={()=>onChange(value.filter((_,n)=>n!==i))}><Trash2 size={17}/></button></div>
      {p.entries.map((en,j)=><div key={en.id} className="inline-fields"><div className="number-input grow"><input aria-label="قيمة الدين" type="number" min="0" step="0.01" value={en.amount} onChange={e=>onChange(value.map((v,n)=>n!==i?v:{...v,entries:v.entries.map((x,m)=>m===j?{...x,amount:round2(Number(e.target.value))}:x)}))}/><b>€</b></div><button type="button" className="icon-button" aria-label="حذف مبلغ" onClick={()=>onChange(value.map((v,n)=>n===i?{...v,entries:v.entries.filter((_,m)=>m!==j)}:v))}><X size={17}/></button></div>)}
      <div className="person-footer"><strong>{money(p.entries.reduce((s,e)=>s+e.amount,0))}</strong><button type="button" className="link-button" onClick={()=>onChange(value.map((v,n)=>n===i?{...v,entries:[...v.entries,{id:id(),amount:0}]}:v))}><Plus size={15}/> مبلغ آخر</button></div>
    </div>)}
    <button className="button secondary full" type="button" onClick={add}><Plus size={18}/> إضافة شخص</button>
    <div className="split-line"><span>المجموع</span><strong>{money(sumPeople(value))}</strong></div>
  </div>;
}
export default function SnapshotEditor({item,latest,settings,onClose,onSave,busy}: {item?:Snapshot,latest?:Snapshot,settings:Settings,onClose:()=>void,onSave:(data:Payload)=>Promise<void>,busy:boolean}) {
  const [form,setForm] = useState<Payload>(()=>clone(item||latest,settings));
  const [step,setStep]=useState(0);
  const [error,setError]=useState('');
  const [date,setDate] = useState(()=>{const d=new Date(item?.date||new Date().toISOString());const offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,16)});
  const prev=useMemo(()=>{ if(!item) return latest; return undefined; },[item,latest]);
  const draft = {...form,id:item?.id||'draft'};
  const change = (patch:Partial<Payload>)=>setForm(f=>({...f,...patch}));
  const save = async()=>{
    if([...form.people,...form.liabilities].some(p=>!p.name.trim())) {setError('أدخل اسمًا لكل شخص أو احذف الصف الفارغ');setStep(1);return;}
    if([form.bank,form.ofii,form.redotpay,form.cash,form.gold.grams,form.gold.pricePerGram].some(n=>!Number.isFinite(n)||n<0)) {setError('تحقق من الأرقام: يجب أن تكون أرقامًا صالحة وغير سالبة');return;}
    try {setError('');await onSave({...form,date:item?.date||new Date(date).toISOString()});}catch(e){setError(e instanceof Error?e.message:'تعذّر الحفظ');}
  };
  return <div className="overlay" role="dialog" aria-modal="true" aria-label={item?'تعديل قراءة':'إضافة قراءة'}><div className="sheet">
    <header className="sheet-header"><button type="button" aria-label="إغلاق" className="icon-button" onClick={onClose}><X size={21}/></button><div><strong>{item?'تعديل قراءة سابقة':'قراءة مالية جديدة'}</strong><p className="muted small">الخطوة {step+1} من 4</p></div><span className="header-mini">{money(withoutGold(draft))}</span></header>
    <div className="steps">{['الأرصدة','الديون','الذهب','المراجعة'].map((t,i)=><button type="button" key={t} onClick={()=>setStep(i)} className={step===i?'current':step>i?'done':''} aria-label={t}>{t}</button>)}</div>
    <div className="sheet-body stack">
      {step===0&&<><div className="section-intro"><h2>الأرصدة الحالية</h2><p>أدخل المبالغ الموجودة بالفعل، وليس قيمة المصروفات.</p></div>
        {!item&&<label className="field"><span>تاريخ القراءة</span><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label>}
        <NumberInput label="الحساب البنكي" value={form.bank} onChange={n=>change({bank:n})}/><NumberInput label="رصيد OFII / ADA" value={form.ofii} onChange={n=>change({ofii:n})}/><NumberInput label="محفظة Redotpay" value={form.redotpay} onChange={n=>change({redotpay:n})}/><NumberInput label="النقد (الكاش)" value={form.cash} onChange={n=>change({cash:n})}/>
      </>}
      {step===1&&<><PeopleEditor title="ديون لي" description="المبالغ المستحقة لك عند الآخرين وتُضاف لصافي المال" value={form.people} onChange={v=>change({people:v})}/><div className="soft-divider"/><PeopleEditor title="ديون عليّ" description="المبالغ التي يجب عليك دفعها وتُخصم من صافي المال" value={form.liabilities} onChange={v=>change({liabilities:v})}/></>}
      {step===2&&<><div className="section-intro"><h2>مدخرات الذهب</h2><p>السعر يُسجل داخل القراءة نفسها للمحافظة على الأسعار التاريخية.</p></div><NumberInput label="وزن الذهب" unit="جرام" value={form.gold.grams} onChange={n=>change({gold:{...form.gold,grams:n}})}/><label className="field"><span>العيار</span><select value={form.gold.karat} onChange={e=>change({gold:{...form.gold,karat:Number(e.target.value)}})}>{[24,22,21,18].map(k=><option key={k} value={k}>{k} قيراط</option>)}</select></label><NumberInput label="سعر الجرام المحفوظ" value={form.gold.pricePerGram} onChange={n=>change({gold:{...form.gold,pricePerGram:n}})}/><div className="gold-preview"><span>قيمة الذهب</span><strong>{money(form.gold.grams*form.gold.pricePerGram)}</strong></div></>}
      {step===3&&<><div className="review-hero"><span>صافي الأصول دون الذهب</span><strong>{money(withoutGold(draft))}</strong><div className="review-line"><span>الصافي مع الذهب</span><b>{money(netWorth(draft))}</b></div></div>
        <div className="summary-list"><div><span>السيولة</span><b>{money(form.bank+form.ofii+form.redotpay+form.cash)}</b></div><div><span>ديون لك</span><b className="positive">+{money(sumPeople(form.people))}</b></div><div><span>ديون عليك</span><b className="negative">−{money(sumPeople(form.liabilities))}</b></div><div><span>الذهب</span><b>{money(form.gold.grams*form.gold.pricePerGram)}</b></div>{prev&&<div><span>التغير دون الذهب</span><b>{money(withoutGold(draft)-withoutGold(prev))}</b></div>}</div>
        <label className="field"><span>ملاحظة (اختياري)</span><textarea rows={3} maxLength={2000} value={form.note||''} onChange={e=>change({note:e.target.value})} placeholder="أي تفاصيل تريد تذكرها عن هذه القراءة"/></label><p className="muted small">الحسابات مبنية على فروق الأرصدة، وليس تصنيف المعاملات. ستُحفظ هذه القراءة في قاعدة البيانات الأصلية.</p>
      </>}
    </div>
    {error&&<p className="alert-error" role="alert">{error}</p>}
    <footer className="sheet-footer">{step>0&&<button type="button" className="button secondary" onClick={()=>setStep(s=>s-1)} disabled={busy}><ArrowRight size={17}/> السابق</button>}<button type="button" className="button primary grow" disabled={busy} onClick={()=>step===3?void save():setStep(s=>s+1)}>{busy?'جارٍ الحفظ...':step===3?item?'حفظ التعديلات':'حفظ القراءة':'التالي'}{step===3?<Check size={18}/>:<ArrowLeft size={18}/>}</button></footer>
  </div></div>;
}
