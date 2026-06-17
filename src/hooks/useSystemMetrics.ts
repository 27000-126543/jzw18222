import { useEffect, useRef } from 'react'
import { useMonitorStore } from '@/store/useMonitorStore'
import { UPDATE_INTERVAL_MS } from '@/utils/constants'

export function useSystemMetrics() {
  const updateMetrics = useMonitorStore(s => s.updateMetrics)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    updateMetrics()
    intervalRef.current = setInterval(updateMetrics, UPDATE_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [updateMetrics])
}
