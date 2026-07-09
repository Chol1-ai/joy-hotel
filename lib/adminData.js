const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const AdminData = require('../models/AdminData');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(ROOMS_FILE)) {
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(defaultRooms(), null, 2));
  }

  if (!fs.existsSync(GALLERY_FILE)) {
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(defaultGallery(), null, 2));
  }

  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
  }
}

function readJson(filePath, fallback) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function resolveStoredData(remoteValue, fallbackValue) {
  if (Array.isArray(remoteValue) && remoteValue.length) {
    return remoteValue;
  }

  return fallbackValue;
}

const DEFAULT_ROOM_INVENTORY = {
  deluxe: { availableCount: 4, roomNumbers: ['101', '102', '103', '104'] },
  executive: { availableCount: 3, roomNumbers: ['201', '202', '203'] },
  presidential: { availableCount: 2, roomNumbers: ['301', '302'] },
  family: { availableCount: 3, roomNumbers: ['401', '402', '403'] },
};

function buildRoomNumbers(count, baseRoomNumbers) {
  const normalizedBase = Array.isArray(baseRoomNumbers)
    ? baseRoomNumbers.filter(Boolean).map(String)
    : [];
  const safeCount = Math.max(0, Number(count) || 0);

  if (!safeCount) {
    return [];
  }

  if (normalizedBase.length >= safeCount) {
    return normalizedBase.slice(0, safeCount);
  }

  const generated = [...normalizedBase];
  if (normalizedBase.length) {
    const lastValue = String(normalizedBase[normalizedBase.length - 1]);
    const match = lastValue.match(/^(.*?)(\d+)$/);
    const prefix = match ? match[1] : '';
    const digits = match ? match[2] : '';
    const width = digits.length;
    const lastNumber = match ? Number(digits) : Number(lastValue);

    for (let index = normalizedBase.length; index < safeCount; index += 1) {
      const nextNumber = lastNumber + (index - normalizedBase.length + 1);
      const formatted = width > 0
        ? `${prefix}${String(nextNumber).padStart(width, '0')}`
        : `${prefix}${nextNumber}`;
      generated.push(formatted);
    }

    return generated;
  }

  return Array.from({ length: safeCount }, (_, index) => String(index + 1));
}

function normalizeRoom(room) {
  const defaults = DEFAULT_ROOM_INVENTORY[room.id] || { availableCount: 0, roomNumbers: [] };
  const roomNumbers = Array.isArray(room.roomNumbers)
    ? room.roomNumbers.filter(Boolean).map(String)
    : [];
  const hasExplicitCount = Number.isFinite(Number(room.availableCount));
  const availableCount = hasExplicitCount
    ? Math.max(0, Number(room.availableCount))
    : (roomNumbers.length ? roomNumbers.length : defaults.availableCount);

  const resolvedRoomNumbers = roomNumbers.length
    ? buildRoomNumbers(Math.max(availableCount, roomNumbers.length), roomNumbers)
    : buildRoomNumbers(Math.max(availableCount, defaults.availableCount), defaults.roomNumbers);

  return {
    ...room,
    availableCount: Math.max(availableCount, resolvedRoomNumbers.length),
    roomNumbers: resolvedRoomNumbers,
    status: room.status === 'full' ? 'full' : (Math.max(availableCount, resolvedRoomNumbers.length) === 0 ? 'full' : 'available'),
  };
}

function reserveRoomNumber(room) {
  const normalized = normalizeRoom(room);
  const roomNumber = normalized.roomNumbers[0] || null;
  const nextRoomNumbers = normalized.roomNumbers.slice(1);
  const nextAvailableCount = Math.max(0, normalized.availableCount - 1);
  const nextRoom = {
    ...normalized,
    availableCount: nextAvailableCount,
    roomNumbers: nextRoomNumbers,
    status: nextAvailableCount === 0 && nextRoomNumbers.length === 0 ? 'full' : 'available',
  };
  return { roomNumber, room: nextRoom };
}

