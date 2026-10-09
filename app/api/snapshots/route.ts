import { NextRequest, NextResponse } from 'next/server';
import { rejectCrossOrigin, apiError } from '@/lib/api';
import { db, fromSnapshotRow, toSnapshotRow } from '@/lib/db';
import { snapshotPayload } from '@/lib/schema';
export async function POST(req: NextRequest) {
  const denied = rejectCrossOrigin(req); if (denied) return denied;
  const parsed = snapshotPayload.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'تحقق من صحة الأرصدة والتواريخ'}, {status:400});
  try {
    const {data,error} = await db().from('snapshots').insert(toSnapshotRow(parsed.data)).select('*').single();
    if (error) throw error;
    return NextResponse.json(fromSnapshotRow(data), {status:201});
  } catch(e) {return apiError(e);}
}
