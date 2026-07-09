const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { sendContactReply } = require('../lib/mail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact — submit the contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (message.trim().length < 10) {
      return res.status(400).json({ error: 'Your message should be at least 10 characters.' });
    }

    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      subject: (subject || 'General Enquiry').trim(),
      message: message.trim(),
    });

    // Send auto-reply and notification emails (async, don't wait)
    sendContactReply(contact).catch((err) => {
      console.error('Failed to send contact reply emails:', err.message);
    });

    res.status(201).json({
      message: "Thank you — your message has been sent. We'll get back to you shortly.",
      contact,
    });
  } catch (err) {
    console.error('Error saving contact message:', err);
    res.status(500).json({ error: 'Something went wrong while sending your message.' });
  }
});

module.exports = router;
