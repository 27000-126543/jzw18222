import type { MetricKey, Position } from '@/types'

export const ALL_METRICS: MetricKey[] = ['cpu', 'memory', 'network', 'gpu']

export const DEFAULT_ENABLED_METRICS: MetricKey[] = ['cpu', 'memory', 'network', 'gpu']

export const DEFAULT_METRIC_ORDER: MetricKey[] = ['cpu', 'memory', 'network', 'gpu']

export const HISTORY_WINDOW_MINUTES = 5

export const UPDATE_INTERVAL_MS = 1000

export const HISTORY_POINT_INTERVAL_MS = 1000

export const MAX_HISTORY_POINTS = Math.floor((HISTORY_WINDOW_MINUTES * 60 * 1000) / HISTORY_POINT_INTERVAL_MS)

export const POSITION_STYLES: Record<Exclude<Position, 'free'>, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
}

export const PROCESS_NAMES = [
  'chrome.exe', 'vscode.exe', 'node.exe', 'webpack.exe',
  'python.exe', 'java.exe', 'docker.exe', 'steam.exe',
  'discord.exe', 'slack.exe', 'spotify.exe', 'figma.exe',
  'postgres.exe', 'redis.exe', 'nginx.exe', 'react-app.exe',
  'typescript.exe', 'electron.exe', 'wsl.exe', 'explorer.exe',
]

export const COLLAPSED_WIDTH = 240
export const EXPANDED_WIDTH = 420

export const THEME_COLORS = {
  dark: {
    bg: 'rgba(13, 17, 23, 0.88)',
    card: 'rgba(22, 27, 34, 0.92)',
    border: 'rgba(48, 54, 61, 0.8)',
    text: '#e6edf3',
    textSecondary: '#8b949e',
    accent: '#00d4aa',
    accentSecondary: '#f0a030',
    danger: '#f85149',
    unavailable: '#57606a',
    chartLine: '#00d4aa',
    chartLineSecondary: '#f0a030',
    chartGrid: 'rgba(48, 54, 61, 0.5)',
  },
  light: {
    bg: 'rgba(246, 248, 250, 0.92)',
    card: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(208, 215, 222, 0.8)',
    text: '#1f2328',
    textSecondary: '#656d76',
    accent: '#00886a',
    accentSecondary: '#c07820',
    danger: '#cf222e',
    unavailable: '#8c959f',
    chartLine: '#00886a',
    chartLineSecondary: '#c07820',
    chartGrid: 'rgba(208, 215, 222, 0.5)',
  },
} as const

export const API_BASE = '/api'
export const LS_SETTINGS_KEY = 'sys-monitor-settings-v1'
