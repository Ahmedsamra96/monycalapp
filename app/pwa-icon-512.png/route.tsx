import { pwaIcon } from '@/lib/pwa-icon';
export const runtime='edge';
export async function GET(){return pwaIcon(512);}
