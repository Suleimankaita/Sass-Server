const asynchandler = require('express-async-handler');
const Company = require('../Models/Company');
const Logss = require('../Models/UserLog');
const Admin = require('../Models/AdminOwner');


// 🟢 COMPANY REGISTRATION
const CompanyRegs = asynchandler(async (req, res) => {
  try {
    const {
      Username,
      Password,
      Firstname,
      Lastname,
      Adminid,
      StreetName,
      PostalNumber,
      Lat,
      Long,
      Email,
      CompanyName,
      CAC_Number,
    } = req.body;

    if (!Username || !Password || !Firstname || !Lastname || !Email || !CompanyName || !CAC_Number)
      return res.status(400).json({ message: 'All fields are required' });

    const adminFound=await Admin.findById(Adminid)
    if(!adminFound)return res.status(400).json({'message':'Admin not Found'})
    const found = await Company.findOne({ Username })
      .collation({ strength: 2, locale: 'en' })
      .lean()
      .exec();

    if (found)
      return res
        .status(409)
        .json({ message: `The username '${Username}' is already used by another company.` });

       const id=   await Logss.create({
      Logs: [
        {
          name: `${Firstname} ${Lastname}`,
          Username,
          Password,
          Date: new Date().toISOString(),
          time: new Date().toLocaleTimeString(),
        },
      ],
    });

    const newCompany = await Company.create({
      Username,
      Password,
      Firstname,
      Lastname,
      Email,
      WalletNumber: Math.floor(Math.random() * 90000) + 10000,
      Address: {
        StreetName,
        PostalNumber,
        Lat,
        Long,
      },
      CompanyName,
      CAC_Number,
      UserLog:id._id
    });

    
    adminFound.companyId.push(newCompany._id)
    await adminFound.save()
    res.status(201).json({
      message: `New Company '${Username}' created successfully`,
      company: newCompany,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = CompanyRegs;
