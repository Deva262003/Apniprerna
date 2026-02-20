# WebSocket Events

Socket.io is hosted on the same origin as the API server. Clients should join rooms after connecting.

## Rooms

- `center:{centerId}` - Center-wide activity and status updates.
- `alerts` - Blocked attempt notifications for admins.
- `student:{studentId}` - Direct command delivery for a specific student.

## Client -> Server

```javascript
socket.emit('join:center', centerId)
socket.emit('join:alerts')

socket.emit('student:online', {
  centerId,
  studentId,
  studentName
})

socket.emit('student:offline', {
  centerId,
  studentId
})
```

## Server -> Client

```javascript
socket.on('activity', (activity) => {})
socket.on('student_online', ({ studentId, studentName, timestamp }) => {})
socket.on('student_offline', ({ studentId, timestamp }) => {})
socket.on('student_heartbeat', ({ studentId, studentName, currentUrl, lastSeen }) => {})
socket.on('blocked_attempt', ({ studentName, url, category, timestamp }) => {})
socket.on('online_students', (students) => {})
socket.on('admin_command', ({ id, type, payload, createdAt }) => {})
```
