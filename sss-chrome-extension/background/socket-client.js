import { io } from 'socket.io-client';
import { ConfigManager } from './config.js';

class SocketClient {
  constructor() {
    this.socket = null;
    this.studentInfo = null;
    this.commandHandlers = new Set();
  }

  async connect(studentInfo) {
    if (!studentInfo?.studentId || !studentInfo?.centerId) {
      return;
    }

    this.studentInfo = studentInfo;
    const apiBase = await ConfigManager.getApiBaseUrl();
    const socketUrl = apiBase.replace(/\/api\/v1\/?$/, '');

    if (!this.socket) {
      this.socket = io(socketUrl, {
        autoConnect: false,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        this.emitOnline();
      });

      this.socket.on('admin_command', (command) => {
        this.commandHandlers.forEach((handler) => handler(command));
      });
    }

    if (!this.socket.connected) {
      this.socket.connect();
    } else {
      this.emitOnline();
    }
  }

  onCommand(handler) {
    if (typeof handler !== 'function') return () => {};
    this.commandHandlers.add(handler);
    return () => this.commandHandlers.delete(handler);
  }

  emitOnline() {
    if (!this.socket?.connected || !this.studentInfo) return;
    this.socket.emit('student:online', {
      centerId: this.studentInfo.centerId,
      studentId: this.studentInfo.studentId,
      studentName: this.studentInfo.studentName
    });
  }

  emitOffline() {
    if (!this.socket?.connected || !this.studentInfo) return;
    this.socket.emit('student:offline', {
      centerId: this.studentInfo.centerId,
      studentId: this.studentInfo.studentId
    });
  }

  async disconnect() {
    if (!this.socket) return;
    this.emitOffline();
    this.socket.disconnect();
  }
}

export default new SocketClient();
