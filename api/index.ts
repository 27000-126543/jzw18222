import express from 'express'
import cors from 'cors'
import si from 'systeminformation'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const app = express()
const PORT = process.env.PORT || 3838

app.use(cors())
app.use(express.json())

interface CpuMetrics {
  cores: number[]
  overall: number
  available: boolean
  error?: string
}

interface MemoryMetrics {
  used: number
  total: number
  percentage: number
  available: boolean
  error?: string
}

interface NetworkMetrics {
  upload: number
  download: number
  interfaceName: string
  available: boolean
  error?: string
}

interface GpuMetrics {
  utilization: number
  vramUsed: number
  vramTotal: number
  available: boolean
  error?: string
}

interface MetricsResponse {
  cpu: CpuMetrics
  memory: MemoryMetrics
  network: NetworkMetrics
  gpu: GpuMetrics
  timestamp: number
}

interface ProcessInfo {
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

interface ProcessListResponse {
  processes: ProcessInfo[]
  metric: string
  success: boolean
  error?: string
  metricUnavailable?: string
}

interface KillProcessResponse {
  success: boolean
  pid: number
  message: string
  error?: string
}

let prevNetworkStats: {
  [iface: string]: { rx_sec: number; tx_sec: number; time: number }
} = {}

async function getNetworkConnectionsByPid(): Promise<{ map: Map<number, number>; error?: string; partial?: boolean }> {
  const result = new Map<number, number>()
  try {
    let cmd = ''
    if (process.platform === 'win32') {
      cmd = 'netstat -ano | findstr /R /C:"ESTABLISHED" /C:"TIME_WAIT" /C:"LISTENING"'
    } else {
      cmd = 'ss -tuanp | tail -n +2'
    }
    const { stdout, stderr } = await execAsync(cmd, { timeout: 3000 })
    const lines = stdout.split('\n').filter(Boolean)
    let matchedLineCount = 0
    for (const line of lines) {
      let pidFound = false
      if (process.platform === 'win32') {
        const parts = line.trim().split(/\s+/)
        const pidStr = parts[parts.length - 1]
        const pid = parseInt(pidStr)
        if (!isNaN(pid) && pid > 0) {
          result.set(pid, (result.get(pid) || 0) + 1)
          pidFound = true
        }
      } else {
        const pidRegex = /pid=(\d+)/g
        let m: RegExpExecArray | null
        while ((m = pidRegex.exec(line)) !== null) {
          const pid = parseInt(m[1])
          if (!isNaN(pid) && pid > 0) {
            result.set(pid, (result.get(pid) || 0) + 1)
            pidFound = true
          }
        }
      }
      if (pidFound) matchedLineCount++
    }
    if (process.platform !== 'win32' && lines.length > 0) {
      const coverage = matchedLineCount / lines.length
      if (coverage < 0.9) {
        let hint: string
        if (matchedLineCount === 0) {
          hint = stderr ? stderr.trim().slice(0, 200) : 'ss -p 需要 root 权限才能显示其它用户进程的 PID，当前列表为空'
        } else {
          const pct = Math.round(coverage * 100)
          hint = `ss -p 仅匹配到 ${matchedLineCount}/${lines.length} 行（约 ${pct}%）的连接 PID。请以 root 权限启动后端以获得完整统计，未显示 PID 的进程连接数记为 0`
        }
        return { map: result, error: hint, partial: matchedLineCount > 0 }
      }
    }
    return { map: result }
  } catch (e) {
    return {
      map: result,
      error: e instanceof Error ? e.message : '执行网络统计命令失败',
    }
  }
}

async function getGpuMemoryByPid(): Promise<{ map: Map<number, number>; error?: string }> {
  const map = new Map<number, number>()
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-compute-apps=pid,used_memory --format=csv,noheader,nounits',
      { timeout: 3000 }
    )
    const lines = stdout.split('\n').filter(Boolean)
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length < 2) continue
      const pid = parseInt(parts[0])
      const usedMiB = parseFloat(parts[1])
      if (!isNaN(pid) && pid > 0 && !isNaN(usedMiB) && usedMiB >= 0) {
        map.set(pid, Math.round(usedMiB * 10) / 10)
      }
    }
    return { map }
  } catch (e) {
    return { map, error: '未检测到 NVIDIA 显卡或 nvidia-smi 不可用' }
  }
}

async function getCpuMetrics(): Promise<CpuMetrics> {
  try {
    const load = await si.currentLoad()
    const cores = load.cpus.map(cpu => Math.round(cpu.load))
    const overall = Math.round(load.currentLoad * 10) / 10
    return {
      cores,
      overall,
      available: true,
    }
  } catch (e) {
    return {
      cores: [],
      overall: -1,
      available: false,
      error: e instanceof Error ? e.message : '未知错误',
    }
  }
}

