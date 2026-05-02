const following=require("../Models/following")
const followers=require("../Models/followers")
const Company=require("../Models/Company")
const Branch=require("../Models/Branch")
const asynchandler=require('express-async-handler');


const followings =asynchandler(async(req,res)=>{
    const {Username,CompanyName,companyId,branchId}=req.body;
    
    if(!Username)return res.status(400).json({'message':'Username Is required'});

const [companyfound, branchfound] = await Promise.all([
  Company.findById(companyId),
  Branch.findById(branchId)
]);

if (!companyfound && !branchfound) {
  return res.status(404).json({ message: "No company or branch found" });
}

const follow = await following.create({
  CompanyName,
  Username,
});

if (companyfound) {
  companyfound.Following.push(follow._id);
  await companyfound.save();
} else if (branchfound) {
  branchfound.Following.push(follow._id);
  await branchfound.save();
}
})

const GetAllFollowers =asynchandler(async(req,res)=>{
            
})

module.exports={followings,GetAllFollowers}