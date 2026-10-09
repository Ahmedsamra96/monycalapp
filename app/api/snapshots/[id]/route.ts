import { NextRequest, NextResponse } from 'next/server';
import { rejectCrossOrigin, apiError } from '@/lib/api';
import { db, fromSnapshotRow, toSnapshotRow } from '@/lib/db';
import { snapshotPayload } from '@/lib/schema';
import { z } from 'zod';
const idSchema = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = rejectCrossOrigin(req); if (denied) return denied;
  const {id} = await ctx.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({error:'معرّف غير صالح'}, {status:400});
  const parsed = snapshotPayload.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'تحقق من صحة القيم'}, {status:400});
  try {
    const {data,error} = await db().from('snapshots').update(toSnapshotRow(parsed.data)).eq('id',id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({error:'القراءة غير موجودة'}, {status:404});
    return NextResponse.json(fromSnapshotRow(data));
  } catch(e) {return apiError(e);}
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const denied = rejectCrossOrigin(req); if (denied) return denied;
  const {id} = await ctx.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({error:'معرّف غير صالح'}, {status:400});
  try {
    const {data,error} = await db().from('snapshots').delete().eq('id',id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({error:'القراءة غير موجودة'}, {status:404});
    return NextResponse.json({ok:true});
  } catch(e) {return apiError(e);}
}