async function getMemoryMetrics(): Promise<MemoryMetrics> {
  try {
    const mem = await si.mem()
    const totalGB = Math.round((mem.total / 1024 / 1024 / 1024) * 100) / 100
    const usedGB = Math.round(((mem.total - mem.available) / 1024 / 1024 / 1024) * 100) / 100
    const percentage = Math.round(((mem.total - mem.available) / mem.total) * 1000) / 10
    return {
      used: usedGB,
      total: totalGB,
      percentage,
      available: true,
    }
  } catch (e) {
    return {
      used: -1,
      total: -1,
      percentage: -1,
      available: false,
      error: e instanceof Error ? e.message : '未知错误',
    }
  }
}

async function getNetworkMetrics(): Promise<NetworkMetrics> {
  try {
    const stats = await si.networkStats()
    if (!stats || stats.length === 0) {
      return {
        upload: -1,
        download: -1,
        interfaceName: '',
        available: false,
        error: '未检测到网络接口',
      }
    }

    const active = stats.find(s => s.operstate === 'up' && s.rx_sec !== undefined && s.tx_sec !== undefined)
      || stats.find(s => s.rx_sec !== undefined && s.tx_sec !== undefined)
      || stats[0]

    const now = Date.now()
    let downloadMB = -1
    let uploadMB = -1

    const prev = prevNetworkStats[active.iface]
    if (prev) {
      const dt = (now - prev.time) / 1000
      if (dt > 0) {
        const dl = (active.rx_sec - prev.rx_sec) / dt
        const ul = (active.tx_sec - prev.tx_sec) / dt
        downloadMB = Math.round(Math.max(0, dl / 1024 / 1024) * 100) / 100
        uploadMB = Math.round(Math.max(0, ul / 1024 / 1024) * 100) / 100
      }
    }

    prevNetworkStats[active.iface] = {
      rx_sec: active.rx_sec,
      tx_sec: active.tx_sec,
      time: now,
    }

    if (downloadMB < 0 || uploadMB < 0) {
      downloadMB = 0
      uploadMB = 0
    }

    return {
      upload: uploadMB,
      download: downloadMB,
      interfaceName: active.iface || '未知',
      available: true,
    }
  } catch (e) {
    return {
      upload: -1,
      download: -1,
      interfaceName: '',
      available: false,
      error: e instanceof Error ? e.message : '未知错误',
    }
  }
}

async function getGpuMetrics(): Promise<GpuMetrics> {
  try {
    const graphics = await si.graphics()
    const controllers = graphics.controllers || []
    const discrete = controllers.find(c =>
      c.model && (c.model.toLowerCase().includes('nvidia')
        || c.model.toLowerCase().includes('amd')
        || c.model.toLowerCase().includes('radeon'))
    ) || controllers[0]

    if (!discrete || (!discrete.utilizationGpu && !discrete.memoryUsed && !discrete.memoryTotal)) {
      const nvidiaUtil = await tryNvidiaSmi()
      if (nvidiaUtil) return nvidiaUtil

      return {
        utilization: -1,
        vramUsed: -1,
        vramTotal: -1,
        available: false,
        error: '无法检测到 GPU 或驱动不支持，请确认已安装显卡驱动（NVIDIA 需要 nvidia-smi）',
      }
    }

    const vramTotal = discrete.memoryTotal
      ? Math.round((discrete.memoryTotal / 1024) * 100) / 100
      : (discrete.vram ? Math.round((discrete.vram / 1024) * 100) / 100 : -1)
    const vramUsed = discrete.memoryUsed
      ? Math.round((discrete.memoryUsed / 1024) * 100) / 100
      : -1
    const utilization = discrete.utilizationGpu
      ? Math.round(discrete.utilizationGpu * 10) / 10
      : -1

    return {
      utilization,
      vramUsed,
      vramTotal,
      available: !(utilization < 0 && vramUsed < 0),
      error: utilization < 0 && vramUsed < 0 ? 'GPU 信息不完整' : undefined,
    }
  } catch (e) {
    try {
      const nvidiaUtil = await tryNvidiaSmi()
      if (nvidiaUtil) return nvidiaUtil
    } catch { }
    return {
      utilization: -1,
      vramUsed: -1,
      vramTotal: -1,
      available: false,
      error: e instanceof Error ? e.message : '未知错误',
    }
  }
}

async function tryNvidiaSmi(): Promise<GpuMetrics | null> {
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
      { timeout: 2000 }
    )
    const line = stdout.trim().split('\n')[0]
    if (!line) return null
    const parts = line.split(',').map(s => s.trim())
    if (parts.length < 3) return null
    const util = parseFloat(parts[0])
    const used = Math.round((parseFloat(parts[1]) / 1024) * 100) / 100
    const total = Math.round((parseFloat(parts[2]) / 1024) * 100) / 100
    if (isNaN(util) || isNaN(used) || isNaN(total)) return null
    return {
      utilization: Math.round(util * 10) / 10,
      vramUsed: used,
      vramTotal: total,
      available: true,
    }
  } catch {
    return null
  }
}

