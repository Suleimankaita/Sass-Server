const asynchandler = require('express-async-handler');
const Users = require('../Models/use');
const text = require('../Models/text');

// 🟢 COMPANY REGISTRATION
const CompanyRegs = asynchandler(async (req, res) => {
  try {
    const {
      Username,
        name
    } = req.body;

    // if (!Username || !Password || !Firstname || !Lastname || !Email || !CompanyName || !CAC_Number)
    //   return res.status(400).json({ message: 'All fields are required' });

    const found = await text.findOne({ Username })
      .collation({ strength: 2, locale: 'en' })
      .lean()
      .exec();

    if (found)
      return res
        .status(409)
        .json({ message: `The username '${Username}' is already used by another company.` });

    const newCompany = await text.create({
      Username,
      log:[
        {
          time:new Date()
        }
      ]
    });

    
    await Users.create({
     username:newCompany._id,
     name

    });

    res.status(201).json({
      message: `New '${Username}' text`,
      company: newCompany,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = CompanyRegs;
