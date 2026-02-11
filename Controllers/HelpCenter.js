const nodemailer = require('nodemailer');
const path = require('path');
const asyncHandler = require('express-async-handler');

const submitTicket = asyncHandler(async (req, res) => {
    try {
        const { category, description, email } = req.body;
        const files = req.files || [];
        const refId = `YS-FB${Math.floor(Math.random() * 9000) + 1000}`;

        // 1. Create CID-based attachments
        // We give each file a unique 'cid' string
        const attachments = files.map((f, index) => ({
            filename: f.filename,
            path: f.path,
            cid: `img_attach_${index}` // This is the ID we reference in the HTML
        }));

        // 2. Generate HTML that references the CID
        const imageGalleryHtml = attachments.map(att => `
            <div style="margin-top: 15px;">
                <img src="cid:${att.cid}" alt="Attachment" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;" />
            </div>
        `).join('');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const supportTo = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .header { background-color: #0f172a; color: #ffffff; padding: 32px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; }
                .status-badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; margin-top: 10px; text-transform: uppercase; }
                .content { padding: 32px; background-color: #ffffff; }
                .field-label { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
                .field-value { font-size: 16px; color: #1e293b; margin-bottom: 24px; }
                .description-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #f1f5f9; color: #334155; white-space: pre-wrap; }
                .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
                .image-section { margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>YsStore Support</h1>
                    <div class="status-badge">New Ticket: ${refId}</div>
                </div>
                <div class="content">
                    <div class="field-label">Category</div>
                    <div class="field-value">${category}</div>

                    <div class="field-label">User Email</div>
                    <div class="field-value"><a href="mailto:${email}">${email || 'Not provided'}</a></div>

                    <div class="field-label">Issue Description</div>
                    <div class="description-box">${description}</div>

                    ${attachments.length > 0 ? `
                        <div class="image-section">
                            <div class="field-label">Attached Images</div>
                            ${imageGalleryHtml}
                        </div>
                    ` : ''}
                </div>
                <div class="footer">
                    &copy; 2026 YsStore Nigeria
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"YsStore Help Desk" <${process.env.EMAIL_USER}>`,
            to: supportTo,
            subject: `[${category}] Support Request: ${refId}`,
            replyTo: email || undefined,
            html: htmlContent,
            attachments: attachments, // Send the array with the CIDs
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Support ticket submitted', refId });

    } catch (err) {
        console.error('HelpCenter.submitTicket error:', err);
        return res.status(500).json({ success: false, message: 'Failed to submit ticket', error: err.message });
    }
});

module.exports = { submitTicket };