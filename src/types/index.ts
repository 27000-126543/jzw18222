export type Theme = 'dark' | 'light'

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'free'

export interface CpuMetrics {
  cores: number[]
  overall: number
  available: boolean
  error?: string
}

export interface MemoryMetrics {
  used: number
  total: number
  percentage: number
  available: boolean
  error?: string
}

export interface NetworkMetrics {
  upload: number
  download: number
  interfaceName: string
  available: boolean
  error?: string
}

export interface GpuMetrics {
  utilization: number
  vramUsed: number
  vramTotal: number
  available: boolean
  error?: string
}

export interface SystemMetrics {
  cpu: CpuMetrics
  memory: MemoryMetrics
  network: NetworkMetrics
  gpu: GpuMetrics
}

export interface MetricHistoryPoint {
  timestamp: number
  cpuOverall: number | null
  memoryPercentage: number | null
  networkUpload: number | null
  networkDownload: number | null
  gpuUtilization: number | null
  gpuVramUsed: number | null
}

export interface ProcessInfo {
  pid: number
  name: string
  cpuUsage: number
  memoryUsage: number
  command: string
  user: string
  startTime: string
  networkConnections?: number
  gpuVramUsedMB?: number
}

export type MetricKey = 'cpu' | 'memory' | 'network' | 'gpu'

export interface MonitorSettings {
  enabledMetrics: MetricKey[]
  metricOrder: MetricKey[]
  position: Position
  customPosition: { x: number; y: number }
  theme: Theme
  historyWindowMinutes: number
}

export const METRIC_LABELS: Record<MetricKey, string> = {
  cpu: 'CPU',
  memory: '内存',
  network: '网络',
  gpu: 'GPU',
}

export const METRIC_ICONS: Record<MetricKey, string> = {
  cpu: 'Cpu',
  memory: 'MemoryStick',
  network: 'Wifi',
  gpu: 'Monitor',
}

export interface KillResult {
  success: boolean
  pid: number
  message: string
  error?: string
}
