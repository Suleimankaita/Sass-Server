const nodemailer = require('nodemailer');
const path = require('path');

const submitTicket = async (req, res) => {
    try {
        const { category = 'General', description = '', email = '' } = req.body || {};
        const files = req.files || [];
        const refId = `YS-FB${Math.floor(Math.random() * 9000) + 1000}`;

        // 1. DYNAMIC TRANSPORTER: Works with any SMTP service
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,       // e.g., smtp.sendgrid.net or smtp.gmail.com
            port: process.env.EMAIL_PORT || 587, 
            secure: process.env.EMAIL_PORT == 465, // true for 465, false for others
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const attachments = files.map((f) => ({
            filename: f.originalname || path.basename(f.path),
            path: f.path,
        }));

        const supportTo = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;

        // 2. MODERN HTML EMAIL UI
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
                .attachment-notice { margin-top: 20px; font-size: 13px; color: #3b82f6; font-weight: 600; }
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
                    <div class="field-value"><a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email || 'Not provided'}</a></div>

                    <div class="field-label">Issue Description</div>
                    <div class="description-box">${description}</div>

                    ${attachments.length > 0 ? `
                        <div class="attachment-notice">
                            📎 ${attachments.length} attachment(s) included with this ticket.
                        </div>
                    ` : ''}
                </div>
                <div class="footer">
                    Sent via YsStore Help Center Console<br />
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
            attachments,
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Support ticket submitted', refId });

    } catch (err) {
        console.error('HelpCenter.submitTicket error:', err);
        return res.status(500).json({ success: false, message: 'Failed to submit ticket', error: err.message });
    }
};

module.exports = { submitTicket };