import { useEffect } from 'react'
import useWebSocket from './useWebSocket'
import useActivityStore from '../store/activityStore'

const useActivity = ({ enabled = true } = {}) => {
  const { on } = useWebSocket()
  const activities = useActivityStore((state) => state.activities)
  const prependActivity = useActivityStore((state) => state.prependActivity)
  const setActivities = useActivityStore((state) => state.setActivities)

  useEffect(() => {
    if (!enabled) return undefined
    const unsubscribe = on('activity', (activity) => {
      prependActivity(activity)
    })
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [enabled, on, prependActivity])

  return {
    activities,
    prependActivity,
    setActivities
  }
}

export default useActivity
