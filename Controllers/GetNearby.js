const { Queue, Worker } = require('bullmq');
const Order = require("../Models/User_order");
const DeliveryRider = require("../Models/DeliveryRider");
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');

const connection = { host: "127.0.0.1", port: 6379 };
const deliveryQueue = new Queue('delivery-distribution', { connection });

const deliveryWorker = new Worker('delivery-distribution', async (job) => {
  const { orderId, coordinates } = job.data;

  try {
    // 1. Fetch the Order to get Company/Branch context
    const order = await Order.findById(orderId);
    if (!order) return;

    // 2. Search for nearby riders
    const nearbyRiders = await DeliveryRider.find({
      isOnline: true,
      isBusy: false,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: coordinates },
          $maxDistance: 5000 // 5km
        }
      }
    }).limit(5);

    if (nearbyRiders.length > 0) {
      // SUCCESS: Notify Riders
      nearbyRiders.forEach(rider => {
        if (global.io) {
          global.io.to(rider._id.toString()).emit("NEW_ORDER", {
            orderId,
            message: "New delivery request nearby!",
            coordinates
          });
        }
      });
    } else {
      // FALLBACK: No riders found
      await Order.findByIdAndUpdate(orderId, { 
        "delivery.assignmentType": "Manual",
        "delivery.status": "Rider Not Found" 
      });

      if (global.io) {
        // A. Alert the Super Admin
        global.io.emit("ADMIN_ALERT", {
          message: `Logistics Alert: No riders found for Order ${order.orderId}`,
          orderId: order._id
        });

        // B. Alert the Company
        if (order.companyId && order.companyId.length > 0) {
          order.companyId.forEach(cId => {
            global.io.to(cId.toString()).emit("VENDOR_ALERT", {
              message: "No delivery rider found. Please assign one manually.",
              orderId: order._id,
              type: "Company"
            });
          });
        }

        // C. Alert the Branch
        if (order.branchId && order.branchId.length > 0) {
          order.branchId.forEach(bId => {
            global.io.to(bId.toString()).emit("VENDOR_ALERT", {
              message: "Attention: Immediate rider assignment needed for your branch order.",
              orderId: order._id,
              type: "Branch"
            });
          });
        }
      }
    }
  } catch (error) {
    console.error("Worker Error:", error);
  }
}, { connection });

module.exports = { deliveryQueue, deliveryWorker };