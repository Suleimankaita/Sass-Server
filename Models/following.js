const mongoose=require('mongoose');

const following=new mongoose.Schema({

    Username:{
        type:string,
        required:true
    },
    CompanyName:string,
    

},{
    timestamps:true
})

module.exports=mongoose.model("Following",following);