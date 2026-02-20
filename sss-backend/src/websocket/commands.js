const { AdminCommand } = require('../models');

function buildCommandPayload(command) {
  return {
    id: command._id,
    type: command.type,
    payload: command.payload || null,
    createdAt: command.createdAt
  };
}

async function dispatchCommand(io, command) {
  if (!io || !command?.student) {
    return false;
  }

  const room = `student:${command.student.toString()}`;
  const sockets = await io.in(room).allSockets();

  if (!sockets || sockets.size === 0) {
    return false;
  }

  io.to(room).emit('admin_command', buildCommandPayload(command));

  await AdminCommand.findByIdAndUpdate(command._id, {
    status: 'sent',
    deliveredAt: new Date(),
    lastAttemptAt: new Date(),
    $inc: { attempts: 1 }
  });

  return true;
}

async function dispatchCommands(io, commands) {
  if (!commands || commands.length === 0) return;
  await Promise.all(commands.map(command => dispatchCommand(io, command)));
}

module.exports = {
  buildCommandPayload,
  dispatchCommand,
  dispatchCommands
};
