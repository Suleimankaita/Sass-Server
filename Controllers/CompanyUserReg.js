const asynchandler = require('express-async-handler');
const Company = require('../Models/CompanyUsers');
const AdminOwner = require('../Models/AdminOwner');

// 🟢 COMPANY REGISTRATION
const CompanyRegs = asynchandler(async (req, res) => {
  try {
    const {
      Username,
      Password,
      Firstname,
      Lastname,
      StreetName,
      PostalNumber,
      Lat,
      CompanyName,
      id,
      Long,
      Email,
      CAC_Number,
    } = req.body;

    if (!Username || !Password || !Firstname || !Lastname || !Email  || !CAC_Number||!CompanyName)
      return res.status(400).json({ message: 'All fields are required' });

    const found = await Company.findOne({ Username })
      .collation({ strength: 2, locale: 'en' })
      .exec();

    if (found)
      return res
        .status(409)
        .json({ message: `The username '${Username}' is already used by another company.` });


    const AdminFound=await AdminOwner.findOne({_id:id}).collation({ strength: 2, locale: 'en' }).exec()
    
    if(AdminFound.CompanyName===Username)return res.status(400).json({'message':`The Username can not be match with the CompanyName `})
    if(AdminFound.Username===Username)return res.status(400).json({'message':`The Username can not be match with the Owner Username `})

    const newCompany = await Company.create({
      Username,
      Password,
      Firstname,
      Lastname,
      Email,
      CompanyName,
      WalletNumber: Math.floor(Math.random() * 90000) + 10000,
      Address: {
        StreetName,
        PostalNumber,
        Lat,
        Long,
      },
    });

    if(!AdminFound.Company_UserId)AdminFound.Company_UserId=[]

    AdminFound.Company_UserId.push(newCompany._id)

    await AdminFound.save()
    

    res.status(201).json({
      message: `New Company '${Username}' created successfully`,
      company: newCompany,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = CompanyRegs;
