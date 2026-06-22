import { createClient } from '@/lib/supabase/server';
import type { ProgressUpdate } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/batch/:id/progress — Server-Sent Events stream of batch progress.
// Polls the batches row (RLS-scoped via the request cookies) until the batch
// reaches a terminal state, then closes.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: ProgressUpdate) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      if (!user) {
        send({
          status: 'failed',
          progress: 0,
          generated_count: 0,
          flagged_count: 0,
          total_rows: 0,
          error: 'Unauthorized',
        });
        controller.close();
        return;
      }

      let active = true;
      while (active) {
        const { data: b } = await supabase
          .from('batches')
          .select(
            'status, progress, generated_count, flagged_count, total_rows, error_message',
          )
          .eq('id', id)
          .single();

        if (!b) {
          controller.close();
          return;
        }

        send({
          status: b.status,
          progress: b.progress,
          generated_count: b.generated_count,
          flagged_count: b.flagged_count,
          total_rows: b.total_rows ?? 0,
          error: b.error_message,
        });

        if (b.status === 'completed' || b.status === 'failed') {
          active = false;
          controller.close();
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
