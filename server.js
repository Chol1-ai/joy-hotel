require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const bookingRoutes = require('./routes/bookings');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/joyhotel';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic protection against form-spamming the API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Static site (all HTML/CSS/JS pages live here)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the web server immediately so the site (and hamburger/menu fixes) are
// always viewable, even if MongoDB isn't running. Booking/contact API calls
// will simply fail gracefully until the DB connects.
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
