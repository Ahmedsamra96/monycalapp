import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id:'/', name:'مالي | MonyCal',short_name:'مالي',description:'متابعة أموالك ومدخراتك وديونك من الهاتف',
    lang:'ar',dir:'rtl',start_url:'/',scope:'/',display:'standalone',orientation:'portrait-primary',
    background_color:'#f5f7fb',theme_color:'#234987',
    icons:[
      {src:'/pwa-icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/pwa-icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
      {src:'/pwa-icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
    ]
  };
}
