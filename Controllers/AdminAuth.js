const Jwt = require('jsonwebtoken');
const asynchandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../Models/AdminOwner');
const Logs = require('../Models/UserLog');
const Settings=require('../Models/CompanySetting')
const { canUserLogin } = require('../utils/subscriptionCheck');

const Auth = asynchandler(async (req, res) => {
    try {
        const { Username, Password } = req.body;

        console.log(req.body)
        if (!Username || !Password) return res.status(400).json({ message: 'Username and Password are required' });

        const found = await User.findOne({ Username }).populate('UserProfileId').populate("companyId").exec();
        console.log(found)
        if (!found) return res.status(404).json({ message: 'User not found' });

        if (found.Active === false) return res.status(403).json({ message: 'Account suspended. Contact support.' });

        
        if (!found.UserProfileId || !found.UserProfileId.password) {
            return res.status(500).json({ message: 'User profile or password missing' });
        }

        // const passwordMatches = await bcrypt.compare(Password, found.UserProfileId.password);
        if (Password!==found.UserProfileId.password) return res.status(401).json({ message: 'Incorrect username or password' });
        
        // Check subscription status for non-admin users
        if (found.companyId && found.Role !== "Admin") {
            const loginCheck = canUserLogin(found, found.companyId, found.Role);
            
            if (!loginCheck.canLogin) {
                return res.status(403).json({
                    message: loginCheck.message,
                    subscriptionStatus: loginCheck.subscriptionStatus
                });
            }
        }
        
        const com =await Settings.findOne({companyId:found?.companyId?._id.toString()}).exec() 

        console.log('found ',com)
        // create login log
        const logEntry = await Logs.create({
            Username: found.Username,
            Date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
        });

        if (!found.UserLogId) found.UserLogId = [];
        found.UserLogId.push(logEntry._id);
        if (!found.Role) found.Role = 'User';
        await found.save();
        const payload = {
            UserInfo: {
                Username: found.Username,
                Role: found.Role,
                id: found._id,
                companyId:found?.companyId._id,
          companyName:found?.companyId?.CompanyName

            },
        };

        const accessToken = Jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        const refreshToken = Jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        found.UserProfileId.token=refreshToken;
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };

        await found.save()
        await found.UserProfileId.save()
        res.cookie('AdminCookie', refreshToken, cookieOptions); 
        return res.status(200).json({ accessToken, role: found.Role,status:201 });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = Auth;