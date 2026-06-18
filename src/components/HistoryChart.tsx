import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS, HISTORY_POINT_INTERVAL_MS } from '@/utils/constants'
import { useMemo, useState } from 'react'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

type ChartKeys = 'cpuOverall' | 'memoryPercentage' | 'gpuUtilization' | 'networkDownload' | 'networkUpload'

const ALL_LINES: { key: ChartKeys; name: string; color: string; axis: 'percent' | 'speed' }[] = [
  { key: 'cpuOverall', name: 'CPU', color: '#00d4aa', axis: 'percent' },
  { key: 'memoryPercentage', name: '内存', color: '#f0a030', axis: 'percent' },
  { key: 'gpuUtilization', name: 'GPU', color: '#ab47bc', axis: 'percent' },
  { key: 'networkDownload', name: '下行', color: '#4fc3f7', axis: 'speed' },
  { key: 'networkUpload', name: '上行', color: '#ef5350', axis: 'speed' },
]

const LIGHT_LINE_COLORS: Record<ChartKeys, string> = {
  cpuOverall: '#00886a',
  memoryPercentage: '#c07820',
  gpuUtilization: '#7b1fa2',
  networkDownload: '#0277bd',
  networkUpload: '#c62828',
}

export function HistoryChart() {
  const history = useMonitorStore(s => s.history)
  const historyWindowMinutes = useMonitorStore(s => s.historyWindowMinutes)
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]
  const [visible, setVisible] = useState<Record<string, boolean>>({
    cpuOverall: true,
    memoryPercentage: true,
    gpuUtilization: true,
    networkDownload: true,
    networkUpload: true,
  })

  const isDark = theme === 'dark'

  const getLineColor = (key: ChartKeys) => {
    if (isDark) return ALL_LINES.find(l => l.key === key)?.color || colors.accent
    return LIGHT_LINE_COLORS[key] || colors.accent
  }

  const chartData = useMemo(() => {
    const windowMs = historyWindowMinutes * 60 * 1000
    const now = Date.now()
    const cutoff = now - windowMs
    const inWindow = history.filter(h => h.timestamp >= cutoff)
    return inWindow.map(p => {
      const d = new Date(p.timestamp)
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      return { ...p, time }
    })
  }, [history, historyWindowMinutes])

  const expectedCount = Math.floor((historyWindowMinutes * 60 * 1000) / HISTORY_POINT_INTERVAL_MS)
  const coveragePct = chartData.length > 0
    ? Math.min(100, Math.round((chartData.length / expectedCount) * 100))
    : 0

  const formatPercent = (v: number | null | undefined) => {
    if (v === null || v === undefined || isNaN(v)) return '—'
    return `${Number(v).toFixed(1)}%`
  }
  const formatSpeed = (mb: number | null | undefined) => {
    if (mb === null || mb === undefined || isNaN(mb) || mb < 0) return '—'
    const num = Number(mb)
    if (num >= 1) return `${num.toFixed(2)} MB/s`
    return `${(num * 1024).toFixed(0)} KB/s`
  }

  const toggleLine = (key: string) => setVisible(v => ({ ...v, [key]: !v[key] }))

  const getSpeedMax = () => {
    const vals: number[] = []
    chartData.forEach(d => {
      if (d.networkDownload !== null && d.networkDownload !== undefined) vals.push(d.networkDownload)
      if (d.networkUpload !== null && d.networkUpload !== undefined) vals.push(d.networkUpload)
    })
    const max = Math.max(...vals, 0)
    if (max < 0.1) return 1
    return Math.ceil(max * 1.2)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
            历史趋势
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: `${colors.accent}18`, color: colors.accent }}
          >
            最近 {historyWindowMinutes} 分钟
          </span>
          {chartData.length > 0 && (
            <span
              className="text-[10px] tabular-nums"
              style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}
            >
              {coveragePct}% 完整
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_LINES.map(l => (
            <button
              key={l.key}
              onClick={() => toggleLine(l.key)}
              className="text-[10px] flex items-center gap-1 px-1 rounded transition-opacity"
              style={{
                opacity: visible[l.key] ? 1 : 0.35,
                color: getLineColor(l.key),
                fontFamily: '"DM Sans", sans-serif',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                padding: '2px 4px',
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: getLineColor(l.key) }}
              />
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {chartData.length < 2 ? (
        <div
          className="rounded flex flex-col items-center justify-center"
          style={{ height: 140, color: colors.textSecondary }}
        >
          <div className="text-[11px]">正在采集数据...</div>
          <div className="text-[10px] mt-1" style={{ opacity: 0.7 }}>
            至少需要约 30 秒以上的数据才能画出趋势线
          </div>
          <div className="mt-2 flex items-center gap-1">
            <span
              className="inline-flex w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: colors.accent }}
            />
            <span className="text-[10px] tabular-nums" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {chartData.length} / {expectedCount} 采样点
            </span>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              {ALL_LINES.map(l => (
                <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={getLineColor(l.key)} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={getLineColor(l.key)} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.chartGrid} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: colors.textSecondary }}
              axisLine={{ stroke: colors.chartGrid }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              yAxisId="percent"
              orientation="left"
              tick={{ fontSize: 10, fill: colors.textSecondary }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              width={42}
            />
            <YAxis
              yAxisId="speed"
              orientation="right"
              tick={{ fontSize: 10, fill: colors.textSecondary }}
              axisLine={false}
              tickLine={false}
              domain={[0, getSpeedMax()]}
              tickFormatter={v => (v >= 1 ? `${v.toFixed(0)}M` : '')}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: '"JetBrains Mono", monospace',
                color: colors.text,
                padding: '8px 12px',
                minWidth: 180,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
              labelStyle={{
                color: colors.textSecondary,
                marginBottom: 4,
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 11,
              }}
              formatter={(value: any, name: string) => {
                if (name === '下行' || name === '上行') {
                  return [formatSpeed(value as number), name]
                }
                return [formatPercent(value as number), name]
              }}
            />
            <Legend content={() => null} />

            {visible.cpuOverall && (
              <Area
                yAxisId="percent"
                type="monotone"
                dataKey="cpuOverall"
                name="CPU"
                stroke={getLineColor('cpuOverall')}
                fill={`url(#grad-cpuOverall)`}
                strokeWidth={1.8}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {visible.memoryPercentage && (
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="memoryPercentage"
                name="内存"
                stroke={getLineColor('memoryPercentage')}
                strokeWidth={1.8}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {visible.gpuUtilization && (
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="gpuUtilization"
                name="GPU"
                stroke={getLineColor('gpuUtilization')}
                strokeWidth={1.8}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {visible.networkDownload && (
              <Area
                yAxisId="speed"
                type="monotone"
                dataKey="networkDownload"
                name="下行"
                stroke={getLineColor('networkDownload')}
                fill={`url(#grad-networkDownload)`}
                strokeWidth={1.6}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {visible.networkUpload && (
              <Line
                yAxisId="speed"
                type="monotone"
                dataKey="networkUpload"
                name="上行"
                stroke={getLineColor('networkUpload')}
                strokeWidth={1.6}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
