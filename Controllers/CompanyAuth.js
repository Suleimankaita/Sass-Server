const Jwt = require('jsonwebtoken');
const asynchandler = require('express-async-handler');
const User = require('../Models/AdminOwner');
const Logss = require("../Models/UserLog");

const CompanyAuth = asynchandler(async (req, res) => {
  try {
    const { Username, Password } = req.body;

    if (!Username || !Password)
      return res.status(400).json({ message: 'All fields are required' });

    const found = await User.findOne({ Username }).populate("UserProfileId").populate("companyId").exec();
    if (!found)
      return res.status(400).json({ message: 'User not found' });

    console.log(found)

    if (!found.Active)
      return res.status(403).json({
        message: "This company is suspended. Contact support: ysstoreSupport@gmail.com"
      });

    if (found.Password !== Password)
      return res.status(400).json({ message: 'Incorrect Username or Password' });

    const accessToken = Jwt.sign(
      {
        UserInfo: {
          Username: found.Username,
          Role: found.Role,
          id: found._id,
          companyName:found?.companyId?.companyName

          
        }
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" }
    );

    const refreshToken = Jwt.sign(
      {
        UserInfo: {
          Username: found.Username,
          Role: found.Role,
          id: found._id,
          companyName:found?.companyId?.companyName

        }
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie('jwt', refreshToken, {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    found.UserProfileId.token=accessToken
    const logEntry = await Logss.create({
      name: found.Firstname,
      Username: found.Username,
      Date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString()
    });

    if (!found.UserLogs) found.UserLogs = [];
    found.UserLogs.push(logEntry._id);
    await found.save();
    await found.UserProfileId.save();

    res.status(200).json({
      message: "Login successful",
      token: accessToken
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = CompanyAuth;
