import { NextRequest, NextResponse } from 'next/server';
import { geocodeLocation } from '@/lib/geo';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  const result = await geocodeLocation(q);

  if (!result) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
