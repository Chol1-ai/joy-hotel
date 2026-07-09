const nodemailer = require('nodemailer');

const HOTEL_EMAIL = 'joyhotel33@gmail.com';

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER || HOTEL_EMAIL;
  const emailPassword = process.env.EMAIL_PASSWORD || '';

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  return transporter;
}

async function sendBookingConfirmation(booking) {
  try {
    const mailer = initTransporter();

    const bookingDetails = `
      <h3>Booking Confirmation</h3>
      <p><strong>Confirmation Code:</strong> ${booking.confirmationCode}</p>
      <p><strong>Guest Name:</strong> ${booking.fullName}</p>
      <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toDateString()}</p>
      <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toDateString()}</p>
      <p><strong>Rooms:</strong> ${booking.roomType}</p>
      <p><strong>Guests:</strong> ${booking.guests}</p>
      <p><strong>Total Price:</strong> ${booking.totalPrice.toLocaleString()} UGX</p>
      <p><strong>Payment Method:</strong> ${booking.paymentMethod || 'Not specified'}</p>
      <p><strong>Payment Status:</strong> ${booking.paymentStatus || 'Pending'}</p>
      <hr>
      <p>Keep your confirmation code safe. Use it to manage or cancel your booking.</p>
      <p><strong>Questions?</strong> Reply to this email or contact us at ${HOTEL_EMAIL}</p>
    `;

    await mailer.sendMail({
      from: HOTEL_EMAIL,
      to: booking.email,
      subject: `Booking Confirmation - Joy Hotel (${booking.confirmationCode})`,
      html: bookingDetails,
    });

    console.log(`✉️  Booking confirmation sent to ${booking.email}`);
    return true;
  } catch (error) {
    console.error('Error sending booking confirmation:', error.message);
    return false;
  }
}

async function sendContactReply(contact) {
  try {
    const mailer = initTransporter();

    const replyMessage = `
      <h3>Thank you for contacting Joy Hotel</h3>
      <p>Hi ${contact.name},</p>
      <p>We received your message and will get back to you within 24 hours.</p>
      <hr>
      <p><strong>Your Message:</strong></p>
      <p>${contact.message}</p>
      <hr>
      <p>For urgent inquiries, call us or visit our website.</p>
      <p>Best regards,<br>Joy Hotel Team</p>
    `;

    await mailer.sendMail({
      from: HOTEL_EMAIL,
      to: contact.email,
      subject: `Re: ${contact.subject || 'Your Inquiry'} - Joy Hotel`,
      html: replyMessage,
    });

    // Also send a notification to the hotel
    const hotelNotification = `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${contact.name}</p>
      <p><strong>Email:</strong> ${contact.email}</p>
      <p><strong>Phone:</strong> ${contact.phone || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${contact.subject || 'General Inquiry'}</p>
      <p><strong>Message:</strong></p>
      <p>${contact.message}</p>
    `;

    await mailer.sendMail({
      from: HOTEL_EMAIL,
      to: HOTEL_EMAIL,
      subject: `New Contact: ${contact.name}`,
      html: hotelNotification,
    });

    console.log(`✉️  Contact reply sent to ${contact.email}`);
    return true;
  } catch (error) {
    console.error('Error sending contact reply:', error.message);
    return false;
  }
}

async function sendPaymentConfirmation(booking) {
  try {
    const mailer = initTransporter();

    const paymentDetails = `
      <h3>Payment Confirmed</h3>
      <p>Your payment has been received and confirmed.</p>
      <p><strong>Booking Code:</strong> ${booking.confirmationCode}</p>
      <p><strong>Amount Paid:</strong> ${booking.totalPrice.toLocaleString()} UGX</p>
      <p><strong>Payment Reference:</strong> ${booking.paymentReference || 'N/A'}</p>
      <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
      <hr>
      <p>Your reservation is now confirmed. We look forward to your stay!</p>
      <p>If you have any questions, contact us at ${HOTEL_EMAIL}</p>
    `;

    await mailer.sendMail({
      from: HOTEL_EMAIL,
      to: booking.email,
      subject: `Payment Confirmed - Joy Hotel (${booking.confirmationCode})`,
      html: paymentDetails,
    });

    console.log(`✉️  Payment confirmation sent to ${booking.email}`);
    return true;
  } catch (error) {
    console.error('Error sending payment confirmation:', error.message);
    return false;
  }
}

module.exports = {
  sendBookingConfirmation,
  sendContactReply,
  sendPaymentConfirmation,
};
