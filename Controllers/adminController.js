const asynchandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const Admin = require('../Models/AdminOwner');
const Logss = require('../Models/UserLog');
const profile = require('../Models/Userprofile');

// --- 📧 NODEMAILER TRANSPORTER ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

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

        // 1. Validation
        if (!Username || !Password || !Firstname || !Lastname || !Email) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // 2. Check for existing Username
        const found = await Admin.findOne({ Username })
            .collation({ strength: 2, locale: 'en' })
            .lean()
            .exec();

        if (found) {
            return res.status(409).json({ message: `The username '${Username}' is already used.` });
        }

        // 3. Check for existing Email
        const emailfound = await profile.findOne({ Email }).exec();
        if (emailfound) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        // 4. BCRYPT: Hash the password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(Password, salt);

        // 5. Create User Profile
        const newAd = await profile.create({
            fullName: `${Firstname} ${Lastname}`, // Assuming your schema uses fullName
            Firstname,
            Lastname,
            Email: Email.toLowerCase(),
            password: hashedPassword, // Storing the hashed version
            WalletNumber: Math.floor(Math.random() * 90000) + 10000,
            Address: {
                StreetName,
                PostalNumber,
                Lat,
                Long,
            },
            CompanyName,
            CAC_Number,
        });

        // 6. Create User Logs
        const log = await Logss.create({
            name: `${Firstname} ${Lastname}`,
            Username,
            Date: new Date().toISOString(),
            time: new Date().toLocaleTimeString(),
        });

        // 7. Create Admin Document
        const newAdmin = await Admin.create({
            Username,
            UserProfileId: newAd._id,
            UserLogId: log._id,
            companyId:null
        });

        // 8. Send Welcome Email (Responsive Template)
        const mailOptions = {
            from: `"YsStore Admin Team" <${process.env.EMAIL_USER}>`,
            to: Email,
            subject: "🚀 Welcome to the YsStore Admin Panel",
            html: `
            <div style="background-color: #f8fafc; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: auto; background: white; border-radius: 20px; overflow: hidden; shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                    <div style="background: linear-gradient(135deg, #66c6ec 0%, #2563eb 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Welcome Aboard!</h1>
                        <p style="opacity: 0.9;">Your Admin account has been activated.</p>
                    </div>
                    <div style="padding: 30px; color: #334155;">
                        <p>Hi <strong>${Firstname}</strong>,</p>
                        <p>Your registration as an Admin/Owner for <strong>${CompanyName || 'YsStore'}</strong> was successful. You can now manage your operations using the credentials below:</p>
                        
                        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Username:</strong> ${Username}</p>
                            <p style="margin: 5px 0;"><strong>Login Email:</strong> ${Email}</p>
                        </div>

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${process.env.CLIENT_URL}/login" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Login to Dashboard</a>
                        </div>
                        
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                        <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not authorize this registration, please contact security immediately.</p>
                    </div>
                </div>
            </div>`
        };

        // Fire and forget email (don't let email failure block the response)
        transporter.sendMail(mailOptions).catch(err => console.error("Mail Error:", err));

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