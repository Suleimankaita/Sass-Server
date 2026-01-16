const EcomerceProducts = require("../Models/EcomerceProducts");
const POSProduct = require("../Models/POSProduct");
const Order = require("../Models/User_order");
const asyncHandler = require("express-async-handler");
const Company = require("../Models/Company");
const Admin = require("../Models/AdminOwner");
const CompanyUsers = require("../Models/CompanyUsers");

const GetUserSaleData = (io) => {
  io.on('connection', (socket) => {
    try {
      socket.on("GetIds", async ({ id, }) => {
        console.log("Fetching for Company ID:", id);

        if (!id) return socket.emit("Error", { message: "Company ID is required" });

        const UserFound = await Admin.findById(id)
          .populate({
            path:"UserProfileId",
            populate:[{
                path:'SaleId',model:'Sale'
            }]
        })||await CompanyUsers.findById(id).populate({
            path:"UserProfileId",
            populate:[{
                path:'SaleId',model:'Sale'
            }]});
        if (!UserFound) return socket.emit("Error", { message: "Company data not found" });


        // 2. Process POS
        
        socket.emit("GetUserSaleData", {
          products: UserFound.UserProfileId.SaleId,
        });
      });

    } catch (error) {
      console.error("Socket Error:", error);
      socket.emit("Error", { message: "Internal Server Error" });
    }
  });
};

module.exports = { GetUserSaleData };