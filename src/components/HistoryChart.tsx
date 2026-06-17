import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS } from '@/utils/constants'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MetricHistoryPoint } from '@/types'

export function HistoryChart() {
  const history = useMonitorStore(s => s.history)
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]

  const data = history.map(point => ({
    ...point,
    time: new Date(point.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }))

  const formatSpeed = (mb: number) => {
    if (mb >= 1) return `${mb.toFixed(1)}M`
    return `${(mb * 1024).toFixed(0)}K`
  }

  return (
    <div>
      <div className="text-xs font-medium mb-1.5" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
        历史趋势（最近{useMonitorStore.getState().historyWindowMinutes}分钟）
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.chartLine} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.chartLine} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.chartLineSecondary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.chartLineSecondary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ab47bc" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ab47bc" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fill: colors.textSecondary }}
            axisLine={{ stroke: colors.chartGrid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: colors.textSecondary }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
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
            }}
            labelStyle={{ color: colors.textSecondary }}
            formatter={(value: number, name: string) => {
              if (name === 'networkDownload' || name === 'networkUpload') {
                return [formatSpeed(value), name === 'networkDownload' ? '下行' : '上行']
              }
              return [`${value.toFixed(1)}%`, name]
            }}
          />
          <Area
            type="monotone"
            dataKey="cpuOverall"
            stroke={colors.chartLine}
            fill="url(#cpuGrad)"
            strokeWidth={1.5}
            dot={false}
            name="CPU"
          />
          <Area
            type="monotone"
            dataKey="memoryPercentage"
            stroke={colors.chartLineSecondary}
            fill="url(#memGrad)"
            strokeWidth={1.5}
            dot={false}
            name="内存"
          />
          <Area
            type="monotone"
            dataKey="gpuUtilization"
            stroke="#ab47bc"
            fill="url(#gpuGrad)"
            strokeWidth={1.5}
            dot={false}
            name="GPU"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
