# Final Assessment — Backend Development

**Weight:** 30% of final grade
**Duration:** 2 weeks
**Mode:** Individual project
**Stack (mandatory):** Node.js, Express.js, MySQL (with parameterized queries only), Redis

The visual schema diagram is `schema-diagram.png`; `schema-diagram.svg` is its editable source.

---

## Scenario — "MediBook" Clinic Appointment System

A community clinic wants a backend service for booking doctor appointments. Doctors see patients in fixed 30-minute slots during working hours (09:00–17:00), each doctor can handle at most **12 appointments per day**, and the clinic administrator needs reports. You will design the database, build the API, and handle the operational concerns (background jobs, logging, testing).

**Entity limit:** Your database must contain **exactly 3 entities**:

| Entity | Purpose |
|---|---|
| `patients` | People who book appointments |
| `doctors` | Doctors with a specialty, consultation fee, and room |
| `appointments` | A patient's booking with a doctor at a specific date/time (links the other two) |

You may add columns as needed, but no additional tables (lookup/locale JSON files don't count).

---

## Part A — Database Design & Normalization

The clinic currently tracks everything in this single spreadsheet:

| appt_ref | patient_name | patient_email | patient_phone | doctor_name | specialty | consultation_fee | room | appt_datetime | amount_paid | booked_on |
|---|---|---|---|---|---|---|---|---|---|---|
| AP-001 | Ama Mensah | ama@mail.com | 0244-111-222 | Dr. Boateng | Dermatology | 150.00 | R-12 | 2026-08-10 09:00 | 150.00 | 2026-07-01 |
| AP-002 | Kojo Owusu | kojo@mail.com | 0555-333-444 | Dr. Boateng | Dermatology | 150.00 | R-12 | 2026-08-10 09:30 | 120.00 | 2026-07-02 |
| AP-003 | Ama Mensah | ama@mail.com | 0244-111-222 | Dr. Adjei | Paediatrics | 100.00 | R-03 | 2026-08-15 10:00 | 100.00 | 2026-07-03 |

Study the spreadsheet, then produce a **database schema diagram** of your design in fully normalized form (up to 3NF). The diagram must show **everything**:

- all 3 entities with every column and its MySQL data type,
- primary keys and foreign keys, clearly marked,
- the relationships between the entities and their cardinality (1:N, etc.),
- every constraint that enforces a business rule (`NOT NULL`, `UNIQUE`, `CHECK`) — in particular, it must be visible from the diagram that *a doctor cannot have two appointments at the same date/time*.

Use any tool you like (dbdiagram.io, draw.io) and include it in your repository as `schema-diagram` (image or PDF).

## Part B — Database Implementation & Project Setup

1. **Table creation.** Translate your Part A diagram into a MySQL DDL script, `database/schema.sql`, that creates the database and the 3 tables — data types, primary keys, foreign keys, and every constraint shown on the diagram. The script must run cleanly on a fresh MySQL server. Also provide `database/seed.sql` with realistic sample data: at least 3 patients, 3 doctors (including one with no appointments), and 8 appointments (including one doctor-day at or near the 12-slot daily cap).

2. **Project structure.** Set up the Express project in a **models / controllers / routes** structure:

```
├── database/          schema.sql and seed.sql (Part B.1)
└── src/
    ├── models/        all application SQL lives here — nowhere else
    ├── controllers/   business logic; calls model functions, never the DB directly
    └── routes/        maps URLs and HTTP methods to controllers
```

Every SQL statement in the application must use **parameterized queries** (`?` placeholders via `mysql2`). SQL found in a controller or route file loses marks. **Do not use any ORM for this assignment.**

## Part C — Controllers & Endpoints

Implement endpoints for the operations below. **Designing the API is part of the assessment**: you choose the URL paths, the HTTP methods, and how the endpoints are grouped into controllers and routes — your choices should follow REST conventions and will be marked. The business rules listed are **requirements** — *how* you satisfy them is your design decision, and you will be asked to defend it at the viva.

1. **Basic CRUD** — standard **C**reate, **R**ead (one and all), **U**pdate, and **D**elete operations for patients and for doctors, with sensible validation. (Appointments get their create/delete behaviour from the two operations below — no separate CRUD needed there.)

2. **Book an appointment**. Rules that must always hold:
   - Appointments can only be booked in the future, within working hours (09:00–17:00), on a 30-minute slot boundary.
   - A doctor never exceeds 12 appointments in a day.
   - Two patients can never hold the same doctor slot — even when both requests arrive at the same instant.

3. **Cancel an appointment**. Rules:
   - The refund is computed by the server from the notice given: more than 48 hours → 100%; 24–48 hours → 50%; less than 24 hours → 0%. The response states the refund amount.
   - The cancellation and its refund record succeed or fail together.
   - A cancelled slot becomes bookable by another patient, while the cancellation record is kept for refund history.
   - A cancellation notifies the waitlist (Part E).

4. **Doctor statistics** — for a given doctor: revenue collected, upcoming appointment count, appointments per day for the next 7 days, and utilization % against the 12-slot daily cap.

Operations 5 and 6 are where your **advanced SQL** is assessed: the results must be produced by the SQL in your models (joins, aggregates, etc) — not fetched raw and computed in JavaScript.

5. **Doctors report** — every doctor's total appointments and revenue collected, including doctors with zero appointments.
6. **Busy days report** — every (doctor, date) where more than 80% of the 12-slot daily capacity is booked.

### General requirements (all endpoints)

Input validation with meaningful `400` messages; correct status codes (`201`, `404`, `409`, `422`); a central error-handling middleware.

## Part D — Node.js `fs` Module

**Audit log:** every successful booking and cancellation must be appended as a JSON line to `logs/audit.log` using the `fs` module (async, non-blocking — no `*Sync` calls inside request handlers). The logger must create the `logs/` directory on first run if it doesn't exist, and a logging failure must **not** fail the user's request.

## Part E — Queues & Redis

1. **Waitlist queue:** when the requested slot (or the doctor's whole day) is fully booked, offer the patient a waitlist spot — push them onto a queue (Redis list, or Bull/BullMQ). When a cancellation frees a slot, a **worker process** (separate from the web server) pops the first waitlisted patient and books them in. Think through: what happens if the promoted booking itself fails? The patient must not simply vanish from both the queue and the appointments table.
2. **Notification jobs:** every confirmed appointment enqueues a "confirmation SMS/email" job; the worker processes it by writing the message to the audit log (no real sending needed).

## Part F — Unit Testing

Using Jest, write **at least 6 meaningful unit tests**:

- The refund calculator from Part C.3 — cover all three tiers **and both boundaries** (exactly 24 hours, exactly 48 hours). Boundary behaviour must match your documented policy.
- One validation function of your choice — e.g., the slot-alignment/working-hours check — including at least one edge case (17:00 exactly? 09:15? a malformed date?).

Tests must not require a live MySQL or Redis connection — that's the point of extracting pure functions. `npm test` must run them.

## Part G — i18n & l10n: Course Feedback Page

Create a **simple HTML page** (served by your Express app at `GET /feedback`) containing a short course-feedback form with **exactly 5 essay questions** (each answered in a `<textarea>`):

1. Which topic in this course did you find most challenging, and why?
2. Describe one concept you understood only after the practical assignments. What made it click?
3. How has your approach to designing databases or APIs changed since the start of the trimester?
4. What would you improve about how this course was taught or assessed?
5. How do you plan to apply what you learned in this course going forward?

**i18n/l10n requirement (keep it simple):** the page title, instructions, and all 5 questions must be loaded from locale files (e.g., `locales/en.json` and `locales/fr.json` — English plus one other language of your choice). Visiting `/feedback?lang=fr` shows the translated page; the default is English, and an unsupported `lang` value must fall back to English rather than crash. Display today's date on the page formatted for the active locale (e.g., using `Intl.DateTimeFormat`).

---

## MediBook implementation notes

### Requirements and setup

- Node.js 18+, MySQL 8.0.16+, and Redis 6.2+. MySQL 8.0.16 is required for enforced `CHECK` constraints.
- The assessment does not specify a clinic timezone, so this implementation assumes UTC for appointment timestamps and working hours. API timestamps use `YYYY-MM-DDTHH:mm:ssZ`.
- Copy `.env.example` to `.env` and fill in the MySQL and Redis connection values. For local Redis, keep `REDIS_URL=redis://localhost:6379`. For a hosted Redis-compatible service such as Upstash, use its TCP connection URL; it should start with `rediss://` when TLS is enabled. Keep `.env` private; it is ignored by Git.
- Create and seed the database from the repository root:

  ```sh
  mysql -u root -p < database/schema.sql
  mysql -u root -p < database/seed.sql
  ```

  MySQL Workbench can run both scripts as well. The sample data has 11 appointments, 10 for one doctor on one day, and a doctor with no appointments.
- Install and run the application and worker in separate terminals, then run the pure unit tests:

  ```sh
  npm install
  npm start
  npm run worker
  npm test
  ```

The API listens on `http://localhost:3000` by default. `GET /health` checks that it responds. `.env.example` lists `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `REDIS_URL`.

### Postman demo

Import `postman/MediBook Backend Demo.postman_collection.json` into Postman. Start with the read-only checks, then run the numbered booking, waitlist, and refund requests in order. The second group creates demo appointment and waitlist records; Redis and the separate worker must be running to show promotion.

### API routes

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/patients` | List or create patients |
| GET, PUT, PATCH, DELETE | `/api/patients/:id` | Read, update, or delete a patient |
| GET, POST | `/api/doctors` | List or create doctors |
| GET, PUT, PATCH, DELETE | `/api/doctors/:id` | Read, update, or delete a doctor |
| POST | `/api/appointments` | Book a slot or join the waitlist |
| GET | `/api/appointments/:id` | Read an appointment |
| POST | `/api/appointments/:id/cancel` | Cancel and calculate the refund |
| GET | `/api/doctors/:id/stats` | Doctor revenue, upcoming count, daily counts, utilization |
| GET | `/api/doctors/reports` | All doctors, including those with zero appointments |
| GET | `/api/doctors/reports/busy-days` | Doctor-days above 80% capacity |
| GET | `/feedback?lang=en` or `?lang=fr` | Localized course feedback page |

Example booking body:

```json
{
  "patientId": 1,
  "doctorId": 1,
  "appointmentDatetime": "2026-12-01T09:00:00Z"
}
```

### Design decisions for the viva

- There are exactly three entities. Patient and doctor details live once in their own tables; appointments hold both foreign keys and booking-specific facts.
- `amount_paid` is a historical transaction value. It stays fixed if a doctor's current fee changes. SQL reports revenue as `amount_paid - refund_amount`.
- A generated `active_doctor_id` is the doctor's ID while an appointment is confirmed and `NULL` after cancellation. The unique key on `(active_doctor_id, appointment_datetime)` prevents concurrent duplicate bookings while allowing a cancelled slot to be reused. The cancelled row retains refund history.
- Booking locks the doctor row in a transaction before counting that day's confirmed appointments. This serializes bookings for one doctor and prevents appointment 13. The database unique key separately prevents two simultaneous requests from taking one slot.
- Stored slot boundaries and clinic hours are checked in MySQL. The application checks that the requested timestamp is in the future because a `CHECK` constraint cannot safely compare with a changing current time.
- Refund policy: more than 48 hours receives 100%; from exactly 24 hours through exactly 48 hours receives 50%; less than 24 hours receives 0%. The server calculates the amount; status, cancellation time, refund, and promotion job are handled in the cancellation transaction.
- Waitlists are FIFO Redis lists (`LPUSH` to add, `RPOP` to take the oldest). The worker moves a candidate to a processing list before booking. Failed promotions return to the queue; processing entries are recovered after worker restarts.
- Confirmation and promotion jobs are queued before their MySQL transaction commits. The worker checks that the appointment state is committed and retries briefly if it is not visible yet. Redis is required for booking and cancellation operations that enqueue jobs.
- Audit events are appended asynchronously as JSON lines. Log-write failures are reported to the server log but do not fail a successful request.
- Doctor statistics, the all-doctors report, and busy days are computed by SQL aggregates in the models. The all-doctors report uses a `LEFT JOIN` so doctors with no appointments are included.
- Jest tests cover the three refund tiers, the exact 24-hour and 48-hour boundaries, valid 09:00, 09:15, 17:00, malformed date, and past-time cases. They need neither MySQL nor Redis.

## Submission Requirements

- Git repository (with meaningful commit history — a single "final commit" will be questioned) containing:
  - `schema-diagram` (image or PDF), `schema.sql`, and `seed.sql` (as specified in Part B)
  - Application source, worker process, tests, locale files
  - `README.md` with: setup steps, `.env.example`, and the short written justifications requested in Parts C, D, and E
- The app must start with `npm install && npm start` (plus documented MySQL/Redis setup) and tests with `npm test`.
- A short **viva/demo (10 minutes)** walkthrough.
  My video is down here!
    https://youtu.be/Lw6vEguQTto

**Automatic penalties:** SQL injection vector anywhere in the app (−15), secrets committed to the repo (−5), app does not start per README instructions (−10), work the student cannot explain in the video (or at a follow-up viva if called) | Academic integrity referral; affected criteria re-scored at Developing or below |
