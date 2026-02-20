const crypto = require('crypto');
const { AdminCommand, Student, Center } = require('../models');
const { dispatchCommands } = require('../websocket/commands');
const { handleError } = require('../utils/error');

const COMMAND_TYPES = ['FORCE_LOGOUT', 'SYNC_BLOCKLIST'];

async function resolveTargetStudents({ targetType, targetId }, admin) {
  if (targetType === 'student') {
    const student = await Student.findById(targetId).select('center isActive');
    if (!student) {
      return { error: 'Student not found' };
    }
    if (admin.role !== 'super_admin' && admin.center && student.center?.toString() !== admin.center.toString()) {
      return { error: 'Not authorized for this student' };
    }
    return { students: [student] };
  }

  if (targetType === 'center') {
    const centerId = admin.role !== 'super_admin' && admin.center ? admin.center : targetId;
    const center = await Center.findById(centerId);
    if (!center) {
      return { error: 'Center not found' };
    }
    if (admin.role !== 'super_admin' && admin.center && center._id.toString() !== admin.center.toString()) {
      return { error: 'Not authorized for this center' };
    }
    const students = await Student.find({ center: centerId, isActive: true }).select('center');
    return { students, scopeId: centerId };
  }

  if (targetType === 'all') {
    if (admin.role !== 'super_admin') {
      const centerId = admin.center;
      const students = await Student.find({ center: centerId, isActive: true }).select('center');
      return { students, scopeId: centerId, adjustedScope: 'center' };
    }
    const students = await Student.find({ isActive: true }).select('center');
    return { students };
  }

  return { error: 'Invalid target type' };
}

const createCommand = async (req, res) => {
  try {
    const { type, targetType, targetId, payload } = req.body;

    if (!COMMAND_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid command type' });
    }

    const resolution = await resolveTargetStudents({ targetType, targetId }, req.admin);
    if (resolution.error) {
      return res.status(400).json({ success: false, message: resolution.error });
    }

    const students = resolution.students || [];
    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No students found for command' });
    }

    const batchId = students.length > 1 ? crypto.randomUUID() : undefined;
    const scope = resolution.adjustedScope || targetType;

    const commands = students.map((student) => ({
      type,
      student: student._id,
      center: student.center,
      scope,
      scopeId: resolution.scopeId,
      payload,
      createdBy: req.admin._id,
      batchId
    }));

    const created = await AdminCommand.insertMany(commands);

    const io = req.app.get('io');
    if (io) {
      await dispatchCommands(io, created);
    }

    res.status(201).json({
      success: true,
      data: {
        count: created.length,
        batchId
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to create command');
  }
};

const getCommands = async (req, res) => {
  try {
    const { status, type, student, center, scope, batchId, page, limit } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (student) filter.student = student;
    if (center) filter.center = center;
    if (scope) filter.scope = scope;
    if (batchId) filter.batchId = batchId;

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter.center = req.admin.center;
    }

    const pageNumber = Number(page) || 1;
    const pageLimit = Number(limit) || 50;
    const skip = (pageNumber - 1) * pageLimit;

    const [commands, total] = await Promise.all([
      AdminCommand.find(filter)
        .populate('student', 'name studentId')
        .populate('center', 'name code')
        .populate('createdBy', 'name email')
        .populate('createdByParent', 'name parentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      AdminCommand.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: commands,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit)
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch commands');
  }
};

const getCommand = async (req, res) => {
  try {
    const command = await AdminCommand.findById(req.params.id)
      .populate('student', 'name studentId')
      .populate('center', 'name code')
      .populate('createdBy', 'name email')
      .populate('createdByParent', 'name parentId');

    if (!command) {
      return res.status(404).json({ success: false, message: 'Command not found' });
    }

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (command.center?.toString() !== req.admin.center.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this command' });
      }
    }

    res.status(200).json({ success: true, data: command });
  } catch (error) {
    handleError(res, error, 'Failed to fetch command');
  }
};

const executeCommand = async (req, res) => {
  try {
    const command = await AdminCommand.findById(req.params.id);
    if (!command) {
      return res.status(404).json({ success: false, message: 'Command not found' });
    }

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (command.center?.toString() !== req.admin.center.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this command' });
      }
    }

    command.status = 'pending';
    command.error = null;
    await command.save();

    const io = req.app.get('io');
    if (io) {
      await dispatchCommands(io, [command]);
    }

    res.status(200).json({ success: true, data: command });
  } catch (error) {
    handleError(res, error, 'Failed to execute command');
  }
};

module.exports = {
  createCommand,
  getCommands,
  getCommand,
  executeCommand
};
