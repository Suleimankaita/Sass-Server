const Order = require('../Models/User_order');

const socketController = (io) => {
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        // 1. Join Order Room
        // Customers and Riders both join a room named after the Order ID
        socket.on('join_order', ({orderId}) => {
            socket.join(orderId);
            console.log(`User ${socket.id} joined room: ${orderId}`);
        });

        // 2. Handle Rider Movement
        socket.on('update_location', async (data) => {
            const { orderId, lat, lng, riderId } = data;

            console.log(`Location update for Order ${orderId} from Rider ${riderId}: (${lat}, ${lng})`);
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
                console.error("Error updating tracking in DB:", err);
            }
        });

        socket.on('disconnect', () => {
            console.log('User Disconnected', socket.id);
        });
    });
};

module.exports = socketController;