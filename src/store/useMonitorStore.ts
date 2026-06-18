import { create } from 'zustand'
import type {
  SystemMetrics,
  MetricHistoryPoint,
  ProcessInfo,
  MetricKey,
  Position,
  Theme,
  KillResult,
  AlertThresholds,
  ActiveAlert,
  AlertRecord,
  AlertMetric,
  ProcessSortKey,
} from '@/types'
import {
  DEFAULT_ENABLED_METRICS,
  DEFAULT_METRIC_ORDER,
  HISTORY_WINDOW_MINUTES,
  MAX_HISTORY_POINTS,
  API_BASE,
  LS_SETTINGS_KEY,
  HISTORY_POINT_INTERVAL_MS,
  DEFAULT_ALERT_THRESHOLDS,
  MAX_ALERT_RECORDS,
  DEFAULT_PROCESS_SORT_KEY,
  DEFAULT_PROCESS_SEARCH,
} from '@/utils/constants'

interface PersistedSettings {
  enabledMetrics: MetricKey[]
  metricOrder: MetricKey[]
  position: Position
  customPosition: { x: number; y: number }
  theme: Theme
  historyWindowMinutes: number
  alertThresholds: AlertThresholds
  processSearch: string
  processSortKey: ProcessSortKey
  processSortAsc: boolean
  alertRecords: AlertRecord[]
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        enabledMetrics: parsed.enabledMetrics || DEFAULT_ENABLED_METRICS,
        metricOrder: parsed.metricOrder || DEFAULT_METRIC_ORDER,
        position: parsed.position || 'top-right',
        customPosition: parsed.customPosition || { x: 0, y: 0 },
        theme: parsed.theme || 'dark',
        historyWindowMinutes: parsed.historyWindowMinutes || HISTORY_WINDOW_MINUTES,
        alertThresholds: { ...DEFAULT_ALERT_THRESHOLDS, ...(parsed.alertThresholds || {}) },
        processSearch: parsed.processSearch || DEFAULT_PROCESS_SEARCH,
        processSortKey: parsed.processSortKey || DEFAULT_PROCESS_SORT_KEY,
        processSortAsc: parsed.processSortAsc ?? false,
        alertRecords: Array.isArray(parsed.alertRecords) ? parsed.alertRecords : [],
      }
    }
  } catch { }
  const sysTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return {
    enabledMetrics: [...DEFAULT_ENABLED_METRICS],
    metricOrder: [...DEFAULT_METRIC_ORDER],
    position: 'top-right',
    customPosition: { x: 0, y: 0 },
    theme: sysTheme,
    historyWindowMinutes: HISTORY_WINDOW_MINUTES,
    alertThresholds: { ...DEFAULT_ALERT_THRESHOLDS },
    processSearch: DEFAULT_PROCESS_SEARCH,
    processSortKey: DEFAULT_PROCESS_SORT_KEY,
    processSortAsc: false,
    alertRecords: [],
  }
}

function saveSettings(settings: PersistedSettings) {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings))
  } catch { }
}

const defaultMetrics: SystemMetrics = {
  cpu: { cores: [], overall: -1, available: false, error: '正在获取...' },
  memory: { used: -1, total: -1, percentage: -1, available: false, error: '正在获取...' },
  network: { upload: -1, download: -1, interfaceName: '', available: false, error: '正在获取...' },
  gpu: { utilization: -1, vramUsed: -1, vramTotal: -1, available: false, error: '正在获取...' },
}

interface MonitorState {
  metrics: SystemMetrics
  history: MetricHistoryPoint[]
  processes: ProcessInfo[]
  processesMetric: MetricKey | null
  processesFetchError: string | null
  processMetricUnavailable: string | null
  killResults: KillResult[]
  isExpanded: boolean
  showProcessModal: boolean
  processModalMetric: MetricKey | null
  showSettings: boolean
  showAlertHistory: boolean
  position: Position
  customPosition: { x: number; y: number }
  theme: Theme
  enabledMetrics: MetricKey[]
  metricOrder: MetricKey[]
  historyWindowMinutes: number
  apiStatus: 'connecting' | 'online' | 'offline'
  lastError: string | null
  alertThresholds: AlertThresholds
  activeAlerts: ActiveAlert[]
  alertRecords: AlertRecord[]
  processSearch: string
  processSortKey: ProcessSortKey
  processSortAsc: boolean
  chartJumpTs: number | null

