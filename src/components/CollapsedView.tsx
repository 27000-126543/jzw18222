import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS } from '@/utils/constants'
import type { MetricKey } from '@/types'
import { Cpu, HardDrive, Wifi, Monitor, AlertTriangle } from 'lucide-react'
import { useMemo } from 'react'

function getIcon(key: MetricKey, size: number, color: string) {
  switch (key) {
    case 'cpu': return <Cpu size={size} style={{ color }} />
    case 'memory': return <HardDrive size={size} style={{ color }} />
    case 'network': return <Wifi size={size} style={{ color }} />
    case 'gpu': return <Monitor size={size} style={{ color }} />
  }
}

const DARK_COLORS: Record<MetricKey, string> = {
  cpu: '#00d4aa',
  memory: '#f0a030',
  network: '#4fc3f7',
  gpu: '#ab47bc',
}

const LIGHT_COLORS: Record<MetricKey, string> = {
  cpu: '#00886a',
  memory: '#c07820',
  network: '#0277bd',
  gpu: '#7b1fa2',
}

const MiniSparkline = ({
  data,
  color,
  height = 16,
  width = 50,
}: {
  data: (number | null)[]
  color: string
  height?: number
  width?: number
}) => {
  const cleaned = data.filter(v => v !== null && !isNaN(v)) as number[]
  if (cleaned.length < 2) return <div style={{ width, height }} />
  const max = Math.max(...cleaned, 1)
  const min = Math.min(...cleaned, 0)
  const range = max - min || 1
  const validIndices = data.map((v, i) => (v !== null && !isNaN(v) ? i : -1)).filter(i => i >= 0)
  if (validIndices.length < 2) return <div style={{ width, height }} />

  const points = validIndices.map(idx => {
    const v = data[idx] as number
    const x = (idx / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="opacity-70" style={{ flexShrink: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const formatPercent = (v: number) => `${v.toFixed(0)}%`
const formatSpeed = (mb: number) => {
  if (mb < 0) return 'N/A'
  if (mb >= 1) return `${mb.toFixed(1)}M`
  return `${(mb * 1024).toFixed(0)}K`
}

export function CollapsedView() {
  const metrics = useMonitorStore(s => s.metrics)
  const history = useMonitorStore(s => s.history)
  const theme = useMonitorStore(s => s.theme)
  const enabledMetrics = useMonitorStore(s => s.enabledMetrics)
  const metricOrder = useMonitorStore(s => s.metricOrder)
  const apiStatus = useMonitorStore(s => s.apiStatus)
  const colors = THEME_COLORS[theme]

  const visibleMetrics = useMemo(
    () => metricOrder.filter(m => enabledMetrics.includes(m)),
    [metricOrder, enabledMetrics]
  )

  const recentHistory = useMemo(() => history.slice(-20), [history])

  const statusColor = apiStatus === 'online'
    ? colors.accent
    : apiStatus === 'offline'
    ? colors.danger
    : colors.accentSecondary

  const getColor = (key: MetricKey) => (theme === 'dark' ? DARK_COLORS : LIGHT_COLORS)[key]

  const renderItem = (key: MetricKey) => {
    const color = getColor(key)
    const unavailableColor = colors.unavailable
    let mainValue = ''
    let subValue = ''
    let available = false
    let error = ''

    switch (key) {
      case 'cpu':
        available = metrics.cpu.available && metrics.cpu.overall >= 0
        mainValue = available ? formatPercent(metrics.cpu.overall) : 'N/A'
        error = metrics.cpu.error || ''
        break
      case 'memory':
        available = metrics.memory.available && metrics.memory.percentage >= 0
        mainValue = available ? formatPercent(metrics.memory.percentage) : 'N/A'
        error = metrics.memory.error || ''
        break
      case 'network':
        available = metrics.network.available && (metrics.network.upload >= 0 || metrics.network.download >= 0)
        mainValue = available ? `↓${formatSpeed(metrics.network.download)}` : 'N/A'
        subValue = available ? `↑${formatSpeed(metrics.network.upload)}` : ''
        error = metrics.network.error || ''
        break
      case 'gpu':
        available = metrics.gpu.available && metrics.gpu.utilization >= 0
        mainValue = available ? formatPercent(metrics.gpu.utilization) : 'N/A'
        error = metrics.gpu.error || ''
        break
    }

    const displayColor = available ? color : unavailableColor
    const historyData = recentHistory.map(h => {
      switch (key) {
        case 'cpu': return h.cpuOverall
        case 'memory': return h.memoryPercentage
        case 'network': return h.networkDownload
        case 'gpu': return h.gpuUtilization
      }
    })

    if (key === 'network' && available) {
      return (
        <div key={key} className="flex items-center justify-between gap-2" title={error || undefined}>
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
            {getIcon(key, 10, displayColor)}
            <span className="text-[10px] font-medium" style={{ color: colors.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>NET</span>
          </div>
          <MiniSparkline data={historyData} color={displayColor} />
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-[10px] tabular-nums" style={{ color: '#4fc3f7', fontFamily: '"JetBrains Mono", monospace' }}>
              {mainValue}
            </span>
            <span className="text-[10px] tabular-nums" style={{ color: '#ef5350', fontFamily: '"JetBrains Mono", monospace' }}>
              {subValue}
            </span>
          </div>
        </div>
      )
    }

    return (
      <div
        key={key}
        className="flex items-center justify-between gap-2"
        title={available ? undefined : error || '指标不可用'}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
          {getIcon(key, 10, displayColor)}
          <span className="text-[10px] font-medium" style={{ color: colors.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>
            {key === 'cpu' ? 'CPU' : key === 'memory' ? 'MEM' : key === 'gpu' ? 'GPU' : 'NET'}
          </span>
          {!available && <AlertTriangle size={9} style={{ color: unavailableColor, opacity: 0.7 }} />}
        </div>
        <MiniSparkline data={historyData} color={displayColor} />
        <span className="text-xs font-bold tabular-nums" style={{ color: displayColor, fontFamily: '"JetBrains Mono", monospace', flexShrink: 0 }}>
          {mainValue}
        </span>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 space-y-1.5">
      {apiStatus !== 'online' && (
        <div
          className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
          style={{
            background: apiStatus === 'offline' ? `${colors.danger}15` : `${statusColor}15`,
            color: apiStatus === 'offline' ? colors.danger : statusColor,
            border: `1px solid ${apiStatus === 'offline' ? `${colors.danger}44` : `${statusColor}44`}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: statusColor,
              animation: apiStatus === 'connecting' ? 'pulse-glow 1.5s infinite' : undefined,
            }}
          />
          {apiStatus === 'offline' ? '未连接后端，数据不可用' : '正在连接后端服务...'}
        </div>
      )}
      {visibleMetrics.length === 0 ? (
        <div className="text-xs py-2 text-center" style={{ color: colors.textSecondary }}>
          暂无显示指标，请在设置中开启
        </div>
      ) : (
        visibleMetrics.map(renderItem)
      )}
    </div>
  )
}
