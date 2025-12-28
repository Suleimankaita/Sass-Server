const mongosee=require('mongoose');

const UserActivities=new mongosee.Schema({

    ActivityType:String,
    Username:String,
    img:String,
    ProductName:String,
    time:{
        type:String,
        default:()=>new Date().toLocaleTimeString()
    }

},{
    timestamps:true
}
)

module.exports=mongosee.model("UserActivity",UserActivities);