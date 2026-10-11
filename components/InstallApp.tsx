'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function InstallApp(){
  const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null);
  const [ios,setIos]=useState(false);
  const [installed,setInstalled]=useState(false);
  useEffect(()=>{
    const check=()=>setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & {standalone?:boolean}).standalone));
    check();setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);};
    window.addEventListener('beforeinstallprompt',onPrompt);
    window.addEventListener('appinstalled',check);
    return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',check);};
  },[]);
  const install=async()=>{
    if(!installEvent)return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };
  return <section className="panel install-app-card" aria-label="تثبيت التطبيق">
    <div className="install-app-icon"><Smartphone size={25}/></div>
    <div><h3>تطبيق MonyCal على الهاتف</h3>
      <p>{installed?'التطبيق يعمل بوضع الشاشة الرئيسية.':ios?'في Safari اضغط مشاركة، ثم «إضافة إلى الشاشة الرئيسية».': 'ثبّت التطبيق على الشاشة الرئيسية لتفتحه كأي تطبيق آخر.'}</p>
    </div>
    {!installed && installEvent && <button type="button" className="button button-primary" onClick={()=>void install()}><Download size={17}/> تثبيت</button>}
  </section>;
}
