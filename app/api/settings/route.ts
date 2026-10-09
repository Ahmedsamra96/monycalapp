import { NextRequest, NextResponse } from 'next/server';
import { rejectCrossOrigin, apiError } from '@/lib/api';
import { db } from '@/lib/db';
import { settingsPayload } from '@/lib/schema';
export async function PUT(req: NextRequest) {
  const denied = rejectCrossOrigin(req); if (denied) return denied;
  const parsed = settingsPayload.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'الإعدادات غير صالحة'}, {status:400});
  try {
    const {data,error} = await db().from('app_settings').upsert({id:'default',monthly_budget:parsed.data.monthlyBudget,default_karat:parsed.data.defaultKarat,default_grams:parsed.data.defaultGrams,onboarded:parsed.data.onboarded,updated_at:new Date().toISOString()}).select('*').single();
    if (error) throw error;
    return NextResponse.json({monthlyBudget:data.monthly_budget == null ? null : Number(data.monthly_budget), defaultKarat:Number(data.default_karat),defaultGrams:Number(data.default_grams),onboarded:!!data.onboarded});
  } catch(e) {return apiError(e);}
}
