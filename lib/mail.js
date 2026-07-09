const nodemailer = require('nodemailer');

const HOTEL_EMAIL = 'joyhotel33@gmail.com';

let transporter = null;

function resolveMailConfig() {
  const resendApiKey = process.env.RESEND_API_KEY || '';

  if (resendApiKey) {
    return {
      provider: 'resend',
      apiKey: resendApiKey,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      replyToEmail: process.env.RESEND_REPLY_TO_EMAIL || process.env.EMAIL_USER || HOTEL_EMAIL,
    };
  }

  return {
    provider: 'nodemailer',
    fromEmail: process.env.EMAIL_USER || HOTEL_EMAIL,
    replyToEmail: process.env.EMAIL_USER || HOTEL_EMAIL,
  };
}

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

async function sendEmail({ to, subject, html, text, fromEmail, replyToEmail }) {
  const config = resolveMailConfig();
  const sender = fromEmail || config.fromEmail;
  const replyTo = replyToEmail || config.replyToEmail;

  if (config.provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        reply_to: replyTo,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend error ${response.status}: ${errorBody}`);
    }

    return true;
  }

  const mailer = initTransporter();
  await mailer.sendMail({
    from: sender,
    to,
    replyTo,
    subject,
    html,
    text,
  });

  return true;
}

async function sendBookingConfirmation(booking) {
  try {
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

    await sendEmail({
      to: booking.email,
      subject: `Booking Confirmation - Joy Hotel (${booking.confirmationCode})`,
      html: bookingDetails,
      text: `Booking confirmation for ${booking.fullName}. Confirmation code: ${booking.confirmationCode}`,
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

    await sendEmail({
      to: contact.email,
      subject: `Re: ${contact.subject || 'Your Inquiry'} - Joy Hotel`,
      html: replyMessage,
      text: `Thanks for contacting Joy Hotel. We received your message and will respond shortly.`,
    });

    const hotelNotification = `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${contact.name}</p>
      <p><strong>Email:</strong> ${contact.email}</p>
      <p><strong>Phone:</strong> ${contact.phone || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${contact.subject || 'General Inquiry'}</p>
      <p><strong>Message:</strong></p>
      <p>${contact.message}</p>
    `;

    await sendEmail({
      to: HOTEL_EMAIL,
      subject: `New Contact: ${contact.name}`,
      html: hotelNotification,
      text: `New contact message from ${contact.name}`,
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

    await sendEmail({
      to: booking.email,
      subject: `Payment Confirmed - Joy Hotel (${booking.confirmationCode})`,
      html: paymentDetails,
      text: `Payment confirmed for booking ${booking.confirmationCode}.`,
    });

    const adminNotification = `
      <h3>Payment Received - Booking ${booking.confirmationCode}</h3>
      <p><strong>Guest:</strong> ${booking.fullName}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
      <p><strong>Amount Paid:</strong> ${booking.totalPrice.toLocaleString()} UGX</p>
      <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
      <p><strong>Payment Reference:</strong> ${booking.paymentReference || 'N/A'}</p>
      <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toDateString()}</p>
      <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toDateString()}</p>
      <p><strong>Rooms:</strong> ${booking.roomType}</p>
    `;

    await sendEmail({
      to: HOTEL_EMAIL,
      subject: `Payment Received - Booking ${booking.confirmationCode}`,
      html: adminNotification,
      text: `Payment received for booking ${booking.confirmationCode}`,
    });

    console.log(`✉️  Payment confirmation sent to ${booking.email}`);
    return true;
  } catch (error) {
    console.error('Error sending payment confirmation:', error.message);
    return false;
  }
}

async function sendBookingNotification(booking) {
  try {
    const adminNotification = `
      <h3>New Booking Received - ${booking.confirmationCode}</h3>
      <p><strong>Guest Name:</strong> ${booking.fullName}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
      <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toDateString()}</p>
      <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toDateString()}</p>
      <p><strong>Rooms:</strong> ${booking.roomType}</p>
      <p><strong>Number of Guests:</strong> ${booking.guests}</p>
      <p><strong>Total Price:</strong> ${booking.totalPrice.toLocaleString()} UGX</p>
      <p><strong>Payment Method:</strong> ${booking.paymentMethod || 'Not specified'}</p>
      <p><strong>Payment Status:</strong> ${booking.paymentStatus || 'Pending'}</p>
      <p><strong>Special Requests:</strong> ${booking.specialRequests || 'None'}</p>
      <hr>
      <p><strong>Assigned Rooms:</strong></p>
      <ul>
        ${booking.assignedRoomNumbers.map(room => `<li>${room}</li>`).join('')}
      </ul>
      <p>Log in to the admin dashboard to manage this booking.</p>
    `;

    await sendEmail({
      to: HOTEL_EMAIL,
      subject: `New Booking - Joy Hotel (${booking.confirmationCode})`,
      html: adminNotification,
      text: `New booking received for ${booking.fullName}`,
    });

    console.log(`✉️  Booking notification sent to admin`);
    return true;
  } catch (error) {
    console.error('Error sending booking notification:', error.message);
    return false;
  }
}

module.exports = {
  sendBookingConfirmation,
  sendBookingNotification,
  sendContactReply,
  sendPaymentConfirmation,
  resolveMailConfig,
};