function allocateRoomNumberForBooking(room, bookings = [], checkInDate, checkOutDate) {
  const normalized = normalizeRoom(room);
  const roomLabel = normalized.name || '';
  const normalizedCheckIn = checkInDate ? new Date(checkInDate) : null;
  const normalizedCheckOut = checkOutDate ? new Date(checkOutDate) : null;
  const activeBookings = (Array.isArray(bookings) ? bookings : []).filter((booking) => {
    if (!booking || booking.status === 'cancelled') {
      return false;
    }

    const bookingCheckIn = booking.checkIn ? new Date(booking.checkIn) : null;
    const bookingCheckOut = booking.checkOut ? new Date(booking.checkOut) : null;
    const roomMatches = (booking.roomTypes || []).some((roomType) => roomType === roomLabel) ||
      (booking.assignedRoomNumbers || []).some((assigned) => String(assigned).includes(roomLabel));

    if (!roomMatches || !bookingCheckIn || !bookingCheckOut) {
      return false;
    }

    if (normalizedCheckIn && normalizedCheckOut) {
      return !(normalizedCheckOut <= bookingCheckIn || normalizedCheckIn >= bookingCheckOut);
    }

    return true;
  });

  if (activeBookings.length) {
    return { roomNumber: null, room: normalized };
  }

  return reserveRoomNumber(normalized);
}

function defaultRooms() {
  return [
    normalizeRoom({
      id: 'deluxe',
      name: 'Deluxe Room',
      pricePerNight: 180000,
      maxGuests: 2,
      description: 'Elegant comfort with a king bed, city views and a marble bathroom.',
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=900&auto=format&fit=crop',
      status: 'available',
      availableCount: 4,
      roomNumbers: ['101', '102', '103', '104'],
    }),
    normalizeRoom({
      id: 'executive',
      name: 'Executive Suite',
      pricePerNight: 260000,
      maxGuests: 3,
      description: 'A spacious suite with a separate lounge, workspace and premium amenities.',
      image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop',
      status: 'available',
      availableCount: 3,
      roomNumbers: ['201', '202', '203'],
    }),
    normalizeRoom({
      id: 'presidential',
      name: 'Presidential Suite',
      pricePerNight: 420000,
      maxGuests: 4,
      description: 'The pinnacle of luxury — panoramic views, a private balcony and butler service.',
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=900&auto=format&fit=crop',
      status: 'available',
      availableCount: 2,
      roomNumbers: ['301', '302'],
    }),
    normalizeRoom({
      id: 'family',
      name: 'Family Room',
      pricePerNight: 220000,
      maxGuests: 5,
      description: 'Generous space for the whole family, with two queen beds and a sitting area.',
      image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop',
      status: 'available',
      availableCount: 3,
      roomNumbers: ['401', '402', '403'],
    }),
  ];
}

