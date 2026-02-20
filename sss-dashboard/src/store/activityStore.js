import { create } from 'zustand'

const useActivityStore = create((set) => ({
  activities: [],
  filters: {},
  onlineStudents: {},
  heartbeats: {},

  setActivities: (activities) => set({ activities }),
  prependActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 200)
    })),
  clearActivities: () => set({ activities: [] }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters }
    })),

  setOnlineStudents: (students) => {
    const map = {}
    students.forEach((student) => {
      map[student.studentId] = { ...student, isOnline: true }
    })
    set({ onlineStudents: map })
  },
  setStudentOnline: (student) =>
    set((state) => ({
      onlineStudents: {
        ...state.onlineStudents,
        [student.studentId]: { ...student, isOnline: true }
      }
    })),
  setStudentOffline: (studentId) =>
    set((state) => {
      const current = state.onlineStudents[studentId]
      return {
        onlineStudents: {
          ...state.onlineStudents,
          [studentId]: current ? { ...current, isOnline: false } : { studentId, isOnline: false }
        }
      }
    }),
  setHeartbeat: (heartbeat) =>
    set((state) => ({
      heartbeats: {
        ...state.heartbeats,
        [heartbeat.studentId]: heartbeat
      },
      onlineStudents: {
        ...state.onlineStudents,
        [heartbeat.studentId]: {
          ...(state.onlineStudents[heartbeat.studentId] || {}),
          studentId: heartbeat.studentId,
          studentName: heartbeat.studentName || state.onlineStudents[heartbeat.studentId]?.studentName,
          isOnline: true,
          lastSeen: heartbeat.lastSeen || new Date().toISOString()
        }
      }
    }))
}))

export default useActivityStore
