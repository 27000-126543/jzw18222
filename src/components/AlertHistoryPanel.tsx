import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS, ALERT_METRIC_LABELS, ALERT_METRIC_UNITS } from '@/utils/constants'
import type { AlertMetric } from '@/types'
import { X, Trash2 } from 'lucide-react'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return '—'
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  if (mins > 0) return `${mins}m ${secs % 60}s`
  return `${secs}s`
}

function formatValue(metric: AlertMetric, value: number): string {
  const unit = ALERT_METRIC_UNITS[metric]
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'MB/s') {
    if (value >= 1) return `${value.toFixed(2)} MB/s`
    return `${(value * 1024).toFixed(0)} KB/s`
  }
  return `${value}${unit}`
}

export function AlertHistoryPanel() {
  const closeAlertHistory = useMonitorStore(s => s.toggleAlertHistory)
  const clearAlertRecords = useMonitorStore(s => s.clearAlertRecords)
  const jumpToAlertRecord = useMonitorStore(s => s.jumpToAlertRecord)
  const alertRecords = useMonitorStore(s => s.alertRecords)
  const activeAlerts = useMonitorStore(s => s.activeAlerts)
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]

  const sortedRecords = [...alertRecords]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 100)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={closeAlertHistory}
    >
      <div
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: colors.bg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border}`,
          width: 380,
          maxHeight: '80vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <span className="text-sm font-semibold" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
            告警历史
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={clearAlertRecords}
              className="p-1 rounded transition-colors hover:opacity-80"
              style={{ color: colors.textSecondary }}
              title="清空记录"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={closeAlertHistory}
              className="p-1 rounded transition-colors hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 48px)' }}>
          {activeAlerts.length > 0 && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="text-xs font-medium mb-2" style={{ color: colors.danger }}>
                当前活跃告警（{activeAlerts.length}）
              </div>
              <div className="space-y-1.5">
                {activeAlerts.map(alert => (
                  <div
                    key={alert.metric}
                    className="px-3 py-2 rounded-lg"
                    style={{
                      background: `${colors.danger}18`,
                      border: `1px solid ${colors.danger}50`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: colors.danger, fontFamily: '"DM Sans", sans-serif' }}>
                        {ALERT_METRIC_LABELS[alert.metric]}
                      </span>
                      <span className="text-[10px] tabular-nums" style={{ color: colors.danger, fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatTime(alert.triggeredAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] tabular-nums" style={{ color: colors.text, fontFamily: '"JetBrains Mono", monospace' }}>
                        当前: {formatValue(alert.metric, alert.current)}
                      </span>
                      <span className="text-[11px] tabular-nums" style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                        峰值: {formatValue(alert.metric, alert.peak)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3">
            <div className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
              历史记录（{sortedRecords.length}{alertRecords.length > sortedRecords.length ? ` / ${alertRecords.length}` : ''}）
            </div>
            {sortedRecords.length === 0 ? (
              <div className="py-6 text-center">
                <span className="text-[11px]" style={{ color: colors.textSecondary }}>
                  暂无告警记录
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sortedRecords.map(record => (
                  <button
                    key={record.id}
                    onClick={() => jumpToAlertRecord(record.startedAt)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${colors.accent}14`
                      e.currentTarget.style.borderColor = `${colors.accent}50`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = colors.card
                      e.currentTarget.style.borderColor = colors.border
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
                        {ALERT_METRIC_LABELS[record.metric]}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded tabular-nums"
                        style={{
                          background: record.endedAt === null ? `${colors.danger}18` : `${colors.textSecondary}18`,
                          color: record.endedAt === null ? colors.danger : colors.textSecondary,
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        {record.endedAt === null ? '进行中' : '已结束'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] tabular-nums" style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatTime(record.startedAt)} → {record.endedAt === null ? '—' : formatTime(record.endedAt)}
                      </span>
                      <span className="text-[10px] tabular-nums" style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                        持续 {formatDuration(record.durationMs)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[10px] tabular-nums" style={{ color: colors.accent, fontFamily: '"JetBrains Mono", monospace' }}>
                        峰值: {formatValue(record.metric, record.peak)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
