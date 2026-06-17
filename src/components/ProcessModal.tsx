import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS } from '@/utils/constants'
import type { MetricKey } from '@/types'
import { X, Skull } from 'lucide-react'
import { useState } from 'react'

export function ProcessModal() {
  const processes = useMonitorStore(s => s.processes)
  const processModalMetric = useMonitorStore(s => s.processModalMetric)
  const closeProcessModal = useMonitorStore(s => s.closeProcessModal)
  const killProcess = useMonitorStore(s => s.killProcess)
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]

  const [confirmPid, setConfirmPid] = useState<number | null>(null)

  const labelMap: Record<MetricKey, string> = {
    cpu: 'CPU',
    memory: '内存',
    network: '网络',
    gpu: 'GPU',
  }

  const handleKill = (pid: number) => {
    if (confirmPid === pid) {
      killProcess(pid)
      setConfirmPid(null)
    } else {
      setConfirmPid(pid)
      setTimeout(() => setConfirmPid(null), 3000)
    }
  }

  const getMetricValue = (p: typeof processes[0]) => {
    if (!processModalMetric) return '-'
    switch (processModalMetric) {
      case 'cpu': return `${p.cpuUsage.toFixed(1)}%`
      case 'memory': return `${p.memoryUsage.toFixed(0)} MB`
      case 'network': return `${p.networkUsage.toFixed(1)} MB/s`
      case 'gpu': return `${p.gpuUsage.toFixed(1)}%`
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={closeProcessModal}
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
              {processModalMetric ? labelMap[processModalMetric] : ''} 进程列表
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${colors.accent}22`, color: colors.accent }}>
              {processes.length} 个进程
            </span>
          </div>
          <button
            onClick={closeProcessModal}
            className="p-1 rounded transition-colors hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: colors.textSecondary }}>PID</th>
                <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: colors.textSecondary }}>进程名</th>
                <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: colors.textSecondary }}>占用</th>
                <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: colors.textSecondary }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p, i) => (
                <tr
                  key={p.pid}
                  className="transition-colors"
                  style={{
                    borderBottom: i < processes.length - 1 ? `1px solid ${colors.border}` : undefined,
                    background: i % 2 === 0 ? 'transparent' : `${colors.accent}06`,
                  }}
                >
                  <td className="px-4 py-2 text-xs tabular-nums" style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                    {p.pid}
                  </td>
                  <td className="px-4 py-2 text-xs" style={{ color: colors.text, fontFamily: '"JetBrains Mono", monospace' }}>
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-xs text-right tabular-nums font-medium" style={{ color: colors.accent, fontFamily: '"JetBrains Mono", monospace' }}>
                    {getMetricValue(p)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleKill(p.pid)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-all"
                      style={{
                        background: confirmPid === p.pid ? colors.danger : `${colors.danger}18`,
                        color: confirmPid === p.pid ? '#fff' : colors.danger,
                        border: `1px solid ${confirmPid === p.pid ? colors.danger : `${colors.danger}44`}`,
                      }}
                    >
                      <Skull size={10} />
                      {confirmPid === p.pid ? '确认结束' : '结束'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
