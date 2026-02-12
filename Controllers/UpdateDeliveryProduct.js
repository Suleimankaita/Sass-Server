const Order = require('../Models/User_order');

const socketController = (io) => {
    io.on('connection', (socket) => {

        // 1. Join Order Room
        // Customers and Riders both join a room named after the Order ID
        socket.on('join_order', ({orderId}) => {
            socket.join(orderId);
        });

        // 2. Handle Rider Movement
        socket.on('update_location', async (data) => {
            const { orderId, lat, lng, riderId } = data;

            if (!orderId || !lat || !lng) return;

            // Broadcast to everyone in the room (Customer/Admin) except the sender
            socket.to(orderId).emit('location_updated', {
                lat,
                lng,
                at: new Date()
            });

            // 3. Optional: Persist to DB periodically
            // To prevent heavy DB load, we update the Order tracking array
            try {
                await Order.findByIdAndUpdate(orderId, {
                    $set: { 
                        'delivery.location': { lat, lng },
                        'delivery.riderId': riderId 
                    },
                    $push: { 
                        'delivery.tracking': { lat, lng, at: new Date() } 
                    }
                });
            } catch (err) {
            }
        });

        socket.on('disconnect', () => {
        });
    });
};

module.exports = socketController;