# MediBook Postman collection

Import `MediBook Backend Demo.postman_collection.json` into Postman (`Import` → `Files`). The collection is already set to `http://localhost:3000`, so no URL setup is needed if the API is running on its default port.

Start with **1. Read-only demo checks**. The requests display response checks in Postman's **Test Results** tab.

The **2. Booking, waitlist, and refund demo** folder changes the database and Redis queue. Run its requests in order. It requires the API, Redis, and the worker to be running. A future appointment time and appointment ID are filled in automatically.
