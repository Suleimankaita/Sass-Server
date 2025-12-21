const mongoose = require("mongoose");

const UserLog = new mongoose.Schema(
  {
        name: String,
        username:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"text"
        }
    
  },
  { timestamps: true }
);

module.exports = mongoose.model("use", UserLog);
