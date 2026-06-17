import { FloatingWidget } from '@/components/FloatingWidget'
import { useMonitorStore } from '@/store/useMonitorStore'
import { useEffect } from 'react'

export default function App() {
  const theme = useMonitorStore(s => s.theme)

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  const isDark = theme === 'dark'

  return (
    <div
      className="min-h-screen w-full overflow-hidden relative"
      style={{ background: isDark ? '#0a0e14' : '#eef1f5' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 20% 50%, rgba(0, 212, 170, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(171, 71, 188, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(240, 160, 48, 0.03) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 20% 50%, rgba(0, 136, 106, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(123, 31, 162, 0.03) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(192, 120, 32, 0.03) 0%, transparent 50%)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(0, 212, 170, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 170, 0.03) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0, 136, 106, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 136, 106, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <FloatingWidget />
    </div>
  )
}
