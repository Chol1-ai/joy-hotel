const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Booking = require('../models/Booking');
const Contact = require('../models/Contact');
const { loadRooms, saveRooms, loadGallery, saveGallery, loadNotifications } = require('../lib/adminData');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'joyhotel123';
const SESSIONS = new Map();

function generateSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || '';
  header.split(';').forEach((part) => {
    const [key, ...rest] = part.trim().split('=');
    if (key) {
      cookies[key] = decodeURIComponent(rest.join('='));
    }
  });
  return cookies;
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `joy_admin_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`,
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'joy_admin_session=; HttpOnly; Path=/; Max-Age=0');
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.joy_admin_session;
  const session = token ? SESSIONS.get(token) : null;

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  req.admin = session;
  next();
}

router.get('/me', requireAdmin, (req, res) => {
  res.json({ authenticated: true, username: req.admin.username });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateSessionToken();
    SESSIONS.set(token, { username });
    setSessionCookie(res, token);
    return res.json({ message: 'Signed in successfully.' });
  }

  return res.status(401).json({ error: 'Invalid admin credentials.' });
});

router.post('/logout', requireAdmin, (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.joy_admin_session;
  if (token) {
    SESSIONS.delete(token);
  }
  clearSessionCookie(res);
  res.json({ message: 'Signed out.' });
});

router.get('/requests', requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
    const contacts = await Contact.find().sort({ createdAt: -1 }).lean();
    const notifications = loadNotifications();
    res.json({ bookings, contacts, notifications });
  } catch (error) {
    console.error('Error loading admin requests:', error);
    res.status(500).json({ error: 'Could not load requests.' });
  }
});

router.get('/rooms', requireAdmin, (req, res) => {
  res.json({ rooms: loadRooms() });
});

router.put('/rooms/:id', requireAdmin, (req, res) => {
  try {
    const rooms = loadRooms();
    const room = rooms.find((item) => item.id === req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (req.body.pricePerNight !== undefined) {
      room.pricePerNight = Number(req.body.pricePerNight);
    }
    if (req.body.status !== undefined) {
      room.status = req.body.status;
    }
    if (req.body.availableCount !== undefined) {
      room.availableCount = Math.max(0, Number(req.body.availableCount));
    }
    if (req.body.roomNumbers !== undefined) {
      room.roomNumbers = String(req.body.roomNumbers)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    saveRooms(rooms);
    res.json({ room });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Could not update room.' });
  }
});

router.get('/gallery', requireAdmin, (req, res) => {
  res.json({ gallery: loadGallery() });
});

router.put('/gallery/:id', requireAdmin, (req, res) => {
  try {
    const items = loadGallery();
    const item = items.find((entry) => entry.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found.' });
    }

    item.title = req.body.title || item.title;
    item.description = req.body.description ?? item.description;
    item.category = req.body.category || item.category;
    item.imageUrl = req.body.imageUrl || item.imageUrl;

    saveGallery(items);
    res.json({ item });
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ error: 'Could not update gallery item.' });
  }
});

router.delete('/gallery/:id', requireAdmin, (req, res) => {
  try {
    const items = loadGallery();
    const nextItems = items.filter((entry) => entry.id !== req.params.id);
    if (nextItems.length === items.length) {
      return res.status(404).json({ error: 'Gallery item not found.' });
    }

    saveGallery(nextItems);
    res.json({ message: 'Gallery item deleted.' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: 'Could not delete gallery item.' });
  }
});

module.exports = router;
