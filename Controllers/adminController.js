const asynchandler = require('express-async-handler');
const Admin = require('../Models/AdminOwner');
const Logss = require('../Models/UserLog');
const profile = require('../Models/Userprofile');


const AdminRegs = asynchandler(async (req, res) => {
  try {
    const {
      Username,
      Password,
      Firstname,
      Lastname,
      StreetName,
      PostalNumber,
      Lat,
      Long,
      Email,
      CompanyName,
      CAC_Number,
    } = req.body;
    console.log(req.body);
    if (!Username || !Password || !Firstname || !Lastname || !Email )
      return res.status(400).json({ message: 'All fields are required' });

    const found = await Admin.findOne({ Username })
      .collation({ strength: 2, locale: 'en' })
      .lean()
      .exec();

    if (found)
      return res
        .status(409)
        .json({ message: `The username '${Username}' is already used by another admin.` });

        const emailfound=await profile.findOne({Email}).exec()
        if(emailfound)return res.status(409).json({'message':'Email already in use'})

        const newAd=await profile.create({
 Firstname,
      Lastname,
      Email,
      password:Password,
      WalletNumber: Math.floor(Math.random() * 90000) + 10000,
      Address: {
        StreetName,
        PostalNumber,
        Lat,
        Long,
      },
      CompanyName,
      CAC_Number,
        })

        const log=await Logss.create({
          
            
              name: `${Firstname} ${Lastname}`,
              Username,
              // Password,
              Date: new Date().toISOString(),
              time: new Date().toLocaleTimeString(),
                    });
    const newAdmin = await Admin.create({
      Username,
      UserProfileId:newAd._id,
      UserLogId:log._id,
     
    });


    res.status(201).json({
      message: `New Admin '${Username}' created successfully`,
      admin: newAdmin,
      status: 201,
      
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = AdminRegs;
