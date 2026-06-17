import { useMonitorStore } from '@/store/useMonitorStore'
import { useDrag } from '@/hooks/useDrag'
import { useSystemMetrics } from '@/hooks/useSystemMetrics'
import { CollapsedView } from './CollapsedView'
import { ExpandedView } from './ExpandedView'
import { ProcessModal } from './ProcessModal'
import { SettingsPanel } from './SettingsPanel'
import { cn } from '@/lib/utils'
import { POSITION_STYLES, THEME_COLORS, COLLAPSED_WIDTH, EXPANDED_WIDTH } from '@/utils/constants'
import type { Position } from '@/types'
import { Maximize2, Minimize2, Settings } from 'lucide-react'

export function FloatingWidget() {
  const isExpanded = useMonitorStore(s => s.isExpanded)
  const toggleExpanded = useMonitorStore(s => s.toggleExpanded)
  const toggleSettings = useMonitorStore(s => s.toggleSettings)
  const showSettings = useMonitorStore(s => s.showSettings)
  const showProcessModal = useMonitorStore(s => s.showProcessModal)
  const position = useMonitorStore(s => s.position)
  const customPosition = useMonitorStore(s => s.customPosition)
  const theme = useMonitorStore(s => s.theme)
  const { onMouseDown } = useDrag()

  useSystemMetrics()

  const colors = THEME_COLORS[theme]
  const isDark = theme === 'dark'

  const getPositionStyle = (): React.CSSProperties => {
    if (position === 'free') {
      return {
        position: 'fixed',
        left: customPosition.x,
        top: customPosition.y,
      }
    }
    return {}
  }

  const positionClass = position !== 'free' ? POSITION_STYLES[position as Exclude<Position, 'free'>] : ''

  return (
    <>
      <div
        className={cn(
          'fixed z-50',
          positionClass,
          'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        )}
        style={{
          ...getPositionStyle(),
          width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        }}
      >
        <div
          className="rounded-xl overflow-hidden transition-shadow duration-300"
          style={{
            background: colors.bg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${colors.border}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 212, 170, 0.05), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 136, 106, 0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-1.5 cursor-move select-none group"
            style={{ borderBottom: `1px solid ${colors.border}` }}
            onMouseDown={onMouseDown}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: colors.accent }}
                />
                <div
                  className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                  style={{ background: colors.accent, opacity: 0.4 }}
                />
              </div>
              <span
                className="text-[10px] font-semibold tracking-[0.15em] uppercase"
                style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}
              >
                Sys Monitor
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); toggleSettings() }}
                className="p-1 rounded-md transition-all duration-200 hover:scale-110"
                style={{ color: colors.textSecondary }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.accent)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.textSecondary)}
              >
                <Settings size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpanded() }}
                className="p-1 rounded-md transition-all duration-200 hover:scale-110"
                style={{ color: colors.textSecondary }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.accent)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.textSecondary)}
              >
                {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            </div>
          </div>

          <div className="overflow-hidden">
            {isExpanded ? <ExpandedView /> : <CollapsedView />}
          </div>
        </div>
      </div>

      {showProcessModal && <ProcessModal />}
      {showSettings && <SettingsPanel />}
    </>
  )
}
