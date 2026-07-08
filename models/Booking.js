const mongoose = require("mongoose");

const ROOM_TYPES = [
  "Deluxe Room",
  "Executive Suite",
  "Presidential Suite",
  "Family Room",
];

const bookingSchema = new mongoose.Schema(
  {
    confirmationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    roomType: { type: String, required: true, trim: true },
    roomTypes: [{ type: String, trim: true, enum: ROOM_TYPES }],
    assignedRoomNumbers: [{ type: String, trim: true }],
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1, max: 10 },
    specialRequests: { type: String, trim: true, default: "" },
    nights: { type: Number, required: true, min: 1 },
    pricePerNight: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["mobile_money", "paypal", "visa", "none"],
      default: "none",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentReference: { type: String, trim: true, default: "" },
    paidAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true },
);

bookingSchema.statics.ROOM_TYPES = ROOM_TYPES;

module.exports = mongoose.model("Booking", bookingSchema);
