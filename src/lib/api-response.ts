import { NextResponse } from 'next/server';
import { WorkflowError } from '@/lib/booking/workflow';
import { UnauthorizedError, ForbiddenError } from '@/lib/auth/admin';
import { ZodError } from 'zod';

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof WorkflowError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'Invalid request.', details: err.flatten() },
      { status: 422 },
    );
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
}
