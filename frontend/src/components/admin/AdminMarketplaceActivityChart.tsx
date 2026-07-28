import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameResponse, MarketplaceItemResponse, PaymentResponse } from '../../types';

interface AdminMarketplaceActivityChartProps {
  games: GameResponse[];
  marketplaceItems: MarketplaceItemResponse[];
  payments: PaymentResponse[];
}

type VisibleWeeks = 5 | 8;

type MetricKey =
  | 'sourceListed'
  | 'sourceSold'
  | 'assetListed'
  | 'assetSold';

interface AxisTick {
  value: number;
  position: number;
}

interface ActivityBucket {
  key: string;
  weekIndex: number;
  rangeLabel: string;
  sourceListed: number;
  sourceSold: number;
  assetListed: number;
  assetSold: number;
}

const SOURCE_LISTED_STATUSES = new Set(['published']);
const ASSET_LISTED_STATUSES = new Set(['active']);

const METRIC_META: Array<{
  key: MetricKey;
  labelKey: string;
  barClass: string;
  badgeClass: string;
}> = [
  {
    key: 'sourceListed',
    labelKey: 'admin:activityChart.metrics.sourceListed',
    barClass: 'bg-sky-500/80',
    badgeClass: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  {
    key: 'sourceSold',
    labelKey: 'admin:activityChart.metrics.sourceSold',
    barClass: 'bg-cyan-300',
    badgeClass: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200',
  },
  {
    key: 'assetListed',
    labelKey: 'admin:activityChart.metrics.assetListed',
    barClass: 'bg-emerald-500/80',
    badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'assetSold',
    labelKey: 'admin:activityChart.metrics.assetSold',
    barClass: 'bg-lime-300',
    badgeClass: 'border-lime-400/25 bg-lime-400/10 text-lime-700 dark:text-lime-200',
  },
];

const rangeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const startOfWeek = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);

  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);

  return normalized;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const bucketKey = (date: Date) => startOfWeek(date).toISOString().slice(0, 10);

const buildAxisTicks = (maxValue: number): AxisTick[] => {
  if (maxValue <= 1) {
    return [
      { value: 1, position: 0 },
      { value: 0, position: 100 },
    ];
  }

  if (maxValue === 2) {
    return [
      { value: 2, position: 0 },
      { value: 1, position: 50 },
      { value: 0, position: 100 },
    ];
  }

  if (maxValue === 3) {
    return [
      { value: 3, position: 0 },
      { value: 2, position: 33.33 },
      { value: 1, position: 66.66 },
      { value: 0, position: 100 },
    ];
  }

  const step = Math.max(1, Math.ceil(maxValue / 3));
  const axisMax = step * 3;

  return [
    { value: axisMax, position: 0 },
    { value: axisMax - step, position: 33.33 },
    { value: axisMax - step * 2, position: 66.66 },
    { value: 0, position: 100 },
  ];
};

