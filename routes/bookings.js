const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const { loadRooms, saveRooms, reserveRoomNumber } = require("../lib/adminData");
const { getPaymentProviderConfig, buildCheckoutUrl } = require("../lib/payments");

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
router.get("/rooms", async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.json({ rooms: await loadRooms() });
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
      paymentMethod,
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

    const availableRooms = await loadRooms();
    const rooms = selectedRoomNames
      .map((name) => availableRooms.find((r) => r.name === name))
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

    let reservedRoomNumbers = [];
    const roomInventory = [...availableRooms];
    for (const roomName of selectedRoomNames) {
      const roomIndex = roomInventory.findIndex((room) => room.name === roomName);
      if (roomIndex === -1) continue;
      const room = roomInventory[roomIndex];
      const normalized = room.availableCount ?? room.roomNumbers?.length ?? 0;
      if (normalized <= 0) {
        return res.status(400).json({ error: `${roomName} is currently full.` });
      }
      const { roomNumber, room: nextRoom } = reserveRoomNumber(room);
      if (!roomNumber) {
        return res.status(400).json({ error: `${roomName} is currently full.` });
      }
      reservedRoomNumbers.push(`${roomName}: Room ${roomNumber}`);
      roomInventory[roomIndex] = nextRoom;
    }

    await saveRooms(roomInventory);

    const totalRoomPrice = rooms.reduce(
      (sum, room) => sum + room.pricePerNight,
      0,
    );

    const normalizedPaymentMethod = ["mobile_money", "paypal", "visa", "none"].includes(paymentMethod)
      ? paymentMethod
      : "none";

    const booking = await Booking.create({
      confirmationCode,
      fullName,
      email,
      phone,
      roomType: selectedRoomNames.join(", "),
      roomTypes: selectedRoomNames,
      assignedRoomNumbers: reservedRoomNumbers,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guestCount,
      specialRequests: specialRequests || "",
      nights,
      pricePerNight: totalRoomPrice,
      totalPrice: nights * totalRoomPrice,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === "none" ? "pending" : "pending",
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

// POST /api/bookings/:code/pay
router.post("/:code/pay", async (req, res) => {
  try {
    const { paymentMethod, paymentReference, phone, amount } = req.body || {};
    const booking = await Booking.findOne({
      confirmationCode: req.params.code.trim().toUpperCase(),
    });

    if (!booking) {
      return res.status(404).json({ error: "No reservation found with that confirmation code." });
    }

    const normalizedPaymentMethod = ["mobile_money", "paypal", "visa"].includes(paymentMethod)
      ? paymentMethod
      : "mobile_money";

    booking.paymentMethod = normalizedPaymentMethod;
    booking.paymentStatus = "paid";
    booking.paymentReference = (paymentReference || "").trim() || `${normalizedPaymentMethod.toUpperCase()}-${Date.now()}`;
    booking.paidAt = new Date();
    await booking.save();

    const providerConfig = getPaymentProviderConfig();
    const checkoutUrl = buildCheckoutUrl({
      config: providerConfig,
      booking,
      paymentMethod: normalizedPaymentMethod,
      phone,
      amount,
    });

    res.json({ booking, checkoutUrl, provider: providerConfig.provider, configured: providerConfig.configured });
  } catch (err) {
    console.error("Error completing payment:", err);
    res.status(500).json({ error: "Something went wrong while processing payment." });
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
