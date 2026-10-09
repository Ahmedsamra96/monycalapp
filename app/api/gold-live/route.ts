import { NextRequest, NextResponse } from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req: NextRequest) {
  const karat = Number(req.nextUrl.searchParams.get('karat') ?? '24');
  if (![18,21,22,24].includes(karat)) return NextResponse.json({error:'عيار غير مدعوم'}, {status:400});
  try {
    const [spotRes,fxRes] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU',{next:{revalidate:60}}),
      fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR',{next:{revalidate:3600}})
    ]);
    if (!spotRes.ok || !fxRes.ok) throw new Error('upstream');
    const spot = await spotRes.json(), fx = await fxRes.json();
    const ounce = Number(spot.price), rate = Number(fx?.rates?.EUR);
    if (!(ounce > 0 && rate > 0)) throw new Error('invalid upstream');
    const pricePerGram = Math.round((ounce/31.1034768)*rate*(karat/24)*100)/100;
    return NextResponse.json({pricePerGram, karat, updatedAt:spot.updatedAt || new Date().toISOString()}, {headers:{'Cache-Control':'no-store'}});
  } catch {return NextResponse.json({error:'تعذّر جلب سعر الذهب الآن'}, {status:502});}
}
