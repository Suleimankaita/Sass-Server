/**
 * Lightweight socket handlers for customer-care tickets.
 * Exports: initCustomerCare(io, options)
 * options.saveMessage(ticketId, msg) - optional async persister
 * options.fetchHistory(ticketId) - optional async loader
 */
function initCustomerCare(io, options = {}) {
  const { saveMessage, fetchHistory } = options;

  io.on('connection', (socket) => {
    socket.on('join_room', ({ ticketId, userId, role } = {}) => {
      if (!ticketId) return socket.emit('error', { message: 'ticketId required' });
      const room = `ticket:${ticketId}`;
      socket.join(room);
      socket.ticketRoom = room;
      socket.userId = userId || socket.id;
      socket.role = role || 'user';
      socket.emit('joined', { ticketId });
      socket.to(room).emit('user_joined', { userId: socket.userId, role: socket.role });
    });

    socket.on('leave_room', ({ ticketId } = {}) => {
      const room = ticketId ? `ticket:${ticketId}` : socket.ticketRoom;
      if (!room) return;
      socket.leave(room);
      socket.to(room).emit('user_left', { userId: socket.userId });
    });

    socket.on('send_message', async ({ ticketId, message, meta } = {}) => {
      if (!ticketId || !message) return socket.emit('error', { message: 'ticketId and message required' });
      const room = `ticket:${ticketId}`;
      const msgObj = {
        ticketId,
        userId: socket.userId || socket.id,
        role: socket.role || 'user',
        message,
        meta: meta || null,
        timestamp: new Date().toISOString(),
      };
      io.to(room).emit('new_message', msgObj);
      if (typeof saveMessage === 'function') {
        try { await saveMessage(ticketId, msgObj); } catch (e) { console.error('saveMessage failed', e); }
      }
    });

    socket.on('typing', ({ ticketId, userId } = {}) => {
      const room = ticketId ? `ticket:${ticketId}` : socket.ticketRoom;
      if (!room) return;
      socket.to(room).emit('typing', { userId: userId || socket.userId });
    });

    socket.on('stop_typing', ({ ticketId, userId } = {}) => {
      const room = ticketId ? `ticket:${ticketId}` : socket.ticketRoom;
      if (!room) return;
      socket.to(room).emit('stop_typing', { userId: userId || socket.userId });
    });

    socket.on('get_history', async ({ ticketId } = {}) => {
      if (!ticketId) return socket.emit('history', { ticketId: null, messages: [] });
      if (typeof fetchHistory === 'function') {
        try {
          const messages = await fetchHistory(ticketId) || [];
          socket.emit('history', { ticketId, messages });
        } catch (e) {
          console.error('fetchHistory failed', e);
          socket.emit('history', { ticketId, messages: [] });
        }
      } else {
        socket.emit('history', { ticketId, messages: [] });
      }
    });

    // Allow clients to subscribe to target channels for in-app notifications
    socket.on('subscribe_target', ({ target } = {}) => {
      if (!target) return;
      try { socket.join(`target:${target}`); socket.emit('subscribed', { target }); } catch (e) { /* noop */ }
    });

    socket.on('unsubscribe_target', ({ target } = {}) => {
      if (!target) return;
      try { socket.leave(`target:${target}`); socket.emit('unsubscribed', { target }); } catch (e) { /* noop */ }
    });

    socket.on('disconnect', (reason) => {
      if (socket.ticketRoom) socket.to(socket.ticketRoom).emit('user_left', { userId: socket.userId });
    });
  });
}

module.exports = { initCustomerCare };
