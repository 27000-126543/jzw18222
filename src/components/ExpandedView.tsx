import { useMonitorStore } from '@/store/useMonitorStore'
import { MetricCard } from './MetricCard'
import { HistoryChart } from './HistoryChart'
import { THEME_COLORS } from '@/utils/constants'
import type { MetricKey } from '@/types'

export function ExpandedView() {
  const metricOrder = useMonitorStore(s => s.metricOrder)
  const enabledMetrics = useMonitorStore(s => s.enabledMetrics)
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]

  const visibleMetrics = metricOrder.filter(m => enabledMetrics.includes(m))

  return (
    <div className="px-3 py-2.5">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {visibleMetrics.map(key => (
          <MetricCard key={key} metricKey={key as MetricKey} />
        ))}
      </div>

      <div
        className="rounded-lg p-2"
        style={{ background: colors.card, border: `1px solid ${colors.border}` }}
      >
        <HistoryChart />
      </div>
    </div>
  )
}
