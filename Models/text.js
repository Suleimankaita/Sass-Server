const mongoose = require("mongoose");

const UserLog = new mongoose.Schema(
  {     
        Username: String,
        Date: String,
        time: String,
        log:[
        {
          time:String
        }
      ]
    
  },
  { timestamps: true }
);

module.exports = mongoose.model("text", UserLog);
