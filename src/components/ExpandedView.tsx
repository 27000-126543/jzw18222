import { useMonitorStore } from '@/store/useMonitorStore'
import { MetricCard } from './MetricCard'
import { HistoryChart } from './HistoryChart'
import { THEME_COLORS, ALERT_METRIC_LABELS, ALERT_METRIC_UNITS } from '@/utils/constants'
import type { MetricKey } from '@/types'
import { useMemo } from 'react'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'

export function ExpandedView() {
  const metricOrder = useMonitorStore(s => s.metricOrder)
  const enabledMetrics = useMonitorStore(s => s.enabledMetrics)
  const theme = useMonitorStore(s => s.theme)
  const apiStatus = useMonitorStore(s => s.apiStatus)
  const lastError = useMonitorStore(s => s.lastError)
  const activeAlerts = useMonitorStore(s => s.activeAlerts)
  const colors = THEME_COLORS[theme]

  const visibleMetrics = useMemo(
    () => metricOrder.filter(m => enabledMetrics.includes(m)),
    [metricOrder, enabledMetrics]
  )

  const statusBadge = apiStatus !== 'online' && (
    <div
      className="mb-2 text-[11px] px-3 py-1.5 rounded flex items-center gap-2"
      style={{
        background: apiStatus === 'offline' ? `${colors.danger}15` : `${colors.accentSecondary}15`,
        color: apiStatus === 'offline' ? colors.danger : colors.accentSecondary,
        border: `1px solid ${apiStatus === 'offline' ? `${colors.danger}44` : `${colors.accentSecondary}44`}`,
      }}
      title={lastError || undefined}
    >
      {apiStatus === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} className="animate-pulse" />}
      <span>
        {apiStatus === 'offline' ? '后端服务未连接（请确认已启动 `npm run dev`）' : '正在连接后端服务...'}
      </span>
    </div>
  )

  const alertBanner = activeAlerts.length > 0 && (
    <div
      className="mb-2 text-[11px] px-3 py-2 rounded"
      style={{
        background: `${colors.danger}18`,
        color: colors.danger,
        border: `1px solid ${colors.danger}55`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1 font-semibold">
        <AlertTriangle size={12} />
        <span>当前告警</span>
      </div>
      <div className="space-y-0.5">
        {activeAlerts.map(alert => (
          <div key={alert.metric} className="flex items-center justify-between tabular-nums" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <span>{ALERT_METRIC_LABELS[alert.metric]}</span>
            <span className="font-semibold">
              {alert.current.toFixed(1)} {ALERT_METRIC_UNITS[alert.metric]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="px-3 py-2.5">
      {statusBadge}
      {alertBanner}
      {visibleMetrics.length === 0 ? (
        <div
          className="text-xs py-6 text-center rounded-lg mb-3"
          style={{ background: colors.card, border: `1px dashed ${colors.border}`, color: colors.textSecondary }}
        >
          暂无显示指标，请在设置中勾选需要显示的监控项
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {visibleMetrics.map(key => (
            <MetricCard key={key} metricKey={key as MetricKey} />
          ))}
        </div>
      )}

      <div
        className="rounded-lg p-2"
        style={{ background: colors.card, border: `1px solid ${colors.border}` }}
      >
        <HistoryChart />
      </div>
    </div>
  )
}
