import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS, ALERT_METRIC_LABELS } from '@/utils/constants'
import type { MetricKey, Position, AlertMetric } from '@/types'
import { X, GripVertical, Sun, Moon, Check, AlertTriangle } from 'lucide-react'
import { useRef } from 'react'

const METRIC_LABELS: Record<MetricKey, string> = {
  cpu: 'CPU 使用率',
  memory: '内存占用',
  network: '网络速度',
  gpu: 'GPU 利用率',
}

const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'top-left', label: '左上角' },
  { value: 'top-right', label: '右上角' },
  { value: 'bottom-left', label: '左下角' },
  { value: 'bottom-right', label: '右下角' },
  { value: 'free', label: '自由拖拽' },
]

export function SettingsPanel() {
  const closeSettings = useMonitorStore(s => s.toggleSettings)
  const toggleAlertHistory = useMonitorStore(s => s.toggleAlertHistory)
  const theme = useMonitorStore(s => s.theme)
  const toggleTheme = useMonitorStore(s => s.toggleTheme)
  const enabledMetrics = useMonitorStore(s => s.enabledMetrics)
  const toggleMetric = useMonitorStore(s => s.toggleMetric)
  const metricOrder = useMonitorStore(s => s.metricOrder)
  const reorderMetrics = useMonitorStore(s => s.reorderMetrics)
  const position = useMonitorStore(s => s.position)
  const setPosition = useMonitorStore(s => s.setPosition)
  const alertThresholds = useMonitorStore(s => s.alertThresholds)
  const setAlertThreshold = useMonitorStore(s => s.setAlertThreshold)
  const colors = THEME_COLORS[theme]

  const dragIndex = useRef<number | null>(null)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex.current !== null && dragIndex.current !== index) {
      reorderMetrics(dragIndex.current, index)
      dragIndex.current = index
    }
  }

  const handleDragEnd = () => {
    dragIndex.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={closeSettings}
    >
      <div
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: colors.bg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border}`,
          width: 340,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <span className="text-sm font-semibold" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
            设置
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleAlertHistory}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:opacity-80"
              style={{ color: colors.danger, background: `${colors.danger}15` }}
            >
              <AlertTriangle size={12} />
              告警历史
            </button>
            <button
              onClick={closeSettings}
              className="p-1 rounded transition-colors hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-4">
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
              主题
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors w-full"
              style={{ background: colors.card, border: `1px solid ${colors.border}` }}
            >
              {theme === 'dark' ? <Moon size={14} style={{ color: colors.accent }} /> : <Sun size={14} style={{ color: colors.accent }} />}
              <span className="text-xs" style={{ color: colors.text }}>
                {theme === 'dark' ? '深色模式' : '浅色模式'}
              </span>
              <span className="ml-auto text-xs" style={{ color: colors.textSecondary }}>点击切换</span>
            </button>
          </div>

          <div>
            <div className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
              窗口位置
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {POSITION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPosition(opt.value)}
                  className="px-2 py-1.5 rounded text-xs transition-all"
                  style={{
                    background: position === opt.value ? `${colors.accent}22` : colors.card,
                    border: `1px solid ${position === opt.value ? colors.accent : colors.border}`,
                    color: position === opt.value ? colors.accent : colors.text,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
              显示指标（拖拽排序，点击开关）
            </div>
            <div className="space-y-1">
              {metricOrder.map((key, index) => (
                <div
                  key={key}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                  style={{ background: colors.card, border: `1px solid ${colors.border}` }}
                >
                  <GripVertical size={12} style={{ color: colors.textSecondary }} />
                  <button
                    onClick={() => toggleMetric(key)}
                    className="flex items-center justify-center w-4 h-4 rounded border transition-colors"
                    style={{
                      borderColor: enabledMetrics.includes(key) ? colors.accent : colors.border,
                      background: enabledMetrics.includes(key) ? colors.accent : 'transparent',
                    }}
                  >
                    {enabledMetrics.includes(key) && <Check size={10} color="#fff" />}
                  </button>
                  <span className="text-xs" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
                    {METRIC_LABELS[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
              告警阈值
            </div>
            <div className="space-y-2">
              {(['cpu', 'memory', 'networkUpload', 'networkDownload', 'gpu', 'vram'] as AlertMetric[]).map(metric => (
                <div key={metric} className="flex items-center gap-2">
                  <label className="text-[11px] flex-shrink-0 w-28" style={{ color: colors.text }}>
                    {ALERT_METRIC_LABELS[metric]}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={alertThresholds[metric]}
                    onChange={e => setAlertThreshold(metric, Number(e.target.value))}
                    className="flex-1 px-2 py-1 rounded text-xs outline-none tabular-nums"
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
