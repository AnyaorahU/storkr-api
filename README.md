# Stockr API

A REST API for an e-commerce store selling physical goods. It covers the full flow from sign-up to browsing products, managing a cart, checking out and paying with Stripe, with role-based access for customers and admins.

## Tech stack

- **Runtime:** Node.js, Express 5
- **Database:** PostgreSQL, Prisma 7
- **Validation:** Zod
- **Auth:** JWT in httpOnly cookies, bcrypt
- **Payments:** Stripe Checkout + webhooks
- **Security:** helmet, CORS, express-rate-limit

## Key engineering decisions

**Concurrency-safe checkout.** Checkout runs in a single interactive transaction. Stock is decremented with a conditional update (`stock >= quantity`) in one SQL statement, so two customers can never buy the same last unit. If any step fails, everything rolls back, including the cart, so the customer keeps their items.

**Compare-and-set for state changes.** The cart claim at checkout, order status transitions and payment confirmation all use conditional updates ("change it only if it's still what I read"). This prevents double checkout, double cancellation (and double stock restoration), and double payment processing.

**Stripe webhook as the source of truth.** An order is marked paid only when a signature-verified `checkout.session.completed` event arrives, never on the success redirect. Signatures are verified against the raw request body. Handlers are idempotent, so Stripe's retries and duplicate events are safe. Checkout sessions expire after 30 minutes, and an expired session cancels the unpaid order and releases its stock.

**Money as Decimal, never floats.** Prices and totals are `Decimal(10,2)`, with all arithmetic done in Decimal. Each order item stores a snapshot of the price at purchase time, so later price changes never alter past orders.

**Soft delete for products.** Deleting a product sets `isActive: false`. It disappears from listings and can't be added to carts or checked out, but order history keeps its references.

