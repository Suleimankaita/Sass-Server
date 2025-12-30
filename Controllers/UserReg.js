const asynchandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const Users = require("../Models/User");
const Userprofile = require("../Models/Userprofile");
const Company = require("../Models/AdminOwner");

const UserReg = asynchandler(async (req, res) => {
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
        } = req.body;

        if (!Username || !Password || !Firstname || !Lastname || !Email) {
            return res.status(400).json({ message: 'Username, Password, Firstname, Lastname and Email are required' });
        }

        // Check username uniqueness (case-insensitive)
        const found = await Users.findOne({ Username }).collation({ strength: 2, locale: 'en' }).exec();
        if (found) return res.status(409).json({ message: `This username ${Username} already exists` });

        // Check email uniqueness in Userprofile
        const emailFound = await Userprofile.findOne({ Email }).collation({ strength: 2, locale: 'en' }).exec();
        if (emailFound) return res.status(409).json({ message: `This email ${Email} is already in use` });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(Password, salt);

        // Create profile (store hashed password)
        const createdProfile = await Userprofile.create({
            Password: hashed,
            Email,
        });

        // Normalize PostalNumber to number if provided
        const postalNum = PostalNumber ? Number(PostalNumber) : undefined;

        await Users.create({
            Username,
            Firstname,
            Lastname,
            UserProfileId: createdProfile._id,
            WalletNumber: 10023,
            Address: {
                StreetName,
                PostalNumber: postalNum,
                Lat,
                Long,
            },
        });

        return res.status(201).json({ message: `New user created: ${Username}` });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = UserReg;