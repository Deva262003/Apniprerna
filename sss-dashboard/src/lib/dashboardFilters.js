export function filterCentersByStateAndSearch(centers = [], state = '', search = '') {
  const term = search.trim().toLowerCase()
  return centers.filter((center) => {
    const matchesState = !state || center.state === state
    const matchesSearch = !term || center.name?.toLowerCase().includes(term)
    return matchesState && matchesSearch
  })
}

export function filterStudentsByScopeAndSearch(students = [], centers = [], state = '', centerIds = [], search = '') {
  const term = search.trim().toLowerCase()
  const centerStateMap = new Map(centers.map((center) => [center._id, center.state]))
  const selectedCenters = new Set(centerIds)

  return students.filter((student) => {
    const studentCenterId = student.center?._id || student.center
    const matchesCenter = selectedCenters.size === 0 || selectedCenters.has(studentCenterId)
    const matchesState = !state || centerStateMap.get(studentCenterId) === state
    const haystack = `${student.name || ''} ${student.studentId || ''}`.toLowerCase()
    const matchesSearch = !term || haystack.includes(term)
    return matchesCenter && matchesState && matchesSearch
  })
}
