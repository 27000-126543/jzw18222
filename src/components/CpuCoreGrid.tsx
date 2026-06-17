import { THEME_COLORS } from '@/utils/constants'
import { useMonitorStore } from '@/store/useMonitorStore'

interface CpuCoreGridProps {
  cores: number[]
}

export function CpuCoreGrid({ cores }: CpuCoreGridProps) {
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]

  const getCoreColor = (usage: number): string => {
    if (usage < 30) return colors.accent
    if (usage < 60) return colors.accentSecondary
    if (usage < 85) return '#ef5350'
    return '#d32f2f'
  }

  return (
    <div className="flex gap-0.5 mt-1 flex-wrap">
      {cores.map((usage, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-sm relative overflow-hidden"
          style={{ background: `${getCoreColor(usage)}22` }}
          title={`Core ${i}: ${usage}%`}
        >
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-500"
            style={{
              height: `${usage}%`,
              background: getCoreColor(usage),
              borderRadius: '1px',
            }}
          />
        </div>
      ))}
    </div>
  )
}
