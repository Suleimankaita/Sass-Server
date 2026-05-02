const mongoose=require('mongoose');

const followersShecma=new mongoose.Schema({

    Username:{
        type:string,
        required:true
    },
    CompanyName:string,
    

},{
    timestamps:true
})

module.exports=mongoose.model("Followers",followersShecma);