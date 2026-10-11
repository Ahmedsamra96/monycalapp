import type { Metadata, Viewport } from 'next';
import PWAClient from '@/components/PWAClient';
import './globals.css';
import './mobile-pwa.css';
import './history.css';

export const metadata: Metadata = {
  applicationName:'MonyCal', title:'مالي — MonyCal',
  description:'تطبيق إدارة الثروة والأرصدة والديون والذهب والقراءات المالية',
  manifest:'/manifest.webmanifest',
  appleWebApp:{capable:true,statusBarStyle:'default',title:'مالي'},
  formatDetection:{telephone:false},
  robots:{index:false,follow:false},
  icons:{icon:'/icon',apple:'/apple-icon'}
};
export const viewport: Viewport = {
  width:'device-width',initialScale:1,maximumScale:1,userScalable:false,
  viewportFit:'cover',themeColor:'#f5f7fb'
};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="ar" dir="rtl"><body><PWAClient/>{children}</body></html>;
}
