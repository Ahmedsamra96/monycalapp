'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, BarChart3, CalendarClock, Check, ChevronLeft, Coins, Download, HandCoins, Home, Landmark, Menu, Pencil, Plus, RefreshCw, Settings2, ShieldCheck, Trash2, Users, Wallet, X } from 'lucide-react';
import { currentMonth, dateLabel, goldValue, liquid, money, monthKey, monthLabel, monthStatistics, netWorth, number, sorted, sumPeople, toCSV, withoutGold, type AppData, type Person, type Settings, type Snapshot } from '@/lib/finance';
import SnapshotEditor from './SnapshotEditor';
import HomeOverview from './HomeOverview';
import HistoryLog from './HistoryLog';
import InstallApp from './InstallApp';

type Tab='home'|'history'|'debts'|'gold'|'settings';
type DebtType='people'|'liabilities';
type DebtAction={type:'new'|'add'|'settle',key:DebtType,person?:Person};
const id=()=>crypto.randomUUID();
const initialSettings:Settings={monthlyBudget:null,defaultKarat:24,defaultGrams:0,onboarded:false};
async function request<T>(path:string, method='GET', data?:unknown):Promise<T> {
  const res=await fetch(path,{method,cache:'no-store',credentials:'same-origin',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  let json:any;
  try{json=await res.json();}catch{throw new Error('استجابة غير صالحة من الخادم');}
  if(!res.ok)throw new Error(json?.error||`خطأ HTTP ${res.status}`);
  return json as T;
}
const menuItems=[{key:'home',name:'الرئيسية',Icon:Home},{key:'history',name:'السجل',Icon:BarChart3},{key:'debts',name:'الديون',Icon:HandCoins},{key:'gold',name:'الذهب',Icon:Coins},{key:'settings',name:'الإعدادات',Icon:Settings2}] as const;
const Tone=({diff}:{diff:number})=><span className={`delta ${diff<0?'minus':diff>0?'plus':'flat'}`}>{diff<0?<ArrowDownLeft size={14}/>:<ArrowUpRight size={14}/>} {diff===0?'بدون تغيير':money(Math.abs(diff))}</span>;
const Empty=({text}:{text:string})=><div className="empty-panel"><CalendarClock size={28}/><p>{text}</p></div>;

export default function FinanceApp() {
  const [data,setData]=useState<AppData|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [tab,setTab]=useState<Tab>('home');
  const [editing,setEditing]=useState<Snapshot|null|undefined>(undefined);
  const [menuOpen,setMenuOpen]=useState(false);
  const [mode,setMode]=useState<DebtType>('people');
  const [debtAction,setDebtAction]=useState<DebtAction|null>(null);
  const [debtName,setDebtName]=useState('');
  const [debtAmount,setDebtAmount]=useState('');
  const [debtAccount,setDebtAccount]=useState<'bank'|'cash'|'redotpay'>('cash');
  const [goldBusy,setGoldBusy]=useState(false);
  const [settingsDraft,setSettingsDraft]=useState<Settings>(initialSettings);

  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try{const cloud=await request<AppData>('/api/data');setData(cloud);setSettingsDraft(cloud.settings);}
    catch(e){setError(e instanceof Error?e.message:'فشل التحميل');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const snaps=useMemo(()=>sorted(data?.snapshots||[]),[data]);
  const latest=snaps.at(-1);
  const previous=snaps.at(-2);
  const thisMonth=monthStatistics(snaps,currentMonth());

  async function changeSnapshot(payload:Omit<Snapshot,'id'>, editId?:string) {
    setBusy(true);setError('');
    try{if(editId) await request(`/api/snapshots/${editId}`,'PUT',payload); else await request('/api/snapshots','POST',payload);
      await refresh();setEditing(undefined);setNotice(editId?'تم تعديل القراءة وحفظها في القاعدة':'تم حفظ القراءة الجديدة في القاعدة');
    }catch(e){setError(e instanceof Error?e.message:'تعذّر حفظ القراءة');throw e;}finally{setBusy(false);}
  }
  async function removeSnapshot(item:Snapshot){
    if(!window.confirm(`هل أنت متأكد من حذف قراءة ${dateLabel(item.date)}؟ سيتم حذفها من قاعدة بيانات MonyCal الجديدة ولن يمكن التراجع.`))return;
    setBusy(true);try{await request(`/api/snapshots/${item.id}`,'DELETE');await refresh();setNotice('تم حذف القراءة');}catch(e){setError(e instanceof Error?e.message:'تعذّر الحذف');}finally{setBusy(false);}
  }
  function openDebt(action:DebtAction){setDebtAction(action);setDebtName('');setDebtAmount(action.type==='settle'&&action.person?String(sumPeople([action.person])):'');setDebtAccount('cash');}
  async function saveDebt() {
    if(!latest||!debtAction)return;
    const amount=Number(debtAmount);
    if(!Number.isFinite(amount)||amount<=0){setError('أدخل مبلغًا صحيحًا أكبر من صفر');return;}
    const {key,type,person}=debtAction;
    let people=[...latest[key]];
    const other:Partial<Snapshot>={};
    if(type==='new'){
      if(!debtName.trim()){setError('أدخل اسم الشخص');return;}
      people.push({id:id(),name:debtName.trim(),entries:[{id:id(),amount}]});
    } else if(person){
      if(!people.some(p=>p.id===person.id)){setError('تعذّر العثور على الدين');return;}
      if(type==='add')people=people.map(p=>p.id===person.id?{...p,entries:[...p.entries,{id:id(),amount}]}:p);
      if(type==='settle'){
        const outstanding=sumPeople([person]);
        if(amount>outstanding+0.001){setError('لا يمكن تسوية مبلغ أكبر من الدين');return;}
        if(key==='liabilities'&&latest[debtAccount]<amount){setError('الرصيد المحدد غير كافٍ لتسديد الدين');return;}
        let rest=amount;
        people=people.map(p=>p.id===person.id?{...p,entries:p.entries.map(e=>{const cut=Math.min(e.amount,rest);rest-=cut;return{...e,amount:Math.round((e.amount-cut)*100)/100};}).filter(e=>e.amount>0.0001)}:p);
        other[debtAccount]=latest[debtAccount]+(key==='people'?amount:-amount);
      }
    }
    setBusy(true);setError('');
    try {const {id:_id,...payload}={...latest,[key]:people,...other};await request(`/api/snapshots/${latest.id}`,'PUT',payload);await refresh();setDebtAction(null);setNotice('تم تحديث الديون والأرصدة بنجاح');}
    catch(e){setError(e instanceof Error?e.message:'تعذر تحديث الدين');}
    finally{setBusy(false);}
  }
  async function setGoldPrice(price:number,grams?:number) {
    if(!latest)return;
    setGoldBusy(true);setError('');
    try {const {id:_id,...rest}=latest;
      await request(`/api/snapshots/${latest.id}`,'PUT',{...rest,gold:{...rest.gold,pricePerGram:price,grams:grams??rest.gold.grams}});
      // Price history is an additional record, not the source of truth for snapshot.
      if(price!==latest.gold.pricePerGram){try{await request('/api/gold-prices','POST',{pricePerGram:price,date:new Date().toISOString()});}catch(e){setNotice('تم حفظ السعر في القراءة، لكن تعذر تسجيله في سجل الأسعار');}}
      await refresh();setNotice('تم تحديث الذهب في قاعدة البيانات');
    }catch(e){setError(e instanceof Error?e.message:'تعذر حفظ الذهب');}finally{setGoldBusy(false);}
  }
  async function refreshGold() {
    if(!latest)return;
    setGoldBusy(true);setError('');
    try {const p=await request<{pricePerGram:number}>(`/api/gold-live?karat=${latest.gold.karat}`);
      if(window.confirm(`السعر المباشر ${money(p.pricePerGram)} لكل جرام. هل تريد حفظه للقراءة الحالية؟`))await setGoldPrice(p.pricePerGram);
    }catch(e){setError(e instanceof Error?e.message:'تعذر جلب السعر');}finally{setGoldBusy(false);}
  }
  async function saveSettings(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await request('/api/settings','PUT',settingsDraft);await refresh();setNotice('تم حفظ الإعدادات');}catch(e){setError(e instanceof Error?e.message:'تعذر الحفظ');}finally{setBusy(false);}}
  function exportCsv(){const csv=toCSV(snaps);const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`mali-snapshots-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function navigate(v:Tab){setTab(v);setMenuOpen(false);setError('');setNotice('');}

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen?'mobile-open':''}`}>
      <div className="sidebar-brand"><span className="brand-glyph"><Wallet size={25}/></span><div><b>مالي</b><small>Wealth Snapshot</small></div><button aria-label="إغلاق القائمة" className="icon-control mobile-only" onClick={()=>setMenuOpen(false)}><X size={20}/></button></div>
      <div className="nav-label">القائمة الرئيسية</div>
      <nav className="nav-list">{menuItems.map(({key,name,Icon})=><button key={key} className={`nav-item ${tab===key?'active':''}`} onClick={()=>navigate(key)}><Icon size={20}/>{name}{tab===key&&<span className="active-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="connected"><span className="status-dot"/>بيانات متصلة بالسحابة</div></div>
    </aside>
    {menuOpen&&<div className="menu-scrim" onClick={()=>setMenuOpen(false)}/>}
    <div className="main-area">
      <header className="topbar"><div className="topbar-intro"><button className="icon-control mobile-only" aria-label="فتح القائمة" onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><div><p>لوحة التحكم المالية</p><h2>{menuItems.find(i=>i.key===tab)?.name}</h2></div></div><div className="topbar-actions"><button className="icon-control" title="تحديث من السحابة" aria-label="تحديث البيانات" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCw size={19} className={loading?'spin':''}/></button><span className="top-avatar">M</span></div></header>
      <main className="content">
        {error&&<div className="flash flash-error" role="alert">{error}<button aria-label="إغلاق" onClick={()=>setError('')}><X size={16}/></button></div>}
        {notice&&<div className="flash flash-success" role="status">{notice}<button aria-label="إغلاق" onClick={()=>setNotice('')}><X size={16}/></button></div>}
        {loading&&<div className="loading-inline"><div className="spinner"/>جاري مزامنة البيانات...</div>}
        {!data&&!loading?<div className="error-state"><RefreshCw size={32}/><h2>تعذّر تحميل البيانات</h2><p>لن تُعرض بيانات تجريبية أو قديمة. راجع إعدادات Supabase ثم حاول مجددًا.</p><button className="button button-primary" onClick={()=>void refresh()}>إعادة المحاولة</button></div>:null}
        {data&&<>
          {tab==='home'&&<HomeOverview snapshots={snaps} latest={latest} previous={previous} month={thisMonth} settings={data.settings} onNew={()=>setEditing(null)} onHistory={()=>navigate('history')} onGold={()=>navigate('gold')} onEdit={setEditing}/>}
          {tab==='history'&&<HistoryLog snapshots={snaps} busy={busy} onEdit={setEditing} onDelete={s=>void removeSnapshot(s)}/>}
          {tab==='debts'&&<><div className="page-heading"><div><span className="eyebrow">تنظيم الالتزامات</span><h1>ديونك ومستحقاتك</h1><p>استلام دين أو سداده يحوّل الرصيد دون اعتباره مصروفًا أو دخلًا جديدًا.</p></div></div>
            <div className="segment"><button className={mode==='people'?'active':''} onClick={()=>setMode('people')}>ديون لي <span>{money(latest?sumPeople(latest.people):0)}</span></button><button className={mode==='liabilities'?'active':''} onClick={()=>setMode('liabilities')}>ديون عليّ <span>{money(latest?sumPeople(latest.liabilities):0)}</span></button></div>
            {!latest?<Empty text="أضف قراءة مالية لبدء إدارة الديون."/>:<><div className="info-banner">{mode==='people'?'عند استلام مبلغ، ينقص الدين ويزيد رصيد الحساب المختار بنفس القيمة.':'عند سداد مبلغ، ينقص الدين وينقص رصيد الحساب المختار بنفس القيمة.'}</div><div className="debts-summary"><div><small>{mode==='people'?'مستحق لك':'مستحق عليك'}</small><strong>{money(sumPeople(latest[mode]))}</strong></div><button className="button button-primary" onClick={()=>openDebt({type:'new',key:mode})}><Plus size={17}/> إضافة شخص</button></div><div className="debt-grid">{latest[mode].map(p=><div className="panel debt-person" key={p.id}><div className="debt-person-head"><span className="avatar-small">{p.name.charAt(0)}</span><div><h3>{p.name}</h3><small>{p.entries.length} مبالغ</small></div><strong>{money(sumPeople([p]))}</strong></div><div className="debt-pills">{p.entries.map(e=><span key={e.id}>{money(e.amount)}</span>)}</div><div className="debt-actions"><button className="button button-muted" onClick={()=>openDebt({type:'add',key:mode,person:p})}><Plus size={16}/> مبلغ إضافي</button><button className="button button-primary" disabled={sumPeople([p])<=0} onClick={()=>openDebt({type:'settle',key:mode,person:p})}>{mode==='people'?'استلام مبلغ':'سداد مبلغ'}</button></div></div>)}{!latest[mode].length&&<Empty text="لا توجد ديون في هذا القسم."/>}</div></>}
          </>}
          {tab==='gold'&&<><div className="page-heading"><div><span className="eyebrow">مدخرات الذهب</span><h1>رصيد الذهب</h1><p>تابع الكمية والعيار والقيمة، ويمكنك تحديث السعر المباشر عند رغبتك.</p></div></div>{latest?<><div className="gold-hero"><div className="gold-round"><Coins size={32}/></div><div><span>قيمة الذهب المقدرة</span><strong>{money(goldValue(latest))}</strong><p>{number(latest.gold.grams,3)} جرام • عيار {latest.gold.karat} • {money(latest.gold.pricePerGram)} / جرام</p></div></div><div className="gold-actions"><button className="button button-primary" disabled={goldBusy} onClick={()=>void refreshGold()}><RefreshCw size={18}/> {goldBusy?'جاري التحديث...':'جلب السعر المباشر وحفظه'}</button><button className="button button-muted" onClick={()=>setEditing(latest)}><Pencil size={17}/> تعديل السعر أو الجرامات يدويًا</button></div><section className="panel"><div className="panel-header"><div><h2>سجل أسعار الذهب</h2><p>الأسعار المحفوظة سابقًا في قاعدة البيانات</p></div><span className="tag">{data.goldPrices.length} أسعار</span></div><div className="history-rows">{[...data.goldPrices].reverse().map(p=><div key={p.id} className="history-row"><span className="history-date-icon gold"><Coins size={18}/></span><div className="history-name"><b>{dateLabel(p.date)}</b><small>سعر الجرام</small></div><strong>{money(p.pricePerGram)}</strong></div>)}</div></section></>:<Empty text="أضف قراءة مالية لتسجيل مدخرات الذهب."/>}</>}
          {tab==='settings'&&<><InstallApp/><div className="page-heading"><div><span className="eyebrow">التحكم</span><h1>الإعدادات</h1><p>اضبط ميزانيتك وقيم الذهب الافتراضية، وحافظ على نسخة من تاريخك المالي.</p></div></div><section className="panel settings-panel"><div className="panel-header"><div><h2>الميزانية والتفضيلات</h2><p>الإعدادات تطبّق على القراءات المستقبلية فقط</p></div></div><form onSubmit={e=>void saveSettings(e)} className="settings-form"><label className="field"><span>الميزانية الشهرية (€) — اختياري</span><input type="number" min="0" step="0.01" value={settingsDraft.monthlyBudget??''} onChange={e=>setSettingsDraft(s=>({...s,monthlyBudget:e.target.value===''?null:Number(e.target.value)}))} placeholder="بدون ميزانية"/></label><label className="field"><span>جرامات الذهب الافتراضية</span><input type="number" min="0" step="0.001" value={settingsDraft.defaultGrams} onChange={e=>setSettingsDraft(s=>({...s,defaultGrams:Number(e.target.value)}))}/></label><label className="field"><span>عيار الذهب الافتراضي</span><select value={settingsDraft.defaultKarat} onChange={e=>setSettingsDraft(s=>({...s,defaultKarat:Number(e.target.value)}))}>{[24,22,21,18].map(n=><option value={n} key={n}>{n} قيراط</option>)}</select></label><button className="button button-primary" disabled={busy}><Check size={18}/> حفظ الإعدادات</button></form></section><section className="panel export-panel"><div className="panel-header"><div><h2>حفظ نسخة من السجل</h2><p>ينشأ ملف CSV محلي من السجلات المقروءة، بدون نقل بياناتك لخدمة أخرى.</p></div></div><div className="export-row"><div className="export-icon"><Download size={24}/></div><div><b>نسخة بيانات CSV</b><small>{snaps.length} قراءة جاهزة للتصدير</small></div><button className="button button-muted" onClick={exportCsv}><Download size={16}/> تصدير</button></div></section><div className="info-banner"><ShieldCheck size={18}/> هذه النسخة متصلة بقاعدة بيانات MonyCal السحابية. حذف السجلات من هنا يحذفها من القاعدة الجديدة، ولا يوجد زر لإعادة تهيئة البيانات.</div></>}
        </>}
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="التنقل الرئيسي">
      <button type="button" className={tab==='home'?'current':''} aria-current={tab==='home'?'page':undefined} onClick={()=>navigate('home')}><Home size={23}/><span>الرئيسية</span></button>
      <button type="button" className={tab==='history'?'current':''} aria-current={tab==='history'?'page':undefined} onClick={()=>navigate('history')}><CalendarClock size={23}/><span>السجل</span></button>
      <button type="button" className="mobile-add" aria-label="إضافة قراءة جديدة" onClick={()=>setEditing(null)}><Plus size={33} strokeWidth={2.5}/></button>
      <button type="button" className={tab==='debts'?'current':''} aria-current={tab==='debts'?'page':undefined} onClick={()=>navigate('debts')}><Users size={23}/><span>الديون</span></button>
      <button type="button" className={tab==='settings'?'current':''} aria-current={tab==='settings'?'page':undefined} onClick={()=>navigate('settings')}><Settings2 size={23}/><span>الإعدادات</span></button>
    </nav>
    {editing!==undefined&&<SnapshotEditor item={editing||undefined} latest={latest} snapshots={snaps} settings={data?.settings||initialSettings} busy={busy} onClose={()=>setEditing(undefined)} onSave={(payload)=>changeSnapshot(payload,editing?.id)}/>}
    {debtAction&&<div className="modal-overlay"><div className="small-modal" role="dialog" aria-modal="true" aria-label="تحديث دين"><div className="modal-header"><button className="icon-control" onClick={()=>setDebtAction(null)}><X size={20}/></button><div><h2>{debtAction.type==='new'?'إضافة شخص':debtAction.type==='add'?'إضافة مبلغ':'تسوية دين'}</h2><p>{debtAction.key==='people'?'ديون لي':'ديون عليّ'}</p></div></div><div className="modal-body">{debtAction.type==='new'&&<label className="field"><span>اسم الشخص</span><input value={debtName} onChange={e=>setDebtName(e.target.value)} placeholder="اسم الشخص" maxLength={150}/></label>}<label className="field"><span>المبلغ (€)</span><input type="number" autoFocus min="0.01" step="0.01" value={debtAmount} onChange={e=>setDebtAmount(e.target.value)}/></label>{debtAction.type==='settle'&&<label className="field"><span>{debtAction.key==='people'?'استلم المبلغ في':'ادفع المبلغ من'}</span><select value={debtAccount} onChange={e=>setDebtAccount(e.target.value as typeof debtAccount)}><option value="cash">النقد</option><option value="bank">البنك</option><option value="redotpay">Redotpay</option></select></label>}</div><div className="modal-footer"><button className="button button-muted" onClick={()=>setDebtAction(null)}>إلغاء</button><button className="button button-primary grow" disabled={busy} onClick={()=>void saveDebt()}>{busy?'جارٍ الحفظ...':'حفظ التعديل'}</button></div></div></div>}
  </div>;
}
function StatCard({title,amount,icon,color,subtitle}:{title:string,amount:number,icon:React.ReactNode,color:string,subtitle:string}) {return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><span>{title}</span><strong dir="ltr">{money(amount)}</strong><small>{subtitle}</small></div>;}
