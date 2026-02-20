export function getActiveSessions(students = [], onlineStudents = {}, searchTerm = '', centerFilter = '') {
  const normalizedTerm = searchTerm.trim().toLowerCase()

  return students
    .filter((student) => !centerFilter || (student.center?._id || student.center) === centerFilter)
    .filter((student) => {
      if (!normalizedTerm) return true
      return (
        student.name?.toLowerCase().includes(normalizedTerm) ||
        String(student.studentId || '').includes(normalizedTerm)
      )
    })
    .filter((student) => Boolean(onlineStudents[student._id]?.isOnline))
}
