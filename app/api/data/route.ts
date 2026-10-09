import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { loadData } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {return NextResponse.json(await loadData(), {headers: {'Cache-Control':'no-store, private'}});}
  catch(e) {return apiError(e);}
}
