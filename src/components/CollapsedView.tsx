import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS } from '@/utils/constants'
import { Cpu, HardDrive, ArrowDownCircle, ArrowUpCircle, Monitor } from 'lucide-react'
import { useMemo } from 'react'

export function CollapsedView() {
  const metrics = useMonitorStore(s => s.metrics)
  const history = useMonitorStore(s => s.history)
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]

  const formatSpeed = (mb: number) => {
    if (mb >= 1) return `${mb.toFixed(1)}M`
    return `${(mb * 1024).toFixed(0)}K`
  }

  const recentHistory = useMemo(() => history.slice(-20), [history])

  const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2) return null
    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const range = max - min || 1
    const w = 50
    const h = 16
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={w} height={h} className="opacity-60">
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

  const cpuHistory = recentHistory.map(h => h.cpuOverall)
  const memHistory = recentHistory.map(h => h.memoryPercentage)
  const gpuHistory = recentHistory.map(h => h.gpuUtilization)

  return (
    <div className="px-3 py-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Cpu size={10} style={{ color: colors.accent }} />
          <span className="text-[10px] font-medium" style={{ color: colors.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>CPU</span>
        </div>
        <MiniSparkline data={cpuHistory} color={colors.accent} />
        <span className="text-xs font-bold tabular-nums" style={{ color: colors.accent, fontFamily: '"JetBrains Mono", monospace' }}>
          {metrics.cpu.overall.toFixed(0)}%
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <HardDrive size={10} style={{ color: colors.accentSecondary }} />
          <span className="text-[10px] font-medium" style={{ color: colors.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>MEM</span>
        </div>
        <MiniSparkline data={memHistory} color={colors.accentSecondary} />
        <span className="text-xs font-bold tabular-nums" style={{ color: colors.accentSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
          {metrics.memory.percentage.toFixed(0)}%
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <ArrowDownCircle size={10} style={{ color: '#4fc3f7' }} />
          <ArrowUpCircle size={10} style={{ color: '#ef5350' }} />
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          <span className="text-[10px] tabular-nums" style={{ color: '#4fc3f7', fontFamily: '"JetBrains Mono", monospace' }}>
            ↓{formatSpeed(metrics.network.download)}
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: '#ef5350', fontFamily: '"JetBrains Mono", monospace' }}>
            ↑{formatSpeed(metrics.network.upload)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Monitor size={10} style={{ color: '#ab47bc' }} />
          <span className="text-[10px] font-medium" style={{ color: colors.textSecondary, fontFamily: '"DM Sans", sans-serif' }}>GPU</span>
        </div>
        <MiniSparkline data={gpuHistory} color="#ab47bc" />
        <span className="text-xs font-bold tabular-nums" style={{ color: '#ab47bc', fontFamily: '"JetBrains Mono", monospace' }}>
          {metrics.gpu.utilization.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
