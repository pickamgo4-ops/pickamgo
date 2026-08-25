# PickAmGo - API

Production-ready backend for the PickAmGo marketplace.

## Tech Stack

- **Runtime**: Node.js + Express + TypeScript
- **Database**: PostgreSQL via Prisma ORM (Railway-compatible)
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

## Setup

```bash
cd api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Create/apply a development migration
npm run db:migrate

# Seed database with demo data
npm run db:seed

# Start development server
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/categories` | List categories |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get product |
| POST | `/api/products` | Create product (seller) |
| PATCH | `/api/products/:id` | Update product (owner) |
| DELETE | `/api/products/:id` | Delete product (owner) |
| GET | `/api/services` | List services |
| GET | `/api/services/:id` | Get service |
| POST | `/api/services` | Create service (seller) |
| PATCH | `/api/services/:id` | Update service (owner) |
| DELETE | `/api/services/:id` | Delete service (owner) |
| GET | `/api/shops` | List shops |
| GET | `/api/shops/:slug` | Get shop |
| POST | `/api/shops` | Create shop (seller) |
| PATCH | `/api/shops/:id` | Update shop (owner) |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/bookings` | List bookings |
| POST | `/api/bookings` | Create booking |
| PATCH | `/api/bookings/:id/status` | Update booking |
| GET | `/api/favorites` | Get favorites |
| POST | `/api/favorites` | Add favorite |
| DELETE | `/api/favorites/:type/:id` | Remove favorite |
| GET | `/api/reviews/product/:id` | Get product reviews |
| POST | `/api/reviews` | Create review |
| GET | `/api/search` | Search products, services, shops |
| GET | `/api/riders/deliveries` | Get available deliveries |
| POST | `/api/riders/deliveries/:id/accept` | Accept delivery |
| PATCH | `/api/riders/deliveries/:id/status` | Update delivery status |
| GET | `/api/notifications` | Get notifications |
| POST | `/api/upload/image` | Upload image |

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## Demo Credentials

- **Seller**: demo@pickamgo.gh / password123
- **Rider**: rider@pickamgo.gh / password123

## Database

## PostgreSQL setup

Set `DATABASE_URL` in `.env` to a PostgreSQL connection string. Never commit this file.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

For local development, create an empty PostgreSQL database and run:

```bash
npm run db:migrate
npm run db:seed
```

For Railway deployment, add the Railway PostgreSQL `DATABASE_URL` to the API service variables, then run:

```bash
npm run db:deploy
npm start
```

The initial migration is `prisma/migrations/0001_init_postgresql`. Existing `dev.db` data is not deleted or automatically copied. Export and transform it into PostgreSQL before applying data migration if it contains required development data.