**Rate limiting on auth.** Login allows 10 failed attempts per IP per 15 minutes (successful logins don't count). Registration allows 5 requests per IP per hour. Both return `429` with the standard JSON error shape.

## Architecture

```
Routes → Middleware → Controller → Service → Repository → PostgreSQL
```

| Layer      | Responsibility                                                |
| ---------- | ------------------------------------------------------------- |
| Routes     | Map endpoints to middleware and controllers                   |
| Middleware | Authentication, role checks, Zod validation, rate limiting    |
| Controller | Read the request, call the service, send the response         |
| Service    | Business rules: stock, order lifecycle, payments              |
| Repository | All Prisma queries; accepts a transaction client where needed |

Each layer has one job, so business logic never touches HTTP and queries never contain business rules.

## Getting started

**Prerequisites:** Node.js 24+, PostgreSQL 16+, a Stripe account (test mode) and the [Stripe CLI](https://docs.stripe.com/stripe-cli).

```bash
git clone <your-repository-url>
cd stockr-api
npm install
cp .env.example .env          # then fill in the values below
npx prisma migrate dev
npx prisma generate
npx prisma db seed            # creates an admin, 3 categories and sample products
npm run dev                   # http://localhost:4500
```

### Environment variables

| Variable                | Example                                               | Purpose                                 |
| ----------------------- | ----------------------------------------------------- | --------------------------------------- |
| `NODE_ENV`              | `development`                                         | The seed refuses to run in `production` |
| `PORT`                  | `4500`                                                | API port                                |
| `CLIENT_URL`            | `http://localhost:3000`                               | CORS origin and Stripe redirect base    |
| `DATABASE_URL`          | `postgresql://user:password@localhost:5432/stockr_db` | PostgreSQL connection                   |
| `JWT_SECRET`            | long random string                                    | Signs auth tokens                       |
| `JWT_EXPIRES`           | `1d`                                                  | Token lifetime                          |
| `STRIPE_SECRET_KEY`     | `sk_test_...`                                         | Stripe API key (test mode)              |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`                                           | Printed by `stripe listen`              |
| `SEED_ADMIN_EMAIL`      | `admin@stockr.local`                                  | Seeded admin account                    |
| `SEED_ADMIN_PASSWORD`   | strong password                                       | Seeded admin password                   |

After seeding, log in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to use admin routes.

## API overview

Base URL: `http://localhost:4500/api/v1`

| Module     | Method | Endpoint                   | Access                                      |
| ---------- | ------ | -------------------------- | ------------------------------------------- |
| Auth       | POST   | `/auth/register`           | Public                                      |
| Auth       | POST   | `/auth/login`              | Public                                      |
| Auth       | POST   | `/auth/logout`             | Authenticated                               |
| Auth       | GET    | `/auth/me`                 | Authenticated                               |
| Categories | GET    | `/categories`              | Public                                      |
| Categories | GET    | `/categories/:id`          | Public                                      |
| Categories | POST   | `/categories`              | Admin                                       |
| Categories | PATCH  | `/categories/:id`          | Admin                                       |
| Categories | DELETE | `/categories/:id`          | Admin (409 if it has products)              |
| Products   | GET    | `/products`                | Public                                      |
| Products   | GET    | `/products/:slug`          | Public                                      |
| Products   | POST   | `/products`                | Admin                                       |
| Products   | PATCH  | `/products/:id`            | Admin                                       |
| Products   | PATCH  | `/products/:id/stock`      | Admin (restock)                             |
| Products   | DELETE | `/products/:id`            | Admin (soft delete)                         |
| Cart       | GET    | `/carts`                   | Authenticated                               |
| Cart       | POST   | `/carts/items`             | Authenticated                               |
| Cart       | PATCH  | `/carts/items/:productId`  | Authenticated                               |
| Cart       | DELETE | `/carts/items/:productId`  | Authenticated                               |
| Cart       | DELETE | `/carts`                   | Authenticated                               |
| Orders     | POST   | `/orders`                  | Authenticated (checkout)                    |
| Orders     | GET    | `/orders`                  | Authenticated                               |
| Orders     | GET    | `/orders/:id`              | Authenticated (own orders only)             |
| Orders     | PATCH  | `/orders/:id/cancel`       | Authenticated                               |
| Orders     | POST   | `/orders/:id/pay`          | Authenticated (returns Stripe Checkout URL) |
| Admin      | GET    | `/admin/orders`            | Admin                                       |
| Admin      | PATCH  | `/admin/orders/:id/status` | Admin                                       |
| Webhooks   | POST   | `/webhooks/stripe`         | Stripe signature                            |

**Product filters:** `GET /products?category=electronics&minPrice=10&maxPrice=100&search=head&page=1&limit=10`

**Admin order filter:** `GET /admin/orders?status=pending`

All responses use `{ "success": true, "data": ... }` or `{ "success": false, "message": "..." }`. List endpoints add `meta` with `page`, `limit`, `total` and `totalPages`.

## Order lifecycle

```
pending → processing → shipped → delivered
   ↓           ↓
cancelled   cancelled
```

| From         | Allowed next              |
| ------------ | ------------------------- |
| `pending`    | `processing`, `cancelled` |
| `processing` | `shipped`, `cancelled`    |
| `shipped`    | `delivered`               |
| `delivered`  | none                      |
| `cancelled`  | none                      |

- **Customers** can cancel only their own orders that are `pending` and unpaid.
- **Admins** can cancel orders that are `pending` or `processing`.
- **Cancelling restores stock** for every item in the order.
- **Payment status** (`unpaid` / `paid`) is tracked separately and set only by the Stripe webhook.

## Testing payments

1. Start the API: `npm run dev`
2. In a second terminal, forward Stripe events:
   ```bash
   stripe listen --events checkout.session.completed,checkout.session.expired \
     --forward-to localhost:4500/api/v1/webhooks/stripe
   ```
   Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart the API.
3. Log in, add products to your cart, and place an order with `POST /orders`.
4. Call `POST /orders/:id/pay` and open the returned URL.
5. Pay with test card `4242 4242 4242 4242`, any future expiry date and any CVC.
6. `GET /orders/:id` should now show `paymentStatus: "paid"` and a `paidAt` timestamp.

The success redirect is not proof of payment. Only the verified webhook updates payment status.

## Tests

33 integration tests (Vitest + Supertest) run against a separate PostgreSQL database.

```bash
createdb stockr_test
cp .env .env.test   # set DATABASE_URL to stockr_test, NODE_ENV=test, STRIPE_WEBHOOK_SECRET=whsec_test_secret
npx dotenv -e .env.test -- npx prisma migrate deploy
npm test
```

Covered: auth and rate limiting, checkout (including concurrent purchases of the last unit and double-submit), order lifecycle and cancellation races, and Stripe webhooks (signature verification, idempotency, stale sessions). Webhook tests use locally signed events, so no Stripe account is needed to run them.
