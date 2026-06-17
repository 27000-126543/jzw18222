export type Theme = 'dark' | 'light'

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'free'

export interface CpuMetrics {
  cores: number[]
  overall: number
}

export interface MemoryMetrics {
  used: number
  total: number
  percentage: number
}

export interface NetworkMetrics {
  upload: number
  download: number
}

export interface GpuMetrics {
  utilization: number
  vramUsed: number
  vramTotal: number
}

export interface SystemMetrics {
  cpu: CpuMetrics
  memory: MemoryMetrics
  network: NetworkMetrics
  gpu: GpuMetrics
}

export interface MetricHistoryPoint {
  timestamp: number
  cpuOverall: number
  memoryPercentage: number
  networkUpload: number
  networkDownload: number
  gpuUtilization: number
  gpuVramUsed: number
}

export interface ProcessInfo {
  pid: number
  name: string
  cpuUsage: number
  memoryUsage: number
  networkUsage: number
  gpuUsage: number
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
