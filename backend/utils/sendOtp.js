const nodemailer = require('nodemailer');

// Create a transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com', // Hostinger SMTP server
    port: 465, // Secure port for SMTP
    secure: true, // Use SSL
    auth: {
        user: 'devs@cryptique.io',
        pass: 'Yonder9!Dealer1', 
    },
    from: 'devs@cryptique.io'
});

// Function to send OTP email
const sendOtp = async (to, subject, text) => {
    try {
        const mailOptions = {
            from: 'devs@cryptique.io', // Sender address
            to, // Recipient address
            subject, // Email subject
            text, // Email body

        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = sendOtp;