async function getProcesses(metric: string, limit = 20): Promise<ProcessListResponse> {
  try {
    let metricUnavailable: string | undefined
    const emptyNet: { map: Map<number, number>; error?: string } = { map: new Map<number, number>() }
    const emptyGpu: { map: Map<number, number>; error?: string } = { map: new Map<number, number>() }
    const [all, netResult, gpuResult] = await Promise.all([
      si.processes(),
      metric === 'network' ? getNetworkConnectionsByPid() : Promise.resolve(emptyNet),
      metric === 'gpu' ? getGpuMemoryByPid() : Promise.resolve(emptyGpu),
    ])

    const netConnMap = netResult.map
    const gpuMap = gpuResult.map
    if (metric === 'gpu' && gpuResult.error && gpuMap.size === 0) {
      metricUnavailable = gpuResult.error
    }
    if (metric === 'network' && netResult.error && netConnMap.size === 0) {
      metricUnavailable = netResult.error
    }

    let list: ProcessInfo[] = all.list.map(p => {
      const pid = p.pid
      const info: ProcessInfo = {
        pid,
        name: p.name || p.command || `pid_${pid}`,
        cpuUsage: Math.round((p.cpu || 0) * 10) / 10,
        memoryUsage: Math.round((p.memVsz || 0) / 1024 * 10) / 10,
        command: p.command || '',
        user: p.user || '',
        startTime: p.started ? new Date(Number(p.started) * 1000).toLocaleString() : '',
      }
      if (metric === 'network') {
        info.networkConnections = netConnMap.get(pid) || 0
      }
      if (metric === 'gpu') {
        info.gpuVramUsedMB = gpuMap.get(pid)
      }
      return info
    })

    switch (metric) {
      case 'cpu':
        list.sort((a, b) => b.cpuUsage - a.cpuUsage)
        break
      case 'memory':
        list.sort((a, b) => b.memoryUsage - a.memoryUsage)
        break
      case 'network':
        list.sort((a, b) => (b.networkConnections || 0) - (a.networkConnections || 0))
        break
      case 'gpu': {
        list.sort((a, b) => {
          const av = a.gpuVramUsedMB ?? -1
          const bv = b.gpuVramUsedMB ?? -1
          if (bv !== av) return bv - av
          return b.cpuUsage - a.cpuUsage
        })
        break
      }
    }

    return {
      processes: list.slice(0, limit),
      metric,
      success: true,
      metricUnavailable,
    }
  } catch (e) {
    return {
      processes: [],
      metric,
      success: false,
      error: e instanceof Error ? e.message : '读取进程列表失败',
    }
  }
}

async function killProcess(pid: number): Promise<KillProcessResponse> {
  try {
    let cmd = ''
    if (process.platform === 'win32') {
      cmd = `taskkill /PID ${pid} /F /T`
    } else {
      cmd = `kill -9 ${pid}`
    }
    const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 })
    const out = (stdout + stderr).trim()
    return {
      success: true,
      pid,
      message: out || `进程 PID ${pid} 已结束`,
    }
  } catch (e: any) {
    return {
      success: false,
      pid,
      message: e?.stderr?.trim() || e?.message || '结束进程失败',
      error: e?.code ? `退出码: ${e.code}` : undefined,
    }
  }
}

app.get('/api/metrics', async (req, res) => {
  const [cpu, memory, network, gpu] = await Promise.all([
    getCpuMetrics(),
    getMemoryMetrics(),
    getNetworkMetrics(),
    getGpuMetrics(),
  ])
  const response: MetricsResponse = {
    cpu,
    memory,
    network,
    gpu,
    timestamp: Date.now(),
  }
  res.json(response)
})

app.get('/api/processes', async (req, res) => {
  const metric = (req.query.metric as string) || 'cpu'
  const limit = parseInt(req.query.limit as string) || 20
  const result = await getProcesses(metric, limit)
  res.json(result)
})

app.post('/api/kill', async (req, res) => {
  const pid = parseInt(req.body?.pid)
  if (!pid || pid <= 0) {
    res.status(400).json({
      success: false,
      pid: pid || 0,
      message: '无效的 PID',
    })
    return
  }
  const result = await killProcess(pid)
  if (!result.success) {
    res.status(500).json(result)
  } else {
    res.json(result)
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[api] 系统监控服务已启动: http://localhost:${PORT}`)
  console.log(`[api] 接口:`)
  console.log(`[api]   GET  /api/metrics   - 获取系统指标`)
  console.log(`[api]   GET  /api/processes - 获取进程列表`)
  console.log(`[api]   POST /api/kill      - 结束进程 (body: {pid})`)
})
