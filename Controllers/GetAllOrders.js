const Order=require("../Models/User_order")
const asynchandler=require('express-async-handler')

const getAllOrders =asynchandler( async (req,res) => {
  try {
    const orders = await Order.find({})
      .populate({
        path:"companyId",
        populate:[{
        model:"Sale",path:"SaleId"
        }]
    }) // Fills in Company details
    //   .populate() // Fills in Company details
      .populate("branchId")  // Fills in Branch details
      .populate("items.productId") // Fills in Product details inside the array
      .populate("delivery.riderId") // Fills in the Rider/User details
      .sort({ createdAt: -1 }); // Newest orders first

    return res.status(201).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
  }
})

module.exports=getAllOrders
