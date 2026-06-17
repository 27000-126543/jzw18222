import { create } from 'zustand'
import type { SystemMetrics, MetricHistoryPoint, ProcessInfo, MetricKey, Position, Theme } from '@/types'
import { simulateCpu, simulateMemory, simulateNetwork, simulateGpu, simulateProcesses } from '@/utils/dataSimulator'
import { DEFAULT_ENABLED_METRICS, DEFAULT_METRIC_ORDER, HISTORY_WINDOW_MINUTES, MAX_HISTORY_POINTS } from '@/utils/constants'

interface MonitorState {
  metrics: SystemMetrics
  history: MetricHistoryPoint[]
  processes: ProcessInfo[]
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

  toggleExpanded: () => void
  setPosition: (pos: Position) => void
  setCustomPosition: (x: number, y: number) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  toggleMetric: (metric: MetricKey) => void
  reorderMetrics: (fromIndex: number, toIndex: number) => void
  openProcessModal: (metric: MetricKey) => void
  closeProcessModal: () => void
  killProcess: (pid: number) => void
  toggleSettings: () => void
  updateMetrics: () => void
}

const initialCpu = simulateCpu()
const initialMemory = simulateMemory()
const initialNetwork = simulateNetwork()
const initialGpu = simulateGpu()

const initialMetrics: SystemMetrics = {
  cpu: initialCpu,
  memory: initialMemory,
  network: initialNetwork,
  gpu: initialGpu,
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  metrics: initialMetrics,
  history: [],
  processes: [],
  isExpanded: false,
  showProcessModal: false,
  processModalMetric: null,
  showSettings: false,
  position: 'top-right',
  customPosition: { x: 0, y: 0 },
  theme: (localStorage.getItem('monitor-theme') as Theme) || 'dark',
  enabledMetrics: [...DEFAULT_ENABLED_METRICS],
  metricOrder: [...DEFAULT_METRIC_ORDER],
  historyWindowMinutes: HISTORY_WINDOW_MINUTES,

  toggleExpanded: () => set(s => ({ isExpanded: !s.isExpanded })),

  setPosition: (pos) => set({ position: pos }),

  setCustomPosition: (x, y) => set({ customPosition: { x, y }, position: 'free' }),

  setTheme: (theme) => {
    localStorage.setItem('monitor-theme', theme)
    set({ theme })
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('monitor-theme', newTheme)
    set({ theme: newTheme })
  },

  toggleMetric: (metric) => set(s => {
    const enabled = s.enabledMetrics.includes(metric)
      ? s.enabledMetrics.filter(m => m !== metric)
      : [...s.enabledMetrics, metric]
    return { enabledMetrics: enabled }
  }),

  reorderMetrics: (fromIndex, toIndex) => set(s => {
    const newOrder = [...s.metricOrder]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    return { metricOrder: newOrder }
  }),

  openProcessModal: (metric) => {
    const processes = simulateProcesses(metric)
    set({ showProcessModal: true, processModalMetric: metric, processes })
  },

  closeProcessModal: () => set({ showProcessModal: false, processModalMetric: null }),

  killProcess: (pid) => set(s => ({
    processes: s.processes.filter(p => p.pid !== pid),
  })),

  toggleSettings: () => set(s => ({ showSettings: !s.showSettings })),

  updateMetrics: () => {
    const cpu = simulateCpu()
    const memory = simulateMemory()
    const network = simulateNetwork()
    const gpu = simulateGpu()
    const newMetrics: SystemMetrics = { cpu, memory, network, gpu }

    const historyPoint: MetricHistoryPoint = {
      timestamp: Date.now(),
      cpuOverall: cpu.overall,
      memoryPercentage: memory.percentage,
      networkUpload: network.upload,
      networkDownload: network.download,
      gpuUtilization: gpu.utilization,
      gpuVramUsed: gpu.vramUsed,
    }

    set(s => {
      const newHistory = [...s.history, historyPoint]
      if (newHistory.length > MAX_HISTORY_POINTS) {
        newHistory.splice(0, newHistory.length - MAX_HISTORY_POINTS)
      }
      return { metrics: newMetrics, history: newHistory }
    })
  },
}))
