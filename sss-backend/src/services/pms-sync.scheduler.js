const { syncCentersFromPms } = require('./centerSync.service')

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

let intervalId = null

function startPmsSyncScheduler() {
  if (intervalId) {
    return
  }

  const runSync = async () => {
    try {
      const result = await syncCentersFromPms()
      console.info('[PMS Sync] Centers synced', result)
    } catch (error) {
      console.error('[PMS Sync] Failed to sync centers', error.message || error)
    }
  }

  runSync()
  intervalId = setInterval(runSync, SIX_HOURS_MS)
}

module.exports = {
  startPmsSyncScheduler
}
