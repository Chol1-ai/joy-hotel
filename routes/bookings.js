const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// Static room catalogue (kept simple — not database backed, since it rarely changes)
const ROOMS = [
  {
    id: "deluxe",
    name: "Deluxe Room",
    pricePerNight: 180000,
    maxGuests: 2,
    description:
      "Elegant comfort with a king bed, city views and a marble bathroom.",
    image:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "executive",
    name: "Executive Suite",
    pricePerNight: 260000,
    maxGuests: 3,
    description:
      "A spacious suite with a separate lounge, workspace and premium amenities.",
    image:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "presidential",
    name: "Presidential Suite",
    pricePerNight: 420000,
    maxGuests: 4,
    description:
      "The pinnacle of luxury — panoramic views, a private balcony and butler service.",
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "family",
    name: "Family Room",
    pricePerNight: 220000,
    maxGuests: 5,
    description:
      "Generous space for the whole family, with two queen beds and a sitting area.",
    image:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop",
  },
];

function generateConfirmationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "JOY-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function nightsBetween(checkIn, checkOut) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.round((checkOut - checkIn) / oneDay);
}

// GET /api/bookings/rooms — room catalogue for the booking page
router.get("/rooms", (req, res) => {
  res.json({ rooms: ROOMS });
});

// POST /api/bookings — create a new reservation
router.post("/", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      roomType,
      checkIn,
      checkOut,
      guests,
      specialRequests,
    } = req.body;

    const selectedRoomNames = Array.isArray(roomType)
      ? roomType
      : String(roomType || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    if (
      !fullName ||
      !email ||
      !phone ||
      !selectedRoomNames.length ||
      !checkIn ||
      !checkOut ||
      !guests
    ) {
      return res
        .status(400)
        .json({ error: "Please fill in all required fields." });
    }

    const rooms = selectedRoomNames
      .map((name) => ROOMS.find((r) => r.name === name))
      .filter(Boolean);

    if (rooms.length !== selectedRoomNames.length) {
      return res.status(400).json({ error: "Please select valid room types." });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate) || isNaN(checkOutDate)) {
      return res.status(400).json({ error: "Please provide valid dates." });
    }
    if (checkInDate < today) {
      return res
        .status(400)
        .json({ error: "Check-in date cannot be in the past." });
    }
    if (checkOutDate <= checkInDate) {
      return res
        .status(400)
        .json({ error: "Check-out date must be after check-in date." });
    }

    const nights = nightsBetween(checkInDate, checkOutDate);
    const guestCount = Number(guests);
    const maxAllowedGuests = Math.max(...rooms.map((room) => room.maxGuests));
    if (guestCount > maxAllowedGuests) {
      return res.status(400).json({
        error: `The selected rooms accommodate up to ${maxAllowedGuests} guests.`,
      });
    }

    let confirmationCode = generateConfirmationCode();
    // Guarantee uniqueness (extremely unlikely to collide, but check anyway)
    while (await Booking.findOne({ confirmationCode })) {
      confirmationCode = generateConfirmationCode();
    }

    const totalRoomPrice = rooms.reduce(
      (sum, room) => sum + room.pricePerNight,
      0,
    );

    const booking = await Booking.create({
      confirmationCode,
      fullName,
      email,
      phone,
      roomType: selectedRoomNames.join(", "),
      roomTypes: selectedRoomNames,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guestCount,
      specialRequests: specialRequests || "",
      nights,
      pricePerNight: totalRoomPrice,
      totalPrice: nights * totalRoomPrice,
    });

    res.status(201).json({ booking });
  } catch (err) {
    console.error("Error creating booking:", err);
    res
      .status(500)
      .json({ error: "Something went wrong while creating your reservation." });
  }
});

// GET /api/bookings/lookup?code=JOY-XXXXXX&email=someone@example.com
router.get("/lookup", async (req, res) => {
  try {
    const { code, email } = req.query;
    if (!code || !email) {
      return res
        .status(400)
        .json({ error: "Confirmation code and email are required." });
    }
    const booking = await Booking.findOne({
      confirmationCode: code.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
    });
    if (!booking) {
      return res
        .status(404)
        .json({ error: "No reservation found with those details." });
    }
    res.json({ booking });
  } catch (err) {
    console.error("Error looking up booking:", err);
    res.status(500).json({
      error: "Something went wrong while looking up your reservation.",
    });
  }
});

// PATCH /api/bookings/:code/cancel
router.patch("/:code/cancel", async (req, res) => {
  try {
    const { email } = req.body;
    const booking = await Booking.findOne({
      confirmationCode: req.params.code.trim().toUpperCase(),
      email: (email || "").trim().toLowerCase(),
    });
    if (!booking) {
      return res
        .status(404)
        .json({ error: "No reservation found with those details." });
    }
    booking.status = "cancelled";
    await booking.save();
    res.json({ booking });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({
      error: "Something went wrong while cancelling your reservation.",
    });
  }
});

module.exports = router;
