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

    if (!Username || !Password || !Firstname || !Lastname || !Email || !CompanyName || !CAC_Number)
      return res.status(400).json({ message: 'All fields are required' });

    const found = await Admin.findOne({ Username })
      .collation({ strength: 2, locale: 'en' })
      .lean()
      .exec();

    if (found)
      return res
        .status(409)
        .json({ message: `The username '${Username}' is already used by another admin.` });

        const newAd=await profile.create({
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
        })

        const log=await Logss.create({
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
    const newAdmin = await Admin.create({
      Username,
      Password,
      UserProfileId:newAd._id,
      UserLogs:log._id
     
    });


    res.status(201).json({
      message: `New Admin '${Username}' created successfully`,
      admin: newAdmin,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = AdminRegs;
