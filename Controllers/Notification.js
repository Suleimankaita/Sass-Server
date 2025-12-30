const Notification = require('../Models/NotificationsCenter');

// Helper to emit in-app notifications via socket.io
async function emitNotification(io, notif) {
  if (!io) return;
  // Broadcast global notification
  io.emit('notification', notif);
  // Also emit to rooms for each target (clients can join rooms like `target:POS Users`)
  if (Array.isArray(notif.targets)) {
    notif.targets.forEach(target => {
      try { io.to(`target:${target}`).emit('notification', notif); } catch (e) { /* noop */ }
    });
  }
}

exports.create = async (req, res, next) => {
  try {
    const { title, message, category, targets = [], channels = { email: true, inApp: true }, publishAt } = req.body;
    if (!title || !message || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ success: false, message: 'title, message and targets are required' });
    }

    const notif = new Notification({ title, message, category, targets, channels, publishAt: publishAt || null });
    await notif.save();

    // If publishAt is not set or is in the past, send immediately
    const shouldSend = !notif.publishAt || new Date(notif.publishAt) <= new Date();
    if (shouldSend) {
      notif.status = 'SENT';
      notif.sentAt = new Date();
      await notif.save();
      await emitNotification(req.io, notif);
    }

    res.status(201).json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const notif = await Notification.findByIdAndUpdate(id, body, { new: true });
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    notif.status = 'CANCELLED';
    await notif.save();
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.sendNow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    if (notif.status === 'SENT') return res.status(400).json({ success: false, message: 'Already sent' });
    notif.status = 'SENT';
    notif.sentAt = new Date();
    await notif.save();
    await emitNotification(req.io, notif);
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.getPending = async (req, res, next) => {
  try {
    const pending = await Notification.find({ status: 'PENDING' }).sort({ publishAt: 1, createdAt: -1 });
    res.json({ success: true, pending });
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Notification.find({ status: { $in: ['SENT', 'CANCELLED'] } }).sort({ sentAt: -1, createdAt: -1 }).skip(skip).limit(Number(limit));
    res.json({ success: true, items });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification: notif });
  } catch (err) { next(err); }
};
