import { NextRequest, NextResponse } from 'next/server';
import { rejectCrossOrigin, apiError } from '@/lib/api';
import { db } from '@/lib/db';
import { goldPricePayload } from '@/lib/schema';
export async function POST(req: NextRequest) {
  const denied = rejectCrossOrigin(req); if (denied) return denied;
  const parsed = goldPricePayload.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'السعر أو التاريخ غير صالح'}, {status:400});
  try {
    const {data,error} = await db().from('gold_prices').insert({recorded_at:parsed.data.date,price_per_gram:parsed.data.pricePerGram}).select('*').single();
    if(error) throw error;
    return NextResponse.json({id:data.id,date:data.recorded_at,pricePerGram:Number(data.price_per_gram)}, {status:201});
  } catch(e) {return apiError(e);}
}
