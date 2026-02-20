const { Center } = require('../models')
const { fetchPmsPods } = require('./pms.service')

async function syncCentersFromPms() {
  const pods = await fetchPmsPods()

  const results = {
    created: 0,
    updated: 0,
    skipped: 0
  }

  for (const pod of pods) {
    if (!pod?.id || !pod?.name || !pod?.code) {
      results.skipped += 1
      continue
    }

    const payload = {
      name: pod.name,
      code: pod.code.toUpperCase(),
      city: pod.city,
      state: pod.state,
      pmsPodId: pod.id
    }

    const existing = await Center.findOne({ pmsPodId: pod.id })

    if (!existing) {
      await Center.create(payload)
      results.created += 1
    } else {
      await Center.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: payload.name,
            code: payload.code,
            city: payload.city,
            state: payload.state
          }
        }
      )
      results.updated += 1
    }
  }

  return results
}

module.exports = {
  syncCentersFromPms
}