const buildActivityBuckets = (
  games: GameResponse[],
  marketplaceItems: MarketplaceItemResponse[],
  payments: PaymentResponse[],
  visibleWeeks: VisibleWeeks,
) => {
  const currentWeekStart = startOfWeek(new Date());

  const buckets: ActivityBucket[] = Array.from({ length: visibleWeeks }, (_, index) => {
    const weekOffset = visibleWeeks - index - 1;
    const start = addDays(currentWeekStart, weekOffset * -7);
    const end = addDays(start, 6);

    return {
      key: start.toISOString().slice(0, 10),
      weekIndex: index + 1,
      rangeLabel: `${rangeFormatter.format(start)} - ${rangeFormatter.format(end)}`,
      sourceListed: 0,
      sourceSold: 0,
      assetListed: 0,
      assetSold: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  games.forEach((game) => {
    const createdAt = parseDate(game.createdAt);
    const status = game.status?.toLowerCase() || '';
    const isMarketplaceSource = game.publishingType === 'marketplace_listing';

    if (createdAt && isMarketplaceSource && SOURCE_LISTED_STATUSES.has(status)) {
      const createdBucket = bucketMap.get(bucketKey(createdAt));
      if (createdBucket) {
        createdBucket.sourceListed += 1;
      }
    }
  });

  marketplaceItems.forEach((item) => {
    const createdAt = parseDate(item.createdAt);
    if (createdAt && ASSET_LISTED_STATUSES.has(item.status?.toLowerCase() || '')) {
      const createdBucket = bucketMap.get(bucketKey(createdAt));
      if (createdBucket) {
        createdBucket.assetListed += 1;
      }
    }
  });

  payments.forEach((payment) => {
    if (payment.paymentStatus !== 'PAID') {
      return;
    }

    const soldAt =
      parseDate(payment.paidAt) ||
      parseDate(payment.updatedAt) ||
      parseDate(payment.createdAt);
    if (!soldAt) {
      return;
    }

    const soldBucket = bucketMap.get(bucketKey(soldAt));
    if (!soldBucket) {
      return;
    }

    if (payment.marketplaceItemType === 'game_source') {
      soldBucket.sourceSold += 1;
      return;
    }

    if (payment.marketplaceItemType === 'asset') {
      soldBucket.assetSold += 1;
    }
  });

  return buckets;
};

const buildMetricTitle = (bucket: ActivityBucket, t: (key: string) => string) =>
  [
    bucket.rangeLabel,
    `${t('admin:activityChart.metrics.sourceListed')}: ${bucket.sourceListed}`,
    `${t('admin:activityChart.metrics.sourceSold')}: ${bucket.sourceSold}`,
    `${t('admin:activityChart.metrics.assetListed')}: ${bucket.assetListed}`,
    `${t('admin:activityChart.metrics.assetSold')}: ${bucket.assetSold}`,
  ].join('\n');

const getMetricValue = (bucket: ActivityBucket, key: MetricKey) => bucket[key];

export const AdminMarketplaceActivityChart: React.FC<AdminMarketplaceActivityChartProps> = ({
  games,
  marketplaceItems,
  payments,
}) => {
  const { t } = useTranslation(['admin']);
  const [visibleWeeks, setVisibleWeeks] = useState<VisibleWeeks>(5);

  const chartData = useMemo(
    () => buildActivityBuckets(games, marketplaceItems, payments, visibleWeeks),
    [games, marketplaceItems, payments, visibleWeeks],
  );

  const totals = useMemo(() => {
    return chartData.reduce<Record<MetricKey, number>>(
      (accumulator, bucket) => {
        accumulator.sourceListed += bucket.sourceListed;
        accumulator.sourceSold += bucket.sourceSold;
        accumulator.assetListed += bucket.assetListed;
        accumulator.assetSold += bucket.assetSold;
        return accumulator;
      },
      {
        sourceListed: 0,
        sourceSold: 0,
        assetListed: 0,
        assetSold: 0,
      },
    );
  }, [chartData]);

  const maxValue = useMemo(() => {
    const values = chartData.flatMap((bucket) =>
      METRIC_META.map((metric) => getMetricValue(bucket, metric.key)),
    );

    return Math.max(1, ...values);
  }, [chartData]);

  const axisTicks = useMemo(() => buildAxisTicks(maxValue), [maxValue]);
  const axisMax = axisTicks[0]?.value || 1;

  return (
    <div className="min-w-0 rounded-[24px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_42px_rgba(148,163,184,0.14)] backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/45 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
          {t('admin:activityChart.title')}
        </h3>

        <div className="inline-flex rounded-xl border border-slate-200/90 bg-slate-50/90 p-1 shadow-[0_8px_20px_rgba(148,163,184,0.08)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
          {[5, 8].map((range) => {
            const isActive = visibleWeeks === range;

            return (
              <button
                key={range}
                type="button"
                onClick={() => setVisibleWeeks(range as VisibleWeeks)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] transition-studio ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-[0_10px_30px_rgba(14,165,233,0.28)]'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {range}{t('admin:activityChart.weekShort')}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {METRIC_META.map((metric) => (
          <div
            key={metric.key}
            className={`inline-flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${metric.badgeClass}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${metric.barClass.replace('/80', '')}`}></span>
              <span>{t(metric.labelKey)}</span>
            </div>
            <span className="font-display text-sm text-slate-900 dark:text-white">{totals[metric.key]}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <div className="hidden w-10 shrink-0 pb-9 pt-2 md:flex md:flex-col md:justify-between">
          {axisTicks.map((tick) => (
            <span
              key={`${tick.value}-${tick.position}`}
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
            >
              {tick.value}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 bottom-10">
            {axisTicks.map((tick, index) => (
              <div
                key={`${tick.value}-${tick.position}-line`}
                className={`absolute inset-x-0 border-t ${
                  index === axisTicks.length - 1
                    ? 'border-slate-300/70 dark:border-slate-700/80'
                    : 'border-slate-200/70 dark:border-slate-800/70'
                }`}
                style={{ top: `${tick.position}%` }}
              />
            ))}
          </div>

          <div
            className="grid h-[280px] items-end gap-3 pb-10 md:gap-4"
            style={{ gridTemplateColumns: `repeat(${chartData.length}, minmax(0, 1fr))` }}
          >
            {chartData.map((bucket) => (
              <div key={bucket.key} className="min-w-0">
                <div
                  className="flex h-[240px] items-end justify-center gap-1 md:gap-1.5"
                  title={buildMetricTitle(bucket, t)}
                >
                  {METRIC_META.map((metric) => {
                    const value = getMetricValue(bucket, metric.key);
                    const rawHeight = (value / axisMax) * 100;
                    const height = value > 0 ? Math.max(rawHeight, 6) : 0;

                    return (
                      <div
                        key={`${bucket.key}-${metric.key}`}
                        className={`w-3 rounded-t-md transition-studio hover:opacity-85 md:w-4 ${metric.barClass}`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>

                <div className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t('admin:activityChart.week', { number: bucket.weekIndex })}
                </div>
                <div className="mt-1 text-center text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                  {bucket.rangeLabel}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
