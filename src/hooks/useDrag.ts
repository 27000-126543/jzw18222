import { useCallback, useRef } from 'react'
import { useMonitorStore } from '@/store/useMonitorStore'

export function useDrag() {
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const setCustomPosition = useMonitorStore(s => s.setCustomPosition)
  const setPosition = useMonitorStore(s => s.setPosition)
  const position = useMonitorStore(s => s.position)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (position !== 'free') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    dragging.current = true

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const x = ev.clientX - offset.current.x
      const y = ev.clientY - offset.current.y
      setCustomPosition(x, y)
    }

    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [position, setCustomPosition, setPosition])

  return { onMouseDown }
}
