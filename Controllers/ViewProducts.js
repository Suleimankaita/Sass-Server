const ProductView = require("../Models/ProductsView");
const asyhandler = require("express-async-handler");
const Branch=require('../Models/Branch')
const Company=require('../Models/Company')
const ViewProduct= asyhandler(async(io)=>{
    io.on("connection",(socket)=>{
        socket.on("viewProduct",async(data)=>{

            const{Username,ProductName,CategoryName,companyId,type}=data;
            console.log("Received viewProduct event:", data);
            
            if(Username&&ProductName&&CategoryName){
                const [FoundCompany,FoundBranch]=await Promise.all([
                    Company.findById(companyId.toString()),Branch.findById(companyId.toString())
                ]
                )
                console.log(companyId)
                const newView=await ProductView.create({Username,ProductName,CategoryName,type})
                if(!FoundCompany){
                    
                    FoundBranch?.ProductViewsId.push(newView._id)
                    console.log(FoundBranch)
                    await FoundBranch.save()
                
                }else{
                    FoundCompany?.ProductViewsId.push(newView._id)
                    console.log(FoundCompany)
                    await FoundCompany.save()
                }
                console.log(newView)
                socket.emit("GetViewProducts",newView.ProductViewsId)
            } 
        })
        })
})

module.exports={ViewProduct}