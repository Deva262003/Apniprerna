const onlineStudentsByCenter = new Map();

function getCenterKey(centerId) {
  return centerId?.toString();
}

function addOnlineStudent(centerId, studentId, studentName, socketId) {
  const centerKey = getCenterKey(centerId);
  if (!centerKey || !studentId) return;

  if (!onlineStudentsByCenter.has(centerKey)) {
    onlineStudentsByCenter.set(centerKey, new Map());
  }

  const centerMap = onlineStudentsByCenter.get(centerKey);
  centerMap.set(studentId.toString(), {
    studentId: studentId.toString(),
    studentName,
    centerId: centerKey,
    socketId,
    lastSeen: new Date()
  });
}

function removeOnlineStudent(centerId, studentId) {
  const centerKey = getCenterKey(centerId);
  if (!centerKey || !studentId) return;

  const centerMap = onlineStudentsByCenter.get(centerKey);
  if (!centerMap) return;
  centerMap.delete(studentId.toString());

  if (centerMap.size === 0) {
    onlineStudentsByCenter.delete(centerKey);
  }
}

function listOnlineStudents(centerId) {
  const centerKey = getCenterKey(centerId);
  if (!centerKey) return [];
  const centerMap = onlineStudentsByCenter.get(centerKey);
  if (!centerMap) return [];
  return Array.from(centerMap.values());
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {

    socket.on('join:center', (centerId) => {
      const centerKey = getCenterKey(centerId);
      if (!centerKey) return;
      socket.join(`center:${centerKey}`);
      socket.emit('online_students', listOnlineStudents(centerKey));
    });

    socket.on('join:alerts', () => {
      socket.join('alerts');
    });

    socket.on('student:online', (data) => {
      const { centerId, studentId, studentName } = data || {};
      if (!centerId || !studentId) return;

      socket.data.studentId = studentId.toString();
      socket.data.centerId = centerId.toString();
      socket.join(`center:${centerId}`);
      socket.join(`student:${studentId}`);

      addOnlineStudent(centerId, studentId, studentName, socket.id);

      io.to(`center:${centerId}`).emit('student_online', {
        studentId,
        studentName,
        timestamp: new Date()
      });
    });

    socket.on('student:offline', (data) => {
      const { centerId, studentId } = data || {};
      if (!centerId || !studentId) return;

      removeOnlineStudent(centerId, studentId);

      io.to(`center:${centerId}`).emit('student_offline', {
        studentId,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      const { studentId, centerId } = socket.data || {};
      if (studentId && centerId) {
        removeOnlineStudent(centerId, studentId);
        io.to(`center:${centerId}`).emit('student_offline', {
          studentId,
          timestamp: new Date()
        });
      }

    });
  });
}

module.exports = {
  registerSocketHandlers,
  listOnlineStudents
};
