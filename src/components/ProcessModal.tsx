import React from 'react'
import { useMonitorStore } from '@/store/useMonitorStore'
import { THEME_COLORS } from '@/utils/constants'
import type { MetricKey } from '@/types'
import { X, Skull, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const LABELS: Record<MetricKey, string> = {
  cpu: 'CPU',
  memory: '内存',
  network: '网络',
  gpu: 'GPU',
}

export function ProcessModal() {
  const processes = useMonitorStore(s => s.processes)
  const processModalMetric = useMonitorStore(s => s.processModalMetric)
  const processesFetchError = useMonitorStore(s => s.processesFetchError)
  const killResults = useMonitorStore(s => s.killResults)
  const closeProcessModal = useMonitorStore(s => s.closeProcessModal)
  const killProcess = useMonitorStore(s => s.killProcess)
  const refreshProcesses = useMonitorStore(s => s.refreshProcesses)
  const theme = useMonitorStore(s => s.theme)
  const colors = THEME_COLORS[theme]

  const [confirmPid, setConfirmPid] = useState<number | null>(null)
  const [killingPids, setKillingPids] = useState<Set<number>>(new Set())
  const [localKillMsgs, setLocalKillMsgs] = useState<Record<number, { ok: boolean; msg: string; ts: number }>>({})
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      setRefreshing(true)
      try {
        await refreshProcesses()
      } finally {
        setTimeout(() => setRefreshing(false), 300)
      }
    }, 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refreshProcesses])

  const handleKill = async (pid: number) => {
    if (killingPids.has(pid)) return
    if (confirmPid !== pid) {
      setConfirmPid(pid)
      setTimeout(() => setConfirmPid(cp => (cp === pid ? null : cp)), 4000)
      return
    }
    setConfirmPid(null)
    setKillingPids(prev => new Set(prev).add(pid))
    const result = await killProcess(pid)
    setKillingPids(prev => {
      const n = new Set(prev)
      n.delete(pid)
      return n
    })
    setLocalKillMsgs(prev => ({
      ...prev,
      [pid]: { ok: result.success, msg: result.message, ts: Date.now() },
    }))
    setTimeout(() => {
      setLocalKillMsgs(prev => {
        const n = { ...prev }
        delete n[pid]
        return n
      })
    }, 8000)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshProcesses()
    } finally {
      setTimeout(() => setRefreshing(false), 300)
    }
  }

  const getMetricValue = (p: typeof processes[0]) => {
    const metric = processModalMetric
    if (!metric) return '-'
    switch (metric) {
      case 'cpu': return `${p.cpuUsage.toFixed(1)}%`
      case 'memory': return `${p.memoryUsage.toFixed(0)} MB`
      case 'network':
      case 'gpu':
        return p.cpuUsage > 0 || p.memoryUsage > 0
          ? `CPU ${p.cpuUsage.toFixed(1)}% · Mem ${p.memoryUsage.toFixed(0)}MB`
          : '—'
    }
  }

  const getMetricSortValue = (p: typeof processes[0]) => {
    const metric = processModalMetric
    if (!metric) return 0
    switch (metric) {
      case 'cpu': return p.cpuUsage
      case 'memory': return p.memoryUsage
      case 'network':
      case 'gpu': return p.cpuUsage
    }
  }

  const sortedProcesses = useMemo(() => {
    return [...processes].sort((a, b) => getMetricSortValue(b) - getMetricSortValue(a))
  }, [processes, processModalMetric])

  const pids = sortedProcesses.map(p => p.pid)
  const shownKillResults = killResults.filter(r => pids.includes(r.pid))

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={closeProcessModal}
    >
      <div
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: colors.bg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border}`,
          width: 520,
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: colors.text, fontFamily: '"DM Sans", sans-serif' }}>
              {processModalMetric ? LABELS[processModalMetric] : ''} 进程列表
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{ background: `${colors.accent}22`, color: colors.accent }}
            >
              {processes.length} 个进程
            </span>
            {shownKillResults.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {shownKillResults.map((r, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: r.success ? `${colors.accent}22` : `${colors.danger}22`,
                      color: r.success ? colors.accent : colors.danger,
                      border: `1px solid ${r.success ? `${colors.accent}55` : `${colors.danger}55`}`,
                    }}
                    title={r.message}
                  >
                    {r.success ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                    PID {r.pid}: {r.success ? '已结束' : '失败'}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 rounded transition-colors hover:opacity-80 disabled:opacity-40"
              style={{ color: colors.textSecondary }}
              title="手动刷新进程列表"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={closeProcessModal}
              className="p-1 rounded transition-colors hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {processesFetchError && (
          <div
            className="px-4 py-2 flex items-start gap-2 text-[11px]"
            style={{
              background: `${colors.danger}14`,
              color: colors.danger,
              borderBottom: `1px solid ${colors.danger}33`,
            }}
          >
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="font-medium">读取进程列表失败</div>
              <div className="opacity-85 mt-0.5" style={{ wordBreak: 'break-word' }}>{processesFetchError}</div>
            </div>
          </div>
        )}

        {sortedProcesses.length === 0 && !processesFetchError && (
          <div
            className="px-4 py-8 text-center text-xs"
            style={{ color: colors.textSecondary }}
          >
            暂无进程数据
          </div>
        )}

        <div className="overflow-auto flex-1" style={{ maxHeight: '62vh' }}>
          <table className="w-full">
            <thead
              style={{
                position: 'sticky',
                top: 0,
                background: colors.card,
                zIndex: 1,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-medium" style={{ color: colors.textSecondary }}>PID</th>
                <th className="text-left px-3 py-2 text-[11px] font-medium" style={{ color: colors.textSecondary }}>进程名</th>
                <th className="text-right px-3 py-2 text-[11px] font-medium" style={{ color: colors.textSecondary }}>占用</th>
                <th className="text-right px-3 py-2 text-[11px] font-medium" style={{ color: colors.textSecondary }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedProcesses.map((p, i) => {
                const killMsg = localKillMsgs[p.pid]
                const killing = killingPids.has(p.pid)
                const needsConfirm = confirmPid === p.pid
                return (
                  <React.Fragment key={p.pid}>
                    <tr
                      className="transition-colors"
                      style={{
                        borderBottom:
                          i < sortedProcesses.length - 1 ? `1px solid ${colors.border}` : undefined,
                        background: i % 2 === 0 ? 'transparent' : `${colors.accent}06`,
                      }}
                    >
                      <td className="px-3 py-2 text-[11px] tabular-nums" style={{ color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                        {p.pid}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-[11px]" style={{ color: colors.text, fontFamily: '"JetBrains Mono", monospace' }}>
                          {p.name}
                        </div>
                        {(p.user || p.command) && (
                          <div className="text-[9px] mt-0.5" style={{ color: colors.textSecondary, opacity: 0.8 }}>
                            {p.user || p.command}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] tabular-nums font-medium" style={{ color: colors.accent, fontFamily: '"JetBrains Mono", monospace' }}>
                        {getMetricValue(p)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleKill(p.pid)}
                          disabled={killing}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-all disabled:opacity-50"
                          style={{
                            background: needsConfirm ? colors.danger : `${colors.danger}16`,
                            color: needsConfirm ? '#fff' : colors.danger,
                            border: `1px solid ${needsConfirm ? colors.danger : `${colors.danger}55`}`,
                          }}
                        >
                          {killing ? (
                            <RefreshCw size={10} className="animate-spin" />
                          ) : (
                            <Skull size={10} />
                          )}
                          {killing ? '执行中' : needsConfirm ? '再次点击确认' : '结束进程'}
                        </button>
                      </td>
                    </tr>
                    {killMsg && (
                      <tr>
                        <td colSpan={4}
                          className="px-3 py-1.5"
                          style={{
                            background: killMsg.ok ? `${colors.accent}0e` : `${colors.danger}0e`,
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <div
                            className="flex items-center gap-1.5 text-[10px]"
                            style={{ color: killMsg.ok ? colors.accent : colors.danger }}
                          >
                            {killMsg.ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            <span className="font-medium">
                              {killMsg.ok ? '操作成功' : '结束失败'}
                            </span>
                            <span className="opacity-90" style={{ wordBreak: 'break-word' }}>
                              — {killMsg.msg}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div
          className="px-4 py-2 flex items-center justify-between text-[10px]"
          style={{
            borderTop: `1px solid ${colors.border}`,
            background: colors.card,
            color: colors.textSecondary,
          }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: refreshing ? colors.accentSecondary : colors.accent,
                animation: refreshing ? 'pulse-glow 1s infinite' : undefined,
              }}
            />
            每 4 秒自动刷新 · 点击"结束进程"需两次点击确认，防止误操作
          </span>
        </div>
      </div>
    </div>
  )
}
