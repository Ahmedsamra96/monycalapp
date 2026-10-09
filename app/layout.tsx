import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'مالي — إدارة أموالك',description:'لوحة خاصة لقياس صافي الثروة والأرصدة والديون والذهب مع سجل القراءات',robots:{index:false,follow:false}};
export const viewport: Viewport = {width:'device-width', initialScale:1,themeColor:'#09172d'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="ar" dir="rtl"><body>{children}</body></html>;}
