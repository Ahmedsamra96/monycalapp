import 'server-only';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// A browser-facing, passwordless app. This is intentionally NOT authentication.
// An unlisted link is not a security boundary: deploy only where disclosure is acceptable.
export function rejectCrossOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) return NextResponse.json({ error: 'طلب غير مصرح' }, { status: 403 });
  try { if (new URL(origin).host !== host) return NextResponse.json({ error: 'طلب غير مصرح' }, { status: 403 }); }
  catch { return NextResponse.json({ error: 'طلب غير مصرح' }, { status: 403 }); }
  return null;
}
export function apiError(e: unknown) {
  console.error('Database/API failure', e);
  return NextResponse.json({ error: 'تعذّر الوصول إلى قاعدة البيانات. تحقق من إعدادات الاتصال.' }, { status: 503 });
}