  toggleExpanded: () => void
  setPosition: (pos: Position) => void
  setCustomPosition: (x: number, y: number) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  toggleMetric: (metric: MetricKey) => void
  reorderMetrics: (fromIndex: number, toIndex: number) => void
  openProcessModal: (metric: MetricKey) => void
  refreshProcesses: () => Promise<void>
  closeProcessModal: () => void
  killProcess: (pid: number) => Promise<KillResult>
  toggleSettings: () => void
  toggleAlertHistory: () => void
  setAlertThreshold: (metric: AlertMetric, value: number) => void
  setProcessSearch: (s: string) => void
  setProcessSortKey: (key: ProcessSortKey) => void
  toggleProcessSortAsc: () => void
  jumpToAlertRecord: (ts: number) => void
  clearChartJump: () => void
  clearAlertRecords: () => void
  updateMetrics: () => Promise<void>
  clearKillResults: () => void
}

const initialSettings = loadSettings()

function getVramPercentage(m: SystemMetrics['gpu']): number {
  if (!m.available || m.vramTotal <= 0) return -1
  return Math.round((m.vramUsed / m.vramTotal) * 1000) / 10
}

function detectAlerts(metrics: SystemMetrics, thresholds: AlertThresholds): { metric: AlertMetric; value: number }[] {
  const out: { metric: AlertMetric; value: number }[] = []
  if (metrics.cpu.available && metrics.cpu.overall >= 0 && metrics.cpu.overall >= thresholds.cpu) {
    out.push({ metric: 'cpu', value: metrics.cpu.overall })
  }
  if (metrics.memory.available && metrics.memory.percentage >= 0 && metrics.memory.percentage >= thresholds.memory) {
    out.push({ metric: 'memory', value: metrics.memory.percentage })
  }
  if (metrics.network.available && metrics.network.upload >= 0 && metrics.network.upload >= thresholds.networkUpload) {
    out.push({ metric: 'networkUpload', value: metrics.network.upload })
  }
  if (metrics.network.available && metrics.network.download >= 0 && metrics.network.download >= thresholds.networkDownload) {
    out.push({ metric: 'networkDownload', value: metrics.network.download })
  }
  if (metrics.gpu.available && metrics.gpu.utilization >= 0 && metrics.gpu.utilization >= thresholds.gpu) {
    out.push({ metric: 'gpu', value: metrics.gpu.utilization })
  }
  const vramPct = getVramPercentage(metrics.gpu)
  if (metrics.gpu.available && vramPct >= 0 && vramPct >= thresholds.vram) {
    out.push({ metric: 'vram', value: vramPct })
  }
  return out
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  metrics: defaultMetrics,
  history: [],
  processes: [],
  processesMetric: null,
  processesFetchError: null,
  processMetricUnavailable: null,
  killResults: [],
  isExpanded: false,
  showProcessModal: false,
  processModalMetric: null,
  showSettings: false,
  showAlertHistory: false,
  position: initialSettings.position,
  customPosition: initialSettings.customPosition,
  theme: initialSettings.theme,
  enabledMetrics: initialSettings.enabledMetrics,
  metricOrder: initialSettings.metricOrder,
  historyWindowMinutes: initialSettings.historyWindowMinutes,
  apiStatus: 'connecting',
  lastError: null,
  alertThresholds: initialSettings.alertThresholds,
  activeAlerts: [],
  alertRecords: initialSettings.alertRecords,
  processSearch: initialSettings.processSearch,
  processSortKey: initialSettings.processSortKey,
  processSortAsc: initialSettings.processSortAsc,
  chartJumpTs: null,

  toggleExpanded: () => set(s => ({ isExpanded: !s.isExpanded })),

  setPosition: (pos) => {
    set({ position: pos })
    saveSettings({ ...get(), position: pos })
  },

  setCustomPosition: (x, y) => {
    set({ customPosition: { x, y }, position: 'free' })
    saveSettings({ ...get(), customPosition: { x, y }, position: 'free' })
  },

  setTheme: (theme) => {
    set({ theme })
    saveSettings({ ...get(), theme })
  },

  toggleTheme: () => {
    const newTheme: Theme = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: newTheme })
    saveSettings({ ...get(), theme: newTheme })
  },

  toggleMetric: (metric) => set(s => {
    const enabled = s.enabledMetrics.includes(metric)
      ? s.enabledMetrics.filter(m => m !== metric)
      : [...s.enabledMetrics, metric]
    const next = { ...s, enabledMetrics: enabled }
    saveSettings(next)
    return next
  }),

  reorderMetrics: (fromIndex, toIndex) => set(s => {
    const newOrder = [...s.metricOrder]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    const next = { ...s, metricOrder: newOrder }
    saveSettings(next)
    return next
  }),

  openProcessModal: async (metric) => {
    set({
      showProcessModal: true,
      processModalMetric: metric,
      processesMetric: metric,
      processesFetchError: null,
      processMetricUnavailable: null,
    })
    await get().refreshProcesses()
  },

  refreshProcesses: async () => {
    const metric = get().processesMetric || 'cpu'
    try {
      const res = await fetch(`${API_BASE}/processes?metric=${metric}&limit=20`)
      const data = await res.json()
      if (data.success) {
        set({
          processes: data.processes,
          processesFetchError: null,
          processMetricUnavailable: data.metricUnavailable || null,
        })
      } else {
        set({ processes: [], processesFetchError: data.error || '获取进程列表失败', processMetricUnavailable: null })
      }
    } catch (e: any) {
      set({
        processes: [],
        processesFetchError: `网络错误：${e?.message || '连接后端服务失败，请确认已启动 API 服务'}`,
        processMetricUnavailable: null,
      })
    }
  },

  closeProcessModal: () => set({ showProcessModal: false, processModalMetric: null, killResults: [] }),

  killProcess: async (pid) => {
    try {
      const res = await fetch(`${API_BASE}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid }),
      })
      const data = (await res.json()) as KillResult
      set(s => ({ killResults: [...s.killResults, data] }))
      await get().refreshProcesses()
      return data
    } catch (e: any) {
      const fail: KillResult = {
        success: false,
        pid,
        message: `请求失败：${e?.message || '无法连接后端服务'}`,
      }
      set(s => ({ killResults: [...s.killResults, fail] }))
      return fail
    }
  },

  toggleSettings: () => set(s => ({ showSettings: !s.showSettings, showAlertHistory: false })),

  toggleAlertHistory: () => set(s => ({ showAlertHistory: !s.showAlertHistory, showSettings: false })),

  setAlertThreshold: (metric, value) => {
    const next = { ...get().alertThresholds, [metric]: Math.max(0, value) }
    set({ alertThresholds: next })
    saveSettings({ ...get(), alertThresholds: next })
  },

  setProcessSearch: (s) => {
    set({ processSearch: s })
    saveSettings({ ...get(), processSearch: s })
  },

  setProcessSortKey: (key) => {
    set({ processSortKey: key })
    saveSettings({ ...get(), processSortKey: key })
  },

  toggleProcessSortAsc: () => set(s => {
    const next = !s.processSortAsc
    saveSettings({ ...get(), processSortAsc: next })
    return { processSortAsc: next }
  }),

  jumpToAlertRecord: (ts) => set({ chartJumpTs: ts, showAlertHistory: false, isExpanded: true }),
  clearChartJump: () => set({ chartJumpTs: null }),

  clearAlertRecords: () => {
    set({ alertRecords: [] })
    saveSettings({ ...get(), alertRecords: [] })
  },

  updateMetrics: async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as SystemMetrics & { timestamp: number }
      const timestamp = data.timestamp || Date.now()

      const point: MetricHistoryPoint = {
        timestamp,
        cpuOverall: data.cpu.available && data.cpu.overall >= 0 ? data.cpu.overall : null,
        memoryPercentage: data.memory.available && data.memory.percentage >= 0 ? data.memory.percentage : null,
        networkUpload: data.network.available && data.network.upload >= 0 ? data.network.upload : null,
        networkDownload: data.network.available && data.network.download >= 0 ? data.network.download : null,
        gpuUtilization: data.gpu.available && data.gpu.utilization >= 0 ? data.gpu.utilization : null,
        gpuVramUsed: data.gpu.available && data.gpu.vramUsed >= 0 ? data.gpu.vramUsed : null,
      }

      set(s => {
        const newHistory = [...s.history, point]
        const maxPoints = Math.floor((s.historyWindowMinutes * 60 * 1000) / HISTORY_POINT_INTERVAL_MS)
        if (newHistory.length > maxPoints) {
          newHistory.splice(0, newHistory.length - maxPoints)
        }

        const metricsSnapshot: SystemMetrics = {
          cpu: data.cpu, memory: data.memory, network: data.network, gpu: data.gpu,
        }
        const triggered = detectAlerts(metricsSnapshot, s.alertThresholds)

        let newActive = [...s.activeAlerts]
        const triggeredKeys = new Set(triggered.map(t => t.metric))
        const now = Date.now()

        let newRecords = [...s.alertRecords]
        let recordsChanged = false

        for (const active of newActive) {
          if (!triggeredKeys.has(active.metric)) {
            const idx = newRecords.findIndex(r => r.metric === active.metric && r.endedAt === null)
            if (idx >= 0) {
              newRecords[idx] = {
                ...newRecords[idx],
                endedAt: now,
                durationMs: now - newRecords[idx].startedAt,
              }
              recordsChanged = true
            }
          }
        }
        newActive = newActive.filter(a => triggeredKeys.has(a.metric))

        for (const t of triggered) {
          const existing = newActive.find(a => a.metric === t.metric)
          if (existing) {
            existing.current = t.value
            existing.peak = Math.max(existing.peak, t.value)
            const idx = newRecords.findIndex(r => r.metric === t.metric && r.endedAt === null)
            if (idx >= 0 && newRecords[idx].peak < existing.peak) {
              newRecords[idx].peak = existing.peak
              recordsChanged = true
            }
          } else {
            newActive.push({ metric: t.metric, triggeredAt: now, peak: t.value, current: t.value })
            newRecords.push({
              id: `${t.metric}-${now}-${Math.random().toString(36).slice(2, 7)}`,
              metric: t.metric,
              startedAt: now,
              endedAt: null,
              peak: t.value,
              durationMs: null,
            })
            recordsChanged = true
          }
        }

        if (recordsChanged && newRecords.length > MAX_ALERT_RECORDS) {
          newRecords = newRecords.slice(newRecords.length - MAX_ALERT_RECORDS)
        }

        if (recordsChanged) {
          saveSettings({ ...s, alertRecords: newRecords })
        }

        return {
          metrics: metricsSnapshot,
          history: newHistory,
          apiStatus: 'online',
          lastError: null,
          activeAlerts: newActive,
          alertRecords: newRecords,
        }
      })
    } catch (e: any) {
      const msg = `无法获取系统数据：${e?.message || '连接后端失败'}`
      set(s => {
        const fallback: SystemMetrics = {
          cpu: { ...s.metrics.cpu, available: false, error: msg },
          memory: { ...s.metrics.memory, available: false, error: msg },
          network: { ...s.metrics.network, available: false, error: msg },
          gpu: { ...s.metrics.gpu, available: false, error: msg },
        }
        return {
          metrics: fallback,
          apiStatus: 'offline',
          lastError: msg,
        }
      })
    }
  },

  clearKillResults: () => set({ killResults: [] }),
}))
