import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS } from '@/utils/constants'
import type { MetricKey } from '@/types'
import { Cpu, HardDrive, Wifi, Monitor, AlertTriangle } from 'lucide-react'
import { CpuCoreGrid } from './CpuCoreGrid'
import { useMemo } from 'react'

interface MetricCardProps {
  metricKey: MetricKey
}

function getMetricIcon(key: MetricKey, color: string, size = 13) {
  switch (key) {
    case 'cpu': return <Cpu size={size} style={{ color }} />
    case 'memory': return <HardDrive size={size} style={{ color }} />
    case 'network': return <Wifi size={size} style={{ color }} />
    case 'gpu': return <Monitor size={size} style={{ color }} />
  }
}

const METRIC_COLORS: Record<MetricKey, string> = {
  cpu: '#00d4aa',
  memory: '#f0a030',
  network: '#4fc3f7',
  gpu: '#ab47bc',
}

const METRIC_LIGHT_COLORS: Record<MetricKey, string> = {
  cpu: '#00886a',
  memory: '#c07820',
  network: '#0277bd',
  gpu: '#7b1fa2',
}

const MiniCardSparkline = ({ data, color }: { data: (number | null)[]; color: string }) => {
  const cleaned = data.filter(v => v !== null && !isNaN(v)) as number[]
  if (cleaned.length < 2) return null
  const max = Math.max(...cleaned, 1)
  const min = Math.min(...cleaned, 0)
  const range = max - min || 1
  const w = 80
  const h = 24

  const validIndices = data.map((v, i) => (v !== null && !isNaN(v) ? i : -1)).filter(i => i >= 0)
  if (validIndices.length < 2) return null

  const points = validIndices.map(idx => {
    const v = data[idx] as number
    const x = (idx / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${h} ${points} ${w},${h}`
  const gradId = `mc-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 7)}`

  return (
    <svg width={w} height={h} className="mt-1 block">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MetricCard({ metricKey }: MetricCardProps) {
  const metrics = useMonitorStore(s => s.metrics)
  const history = useMonitorStore(s => s.history)
  const theme = useMonitorStore(s => s.theme)
  const openProcessModal = useMonitorStore(s => s.openProcessModal)
  const colors = THEME_COLORS[theme]
  const accentColor = (theme === 'dark' ? METRIC_COLORS : METRIC_LIGHT_COLORS)[metricKey]
  const unavailableColor = colors.unavailable

  const recentHistory = useMemo(() => history.slice(-30), [history])

  const formatSpeed = (mb: number) => {
    if (mb < 0) return '—'
    if (mb >= 1) return `${mb.toFixed(1)} MB/s`
    return `${(mb * 1024).toFixed(0)} KB/s`
  }

  const getHistoryData = (): (number | null)[] => {
    switch (metricKey) {
      case 'cpu': return recentHistory.map(h => h.cpuOverall)
      case 'memory': return recentHistory.map(h => h.memoryPercentage)
      case 'network': return recentHistory.map(h => h.networkDownload)
      case 'gpu': return recentHistory.map(h => h.gpuUtilization)
    }
  }

  const labelMap: Record<MetricKey, string> = {
    cpu: 'CPU',
    memory: '内存',
    network: '网络',
    gpu: 'GPU',
  }

  const unavailableBadge = (err?: string) => (
    <div
      className="rounded-md p-2"
      style={{ background: `${unavailableColor}10`, border: `1px dashed ${unavailableColor}66` }}
      title={err || '系统未提供该指标数据'}
    >
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={12} style={{ color: unavailableColor }} />
        <span className="text-[11px] font-medium" style={{ color: unavailableColor }}>
          不可用
        </span>
      </div>
      {err && (
        <div className="text-[10px] mt-1 leading-relaxed" style={{ color: unavailableColor, opacity: 0.85 }}>
          {err.length > 24 ? err.slice(0, 24) + '…' : err}
        </div>
      )}
    </div>
  )

  const renderValue = () => {
    switch (metricKey) {
      case 'cpu': {
        const available = metrics.cpu.available && metrics.cpu.overall >= 0
        if (!available) return unavailableBadge(metrics.cpu.error)
        return (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums" style={{ color: accentColor, fontFamily: '"JetBrains Mono", monospace' }}>
                {metrics.cpu.overall.toFixed(0)}
              </span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
            </div>
            {metrics.cpu.cores.length > 0 && <CpuCoreGrid cores={metrics.cpu.cores} />}
            <MiniCardSparkline data={getHistoryData()} color={accentColor} />
          </div>
        )
      }
      case 'memory': {
        const available = metrics.memory.available && metrics.memory.percentage >= 0
        if (!available) return unavailableBadge(metrics.memory.error)
        return (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums" style={{ color: accentColor, fontFamily: '"JetBrains Mono", monospace' }}>
                {metrics.memory.percentage.toFixed(0)}
              </span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
            </div>
            <div className="mt-0.5">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${accentColor}22` }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.memory.percentage))}%`, background: accentColor }}
                />
              </div>
              <div className="text-[10px] tabular-nums mt-0.5" style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                {metrics.memory.used.toFixed(1)} / {metrics.memory.total} GB
              </div>
            </div>
            <MiniCardSparkline data={getHistoryData()} color={accentColor} />
          </div>
        )
      }
      case 'network': {
        const available = metrics.network.available && (metrics.network.upload >= 0 || metrics.network.download >= 0)
        if (!available) return unavailableBadge(metrics.network.error)
        return (
          <div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: '#4fc3f7' }}>↓</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: '#4fc3f7', fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatSpeed(metrics.network.download)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: '#ef5350' }}>↑</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: '#ef5350', fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatSpeed(metrics.network.upload)}
                </span>
              </div>
            </div>
            <MiniCardSparkline data={getHistoryData()} color={accentColor} />
          </div>
        )
      }
      case 'gpu': {
        const available = metrics.gpu.available && (metrics.gpu.utilization >= 0 || metrics.gpu.vramUsed >= 0)
        if (!available) return unavailableBadge(metrics.gpu.error)
        const utilAvailable = metrics.gpu.utilization >= 0
        const vramAvailable = metrics.gpu.vramUsed >= 0 && metrics.gpu.vramTotal > 0
        return (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums" style={{ color: accentColor, fontFamily: '"JetBrains Mono", monospace' }}>
                {utilAvailable ? metrics.gpu.utilization.toFixed(0) : '—'}
              </span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                {utilAvailable ? '%' : ''}
              </span>
            </div>
            <div className="mt-0.5">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${accentColor}22` }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: vramAvailable ? `${Math.min(100, (metrics.gpu.vramUsed / metrics.gpu.vramTotal) * 100)}%` : '0%',
                    background: accentColor,
                  }}
                />
              </div>
              <div className="text-[10px] tabular-nums mt-0.5" style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                {vramAvailable
                  ? `${metrics.gpu.vramUsed.toFixed(1)} / ${metrics.gpu.vramTotal} GB VRAM`
                  : '显存信息不可用'}
              </div>
            </div>
            <MiniCardSparkline data={getHistoryData()} color={accentColor} />
          </div>
        )
      }
    }
  }

  return (
    <div
      className="rounded-lg p-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
      }}
      onClick={() => openProcessModal(metricKey)}
      title="点击查看占用该资源的进程列表"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {getMetricIcon(metricKey, accentColor)}
          <span className="text-xs font-medium" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
            {labelMap[metricKey]}
          </span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, opacity: 0.55 }} />
      </div>
      {renderValue()}
    </div>
  )
}
