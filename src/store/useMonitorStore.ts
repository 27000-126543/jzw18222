import { create } from 'zustand'
import type {
  SystemMetrics,
  MetricHistoryPoint,
  ProcessInfo,
  MetricKey,
  Position,
  Theme,
  KillResult,
} from '@/types'
import {
  DEFAULT_ENABLED_METRICS,
  DEFAULT_METRIC_ORDER,
  HISTORY_WINDOW_MINUTES,
  MAX_HISTORY_POINTS,
  API_BASE,
  LS_SETTINGS_KEY,
  HISTORY_POINT_INTERVAL_MS,
} from '@/utils/constants'

interface PersistedSettings {
  enabledMetrics: MetricKey[]
  metricOrder: MetricKey[]
  position: Position
  customPosition: { x: number; y: number }
  theme: Theme
  historyWindowMinutes: number
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
  position: Position
  customPosition: { x: number; y: number }
  theme: Theme
  enabledMetrics: MetricKey[]
  metricOrder: MetricKey[]
  historyWindowMinutes: number
  apiStatus: 'connecting' | 'online' | 'offline'
  lastError: string | null

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
  updateMetrics: () => Promise<void>
  clearKillResults: () => void
}

const initialSettings = loadSettings()

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
  position: initialSettings.position,
  customPosition: initialSettings.customPosition,
  theme: initialSettings.theme,
  enabledMetrics: initialSettings.enabledMetrics,
  metricOrder: initialSettings.metricOrder,
  historyWindowMinutes: initialSettings.historyWindowMinutes,
  apiStatus: 'connecting',
  lastError: null,

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

  toggleSettings: () => set(s => ({ showSettings: !s.showSettings })),

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
        return {
          metrics: {
            cpu: data.cpu,
            memory: data.memory,
            network: data.network,
            gpu: data.gpu,
          },
          history: newHistory,
          apiStatus: 'online',
          lastError: null,
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
