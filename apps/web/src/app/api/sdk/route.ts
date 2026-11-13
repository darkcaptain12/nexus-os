import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { ALL_PERMISSIONS } from '@/lib/plugins/permission-engine';

// Public SDK keşif — izin verilen yüzeyler + hook event'leri (3. parti geliştirici)
async function handleGET() {
  return NextResponse.json({
    sdk: 'apex-plugin-sdk-v1',
    permissions: ALL_PERMISSIONS,
    hooks: [
      'task.created',
      'project.updated',
      'trade.opened',
      'trade.closed',
      'order.created',
      'product.published',
      'approval.required',
      'workflow.finished',
      'voice.intent',
      'desktop.activity',
    ],
    sdkSurface: [
      'executive',
      'memory',
      'knowledge',
      'agent',
      'workflow',
      'trading',
      'commerce',
      'desktop',
      'voice',
      'notifications',
    ],
    note: 'Pluginler yalnız izin verilen yüzeylere Plugin Context üzerinden erişir.',
  });
}

export const GET = withErrorBoundary(handleGET);
