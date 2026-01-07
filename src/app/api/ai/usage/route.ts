import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';
import { 
  getUserUsageStats, 
  getProviderHealth, 
  getProviderTimeSeries,
  getModelPerformance,
  getFallbackTracking,
  detectAlerts,
  getCostProjection,
  ProviderHealthMetrics,
  TimeSeriesDataPoint,
  ModelPerformanceData,
  FallbackData,
  AlertData,
  CostProjection
} from '@/server-lib/ai-usage-tracker';
import { z } from 'zod';

const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const UsageQuerySchema = DateRangeSchema.extend({
  metricType: z.enum([
    'summary', 
    'provider-health', 
    'time-series', 
    'model-performance', 
    'fallback-tracking',
    'alerts',
    'cost-projection'
  ]).default('summary'),
  provider: z.string().optional(),
});

type MetricType = 'summary' | 'provider-health' | 'time-series' | 'model-performance' | 'fallback-tracking' | 'alerts' | 'cost-projection';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = {
      startDate: searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: searchParams.get('endDate') || new Date().toISOString(),
      metricType: (searchParams.get('metricType') as MetricType) || 'summary',
      provider: searchParams.get('provider') || undefined,
    };

    const validatedQuery = UsageQuerySchema.parse(query);
    const { startDate, endDate, metricType, provider } = validatedQuery;
    const dateRange = { startDate, endDate };

    let result: any;
    let cacheHeaders = 'public, max-age=60, s-maxage=300'; // Default cache headers

    switch (metricType) {
      case 'summary': {
        result = await getUserUsageStats(user.id, dateRange);
        break;
      }
      case 'provider-health': {
        result = await getProviderHealth(user.id, dateRange) as ProviderHealthMetrics[];
        cacheHeaders = 'public, max-age=30, s-maxage=60';
        break;
      }
      case 'time-series': {
        result = await getProviderTimeSeries(user.id, dateRange, provider) as TimeSeriesDataPoint[];
        cacheHeaders = 'public, max-age=60, s-maxage=120';
        break;
      }
      case 'model-performance': {
        result = await getModelPerformance(user.id, dateRange) as ModelPerformanceData[];
        cacheHeaders = 'public, max-age=60, s-maxage=120';
        break;
      }
      case 'fallback-tracking': {
        result = await getFallbackTracking(user.id, dateRange) as FallbackData[];
        cacheHeaders = 'public, max-age=30, s-maxage=60';
        break;
      }
      case 'alerts': {
        result = await detectAlerts(user.id, dateRange) as AlertData[];
        cacheHeaders = 'no-cache'; // Alerts should not be cached
        break;
      }
      case 'cost-projection': {
        result = await getCostProjection(user.id, dateRange) as CostProjection;
        cacheHeaders = 'public, max-age=300, s-maxage=600';
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid metricType' }, { status: 400 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': cacheHeaders,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
