const asyncHandler=require('express-async-handler');
const EcomerceProduct=require("../Models/EcomerceProducts");
const Branch=require("../Models/Branch");
const Company=require("../Models/Company");

const GetEcomersingleProducts=asyncHandler(async(req,res)=>{
    try{
        
            const {id}=req.params

            if(!id)return res.status(404).json({'message':'Product Required'})

            const foundproduct=await EcomerceProduct.findById(id);

            if(!foundproduct)return res.status(400).json({'message':'Product Not found'})
            
            const found=await Company.findById(foundproduct.companyId)|| await Branch.findById(foundproduct.branchId) 

            if(!found) return res.status(400).json({'message':'Company or Branch not found'})

                const filteredByCate=await EcomerceProduct.findOne({categoryName:foundproduct.categoryName})
                const result ={
                    name:foundproduct.name,
                    img:foundproduct.img,
                    soldAtPrice:foundproduct.soldAtPrice,
                    actualPrice:foundproduct.actualPrice,
                    category:foundproduct.categoryName,
                    description:foundproduct.description,
                    stock:foundproduct.quantity,
                    CompanyName:found.CompanyName,
                    filteredByCate:filteredByCate._doc

                }
                res.status(201).json(result)
    }catch(err){
        res.status(400).json({'message':err.message})
    }
})

module.exports=GetEcomersingleProducts;