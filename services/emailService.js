// services/emailService.js
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: to || process.env.EMAIL_TO,
      subject,
      text,
      html,
    });

    console.log('Correo enviado: %s', info.messageId);
    // Preview URL available if using Ethereal
    if (process.env.EMAIL_HOST === 'smtp.ethereal.email') {
      console.log('Vista previa del correo: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw new Error('No se pudo enviar el correo de alerta.');
  }
}

module.exports = { sendEmail };
