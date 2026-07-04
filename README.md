# Joy Hotel — Website + Booking/Contact Backend

A full hotel website (Home, Gallery, Location, About, Contact, Book Your Stay) backed by a
Node.js/Express + MongoDB API for reservations and contact messages.

## What's included

- **Frontend** (`public/`): the original 5 pages, plus two new pages:
  - `contact.html` — redesigned to match the site's look, with a working contact form,
    an FAQ accordion, and a map.
  - `booking.html` — room selection, a live price summary, an instant booking
    confirmation with a reference code, and a "Manage My Booking" tab to look up or
    cancel a reservation.
  - Navigation, footer links and CTA buttons across every page were fixed so they all
    point to real, working destinations (several were previously dead links or `#`).
- **Backend**:
  - `server.js` — Express app that serves the site and the API, with basic rate limiting.
  - `models/Booking.js`, `models/Contact.js` — Mongoose schemas.
  - `routes/bookings.js` — create booking, room catalogue, look up by code + email, cancel.
  - `routes/contact.js` — submit a contact message.

## API endpoints

| Method | Endpoint                          | Purpose                                  |
|--------|------------------------------------|-------------------------------------------|
| GET    | `/api/bookings/rooms`              | Room catalogue (name, price, capacity)    |
| POST   | `/api/bookings`                    | Create a reservation                      |
| GET    | `/api/bookings/lookup?code=&email=`| Find a reservation                        |
| PATCH  | `/api/bookings/:code/cancel`       | Cancel a reservation                      |
| POST   | `/api/contact`                     | Submit the contact form                   |
| GET    | `/api/health`                      | Health check (server + DB connection)     |

## Running it locally

1. **Install Node.js 18+** and **MongoDB** (local install, or a free MongoDB Atlas cluster).

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the database connection**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `MONGODB_URI` to your local MongoDB (`mongodb://127.0.0.1:27017/joyhotel`)
   or your Atlas connection string.

4. **Start MongoDB** (skip if you're using Atlas):
   ```bash
   mongod
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   or, for auto-reload while developing:
   ```bash
   npm run dev
   ```

6. Open **http://localhost:3000** — the whole site is served from there, and the
   booking/contact forms will talk to the API automatically.

## Notes

- Room types and prices live in `routes/bookings.js` as a small static list (Deluxe,
  Executive Suite, Presidential Suite, Family Room). Edit the `ROOMS` array there to
  change names, prices or images — no database migration needed since inventory rarely
  changes.
- Every reservation gets a unique confirmation code like `JOY-4F7K2Q`, which the guest
  uses (together with their email) to look up or cancel a booking later.
- CORS is enabled and the API is rate-limited (60 requests / 15 minutes per IP) to
  reduce form-spam.
