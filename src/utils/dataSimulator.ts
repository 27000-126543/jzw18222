import type { CpuMetrics, MemoryMetrics, NetworkMetrics, GpuMetrics, ProcessInfo } from '@/types'
import { PROCESS_NAMES } from './constants'

let cpuCoreCount = navigator.hardwareConcurrency || 8
let cpuValues: number[] = Array(cpuCoreCount).fill(0).map(() => 20 + Math.random() * 30)
let memBase = 55 + Math.random() * 15
let netDownBase = 5 + Math.random() * 10
let netUpBase = 1 + Math.random() * 3
let gpuBase = 30 + Math.random() * 20
let vramBase = 3 + Math.random() * 2

function randomWalk(current: number, min: number, max: number, volatility: number): number {
  const change = (Math.random() - 0.5) * 2 * volatility
  let next = current + change
  if (next < min) next = min + Math.random() * volatility
  if (next > max) next = max - Math.random() * volatility
  return Math.round(next * 10) / 10
}

export function simulateCpu(): CpuMetrics {
  cpuValues = cpuValues.map(v => randomWalk(v, 0, 100, 8))
  const overall = Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length * 10) / 10
  return { cores: cpuValues.map(v => Math.round(v)), overall }
}

export function simulateMemory(totalGB: number = 16): MemoryMetrics {
  memBase = randomWalk(memBase, 40, 85, 2)
  const used = Math.round((memBase / 100) * totalGB * 100) / 100
  return { used, total: totalGB, percentage: Math.round(memBase * 10) / 10 }
}

export function simulateNetwork(): NetworkMetrics {
  if (Math.random() < 0.1) {
    netDownBase = 20 + Math.random() * 30
    netUpBase = 3 + Math.random() * 7
  } else {
    netDownBase = randomWalk(netDownBase, 0, 50, 3)
    netUpBase = randomWalk(netUpBase, 0, 10, 1.5)
  }
  return {
    download: Math.round(Math.max(0, netDownBase) * 100) / 100,
    upload: Math.round(Math.max(0, netUpBase) * 100) / 100,
  }
}

export function simulateGpu(vramTotalGB: number = 12): GpuMetrics {
  gpuBase = randomWalk(gpuBase, 0, 100, 5)
  vramBase = randomWalk(vramBase, 2, Math.min(10, vramTotalGB), 0.3)
  return {
    utilization: Math.round(gpuBase * 10) / 10,
    vramUsed: Math.round(vramBase * 100) / 100,
    vramTotal: vramTotalGB,
  }
}

export function simulateProcesses(metricType: string): ProcessInfo[] {
  const shuffled = [...PROCESS_NAMES].sort(() => Math.random() - 0.5)
  const count = 5 + Math.floor(Math.random() * 4)
  return shuffled.slice(0, count).map((name, i) => {
    const base = {
      pid: 1000 + Math.floor(Math.random() * 60000),
      name,
      cpuUsage: 0,
      memoryUsage: 0,
      networkUsage: 0,
      gpuUsage: 0,
    }
    switch (metricType) {
      case 'cpu':
        base.cpuUsage = Math.round(Math.max(0, 50 - i * 8 + Math.random() * 15) * 10) / 10
        base.memoryUsage = Math.round(Math.random() * 500 * 10) / 10
        break
      case 'memory':
        base.memoryUsage = Math.round(Math.max(50, 800 - i * 120 + Math.random() * 100) * 10) / 10
        base.cpuUsage = Math.round(Math.random() * 30 * 10) / 10
        break
      case 'network':
        base.networkUsage = Math.round(Math.max(0, 30 - i * 5 + Math.random() * 10) * 100) / 100
        base.cpuUsage = Math.round(Math.random() * 20 * 10) / 10
        break
      case 'gpu':
        base.gpuUsage = Math.round(Math.max(0, 40 - i * 7 + Math.random() * 12) * 10) / 10
        base.memoryUsage = Math.round(Math.random() * 400 * 10) / 10
        break
      default:
        base.cpuUsage = Math.round(Math.random() * 50 * 10) / 10
        base.memoryUsage = Math.round(Math.random() * 800 * 10) / 10
    }
    return base
  }).sort((a, b) => {
    switch (metricType) {
      case 'cpu': return b.cpuUsage - a.cpuUsage
      case 'memory': return b.memoryUsage - a.memoryUsage
      case 'network': return b.networkUsage - a.networkUsage
      case 'gpu': return b.gpuUsage - a.gpuUsage
      default: return b.cpuUsage - a.cpuUsage
    }
  })
}
