require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const bookingRoutes = require('./routes/bookings');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const { loadGallery, addNotification } = require('./lib/adminData');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/joyhotel';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Basic protection against form-spamming the API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
});

// Admin routes need to stay responsive for dashboard actions.
app.use('/api/admin', adminRoutes);
app.use('/api/', apiLimiter);

// Static site (all HTML/CSS/JS pages)
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload. Please try again.' });
  }
  next(err);
});

// API routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);

app.get('/api/gallery', async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.json({ gallery: await loadGallery() });
});

app.post('/api/notifications/email-click', async (req, res) => {
  try {
    const email = req.body?.email || req.query?.email || 'joyhotel@gmail.com';
    await addNotification('footer_email_click', { email });
    console.log(`📧 Footer email link clicked: ${email}`);
    res.json({ message: 'Notification recorded.' });
  } catch (error) {
    console.error('Error recording email click:', error);
    res.status(500).json({ error: 'Could not record notification.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});


app.listen(PORT, () => {
  console.log(`✔ Joy Hotel server running at http://localhost:${PORT}`);
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✔ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('✘ Failed to connect to MongoDB:', err.message);
    console.error('  The website will still load, but booking/contact forms need MongoDB running.');
    console.error('  Check MONGODB_URI in your .env file and make sure MongoDB is running.');
  });
