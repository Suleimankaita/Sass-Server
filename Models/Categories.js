const mongosee=require('mongoose');

const CategoriesSchema=new mongosee.Schema({
    name:String
},{
    timestamps:true
})

module.exports=mongosee.model('CateGories',CategoriesSchema)