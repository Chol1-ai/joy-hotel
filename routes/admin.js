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
    const notifications = await loadNotifications();
    res.json({ bookings, contacts, notifications });
  } catch (error) {
    console.error('Error loading admin requests:', error);
    res.status(500).json({ error: 'Could not load requests.' });
  }
});

router.get('/rooms', requireAdmin, async (req, res) => {
  res.json({ rooms: await loadRooms() });
});

router.put('/rooms/:id', requireAdmin, async (req, res) => {
  try {
    const rooms = await loadRooms();
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
    if (req.body.name !== undefined) {
      room.name = String(req.body.name).trim();
    }
    if (req.body.maxGuests !== undefined) {
      room.maxGuests = Math.max(1, Number(req.body.maxGuests));
    }
    if (req.body.description !== undefined) {
      room.description = String(req.body.description);
    }
    if (req.body.image !== undefined) {
      room.image = String(req.body.image);
    }

    await saveRooms(rooms);
    res.json({ room });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Could not update room.' });
  }
});

function normalizeRoomId(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

router.post('/rooms', requireAdmin, async (req, res) => {
  try {
    const rooms = await loadRooms();
    const rawId = String(req.body.id || '').trim();
    const id = normalizeRoomId(rawId);

    if (!id) {
      return res.status(400).json({ error: 'A valid room id is required.' });
    }
    if (rooms.some((item) => item.id === id)) {
      return res.status(409).json({ error: 'A room with that id already exists.' });
    }

    const newRoom = {
      id,
      name: String(req.body.name || '').trim() || 'New Room',
      pricePerNight: Math.max(0, Number(req.body.pricePerNight) || 0),
      maxGuests: Math.max(1, Number(req.body.maxGuests) || 1),
      description: String(req.body.description || '').trim(),
      image: String(req.body.image || '').trim() || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=900&auto=format&fit=crop',
      status: String(req.body.status || 'available') === 'full' ? 'full' : 'available',
      availableCount: Math.max(0, Number(req.body.availableCount) || 0),
      roomNumbers: String(req.body.roomNumbers || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    };

    rooms.push(newRoom);
    await saveRooms(rooms);
    res.status(201).json({ room: newRoom });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Could not create room.' });
  }
});

router.delete('/rooms/:id', requireAdmin, async (req, res) => {
  try {
    const rooms = await loadRooms();
    const nextRooms = rooms.filter((item) => item.id !== req.params.id);
    if (nextRooms.length === rooms.length) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    await saveRooms(nextRooms);
    res.json({ message: 'Room deleted.' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Could not delete room.' });
  }
});

router.get('/gallery', requireAdmin, async (req, res) => {
  res.json({ gallery: await loadGallery() });
});

router.put('/gallery/:id', requireAdmin, async (req, res) => {
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

    await saveGallery(items);
    res.json({ item });
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ error: 'Could not update gallery item.' });
  }
});

router.delete('/gallery/:id', requireAdmin, async (req, res) => {
  try {
    const items = loadGallery();
    const nextItems = items.filter((entry) => entry.id !== req.params.id);
    if (nextItems.length === items.length) {
      return res.status(404).json({ error: 'Gallery item not found.' });
    }

    await saveGallery(nextItems);
    res.json({ message: 'Gallery item deleted.' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: 'Could not delete gallery item.' });
  }
});

module.exports = router;
