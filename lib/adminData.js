const fs = require('fs');
const path = require('path');

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

const DEFAULT_ROOM_INVENTORY = {
  deluxe: { availableCount: 4, roomNumbers: ['101', '102', '103', '104'] },
  executive: { availableCount: 3, roomNumbers: ['201', '202', '203'] },
  presidential: { availableCount: 2, roomNumbers: ['301', '302'] },
  family: { availableCount: 3, roomNumbers: ['401', '402', '403'] },
};

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
    ? roomNumbers
    : (defaults.roomNumbers.length ? defaults.roomNumbers : Array.from({ length: Math.max(availableCount, 0) }, (_, index) => String(index + 1)));

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
      id: 'suite-1',
      title: 'Master Suite',
      category: 'rooms',
      description: 'Luxurious sleeping quarters with premium amenities',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'dining-1',
      title: 'Main Restaurant',
      category: 'dining',
      description: 'Elegant dining with international cuisine',
      imageUrl: 'https://images.unsplash.com/photo-1753727471014-efe38840c7c7?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'spa-1',
      title: 'Spa & Wellness',
      category: 'spa',
      description: 'Rejuvenating treatments and relaxation',
      imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=1200&auto=format&fit=crop',
    },
  ];
}

function loadRooms() {
  ensureDataFiles();
  const rooms = readJson(ROOMS_FILE, defaultRooms());
  return (Array.isArray(rooms) ? rooms : []).map((room) => normalizeRoom(room));
}

function saveRooms(rooms) {
  ensureDataFiles();
  const normalized = (Array.isArray(rooms) ? rooms : []).map((room) => normalizeRoom(room));
  writeJson(ROOMS_FILE, normalized);
  return normalized;
}

function loadGallery() {
  ensureDataFiles();
  return readJson(GALLERY_FILE, defaultGallery());
}

function saveGallery(items) {
  ensureDataFiles();
  writeJson(GALLERY_FILE, items);
}

function loadNotifications() {
  ensureDataFiles();
  return readJson(NOTIFICATIONS_FILE, []);
}

function saveNotifications(items) {
  ensureDataFiles();
  writeJson(NOTIFICATIONS_FILE, items);
}

function addNotification(type, details) {
  const notifications = loadNotifications();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    details,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...notifications].slice(0, 50);
  saveNotifications(next);
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
};