function defaultGallery() {
  return [
    {
      id: 'room-1',
      title: 'Deluxe Suite',
      category: 'rooms',
      description: 'A refined bedroom retreat with premium finishes and panoramic views.',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'room-2',
      title: 'Executive Room',
      category: 'rooms',
      description: 'Elegant workspace and lounge area for business travelers.',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'room-3',
      title: 'Royal Bedroom',
      category: 'rooms',
      description: 'Luxurious comfort with soft lighting and bespoke interiors.',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'room-4',
      title: 'Family Apartment',
      category: 'rooms',
      description: 'Spacious family living with relaxed comfort and privacy.',
      imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'dining-1',
      title: 'Main Restaurant',
      category: 'dining',
      description: 'Elegant dining with international cuisine and candlelit ambience.',
      imageUrl: 'https://images.unsplash.com/photo-1753727471014-efe38840c7c7?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'dining-2',
      title: 'Breakfast Terrace',
      category: 'dining',
      description: 'A bright morning setting filled with fresh flavors and sunrise views.',
      imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'dining-3',
      title: 'Chef’s Table',
      category: 'dining',
      description: 'A curated culinary experience with seasonal signature dishes.',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'dining-4',
      title: 'Poolside Bar',
      category: 'dining',
      description: 'Refreshing drinks and light bites by the water.',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'spa-1',
      title: 'Spa & Wellness',
      category: 'spa',
      description: 'Rejuvenating treatments and a calming wellness experience.',
      imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'spa-2',
      title: 'Massage Suite',
      category: 'spa',
      description: 'A serene setting designed for total relaxation and restoration.',
      imageUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'spa-3',
      title: 'Sauna & Steam',
      category: 'spa',
      description: 'Luxury wellness rituals with heat, calm and comfort.',
      imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'events-1',
      title: 'Garden Event',
      category: 'events',
      description: 'Elegant outdoor celebrations under the evening lights.',
      imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'events-2',
      title: 'Ballroom Reception',
      category: 'events',
      description: 'Grand celebrations with refined decor, lighting and music.',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'events-3',
      title: 'Conference Setup',
      category: 'events',
      description: 'Professional meetings and executive gatherings with style.',
      imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'events-4',
      title: 'Wedding Celebration',
      category: 'events',
      description: 'Romantic celebrations designed to leave lasting memories.',
      imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'facilities-1',
      title: 'Infinity Pool',
      category: 'facilities',
      description: 'A serene poolside retreat with skyline views and luxury comfort.',
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'facilities-2',
      title: 'Lobby Lounge',
      category: 'facilities',
      description: 'Relax in style with a warm and welcoming atmosphere.',
      imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'facilities-3',
      title: 'Sunset Deck',
      category: 'facilities',
      description: 'A peaceful rooftop experience for evening relaxation.',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'facilities-4',
      title: 'Fitness Center',
      category: 'facilities',
      description: 'Modern equipment and wellness facilities for every guest.',
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
    },
  ];
}

async function persistToMongo(key, patch) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const doc = await AdminData.findOneAndUpdate(
      { key },
      { $set: patch },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return doc;
  } catch (error) {
    console.error('Mongo admin data persistence failed:', error.message);
    return null;
  }
}

async function loadFromMongo(key) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const doc = await AdminData.findOne({ key }).lean();
    return doc;
  } catch (error) {
    console.error('Mongo admin data load failed:', error.message);
    return null;
  }
}

async function loadRooms() {
  ensureDataFiles();
  const mongoDoc = await loadFromMongo('site');
  const mongoRooms = Array.isArray(mongoDoc?.rooms) ? mongoDoc.rooms : null;
  const rooms = resolveStoredData(mongoRooms, readJson(ROOMS_FILE, defaultRooms()));
  return (Array.isArray(rooms) ? rooms : []).map((room) => normalizeRoom(room));
}

async function saveRooms(rooms) {
  ensureDataFiles();
  const normalized = (Array.isArray(rooms) ? rooms : []).map((room) => normalizeRoom(room));
  writeJson(ROOMS_FILE, normalized);
  await persistToMongo('site', { rooms: normalized });
  return normalized;
}

async function loadGallery() {
  ensureDataFiles();
  const mongoDoc = await loadFromMongo('site');
  const mongoGallery = Array.isArray(mongoDoc?.gallery) ? mongoDoc.gallery : null;
  return resolveStoredData(mongoGallery, readJson(GALLERY_FILE, defaultGallery()));
}

async function saveGallery(items) {
  ensureDataFiles();
  writeJson(GALLERY_FILE, items);
  await persistToMongo('site', { gallery: items });
}

async function loadNotifications() {
  ensureDataFiles();
  const mongoDoc = await loadFromMongo('site');
  const mongoNotifications = Array.isArray(mongoDoc?.notifications) ? mongoDoc.notifications : null;
  return resolveStoredData(mongoNotifications, readJson(NOTIFICATIONS_FILE, []));
}

async function saveNotifications(items) {
  ensureDataFiles();
  writeJson(NOTIFICATIONS_FILE, items);
  await persistToMongo('site', { notifications: items });
}

async function addNotification(type, details) {
  const notifications = await loadNotifications();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    details,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...notifications].slice(0, 50);
  await saveNotifications(next);
  return entry;
}

module.exports = {
  ensureDataFiles,
  loadRooms,
  saveRooms,
  loadGallery,
  saveGallery,
  loadNotifications,
  saveNotifications,
  addNotification,
  normalizeRoom,
  reserveRoomNumber,
  allocateRoomNumberForBooking,
};
