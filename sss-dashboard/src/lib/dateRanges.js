function toYmd(date) {
  return date.toISOString().slice(0, 10)
}

export function getDateRangeForPreset(preset, now = new Date()) {
  const endDate = new Date(now)
  const startDate = new Date(now)

  if (preset === '30d') {
    startDate.setDate(startDate.getDate() - 29)
  } else if (preset === '1y') {
    startDate.setFullYear(startDate.getFullYear() - 1)
    startDate.setDate(startDate.getDate() + 1)
  } else {
    startDate.setDate(startDate.getDate() - 6)
  }

  return {
    startDate: toYmd(startDate),
    endDate: toYmd(endDate)
  }
}
