# JOLOF TRADING — Storefront + Dashboards 

Next.js 15 (App Router) · React 19 · Tailwind CSS 3 · Zustand · **PostgreSQL + Prisma** · Google Maps (Geocoding + Routes API)

The storefront, customer account, supplier portal and admin now run on a real database and API
(`app/api/*`, logic in `lib/server/*`). Only the cart, wishlist and chosen delivery city stay in the browser.  
No payments and no emails yet — orders are *requests* that JOLOF confirms, then an invoice is issued.

## Setup   
 
```bash
cp .env.example .env          # DATABASE_URL, AUTH_SECRET, GOOGLE_MAPS_API_KEY
npm install                   # also runs prisma generate
npm run db:setup              # create tables + load the catalogue & demo data
npm run dev                   # http://localhost:3000
```

`npm run db:seed` wipes and reloads the data at any time (also Admin → Settings → Reset demo data;
disabled in production unless `ALLOW_DEMO_RESET=true`). `npm run db:studio` opens a DB browser.

**Image uploads (Amazon S3):** every image field in the dashboards (products, departments, commodities,
product requests, supplier "new product") takes a link **or** an uploaded file. Uploads go to
`AWS_BUCKET` under `AWS_FOLDER` (default `jolof/`), e.g. `jolof/products/2026/11/<id>.webp`, through
`POST /api/upload` (admins; suppliers only for their product requests; JPG/PNG/WebP/GIF/AVIF, max 5 MB).
Set the `AWS_*` values in `.env` (see `.env.example`). The IAM user needs `s3:PutObject` on
`arn:aws:s3:::<bucket>/jolof/*`, and the bucket must allow public read of `jolof/*`
(bucket policy `s3:GetObject`, with "Block public access" off for policies) — or set `AWS_URL` to a CloudFront domain.

**Google Maps:** enable *Geocoding API* and *Routes API* on the key. Without a key everything still works —
addresses resolve to their city/state hub and distances are straight-line × 1.2 (marked approximate).

## Demo logins (from the seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@jolof.demo | admin123 |
| Retailer | retailer@jolof.demo | demo123 |
| Individual | customer@jolof.demo | demo123 |
| Supplier — Sahel Wholesale Foods (Houston, Atlanta) | vendor@jolof.demo | demo123 |
| Supplier — Midwest African Foods (Chicago, Minneapolis) | midwest@foods.demo | demo123 |
| Supplier — West Coast Beauty (LA, Seattle) | westcoast@beauty.demo | demo123 |

Also: lonestar@cosmetics.demo, sunshine@wholesale.demo, rocky@distribution.demo (demo123), JOLOF's own stock
`warehouse@jolof.demo`, pending supplier `cheikh@baobab.demo`, pending retailer `kwame@accrabeauty.demo`.

## How it works

**Departments & categories (Admin → Departments).** Departments are the top level of the store (Trading, Food, Cosmetics, …) and the admin can add, rename, re-order, hide or mark them “coming soon”. Each department is either a **Products** department (shop items) or a **Trading** department (commodities, quote only). Every category belongs to one department; products belong to a category. The storefront menus, home page department cards, search and shop tabs are built from this list. The Trading department has its own page at `/trading` (JOLOF TRADE CENTER).

**Catalogue = master products + supplier offers.** `Product` is the master record (admin owns name, category, price).
A supplier *offers* a master product (`SupplierOffer`: supply price, active/paused) and holds stock per warehouse
(`StockLevel`). New items a supplier carries go in as a `ProductRequest` → Admin → Product requests → approve
(admin sets store price) → master product created and the supplier's stock is listed automatically.
JOLOF itself is the house supplier (`isHouse`) with its own warehouses.

**Pricing toggle (Admin → Settings).** On: priced products → cart → order request; price-on-request products → inquiry.
Off: no prices anywhere, everything is an inquiry; customers see prices only in the quote and invoice.

**Order request → confirm → invoice.** Checkout creates a *pending* order (stock reserved, estimated delivery).
Card orders are **charged at checkout** (Square). Admin opens the order, sets final unit prices / delivery / discount
and confirms → invoice issued. For card orders the difference is settled automatically
(`lib/server/payments.js`): a **lower** total refunds the difference to the card; a **higher** total creates a
separate **payment request** (`PR-1001`) — the customer is emailed a private link (`/pay/<token>`, also shown on
their order) to pay only the extra, and the order can't be marked shipped until it's paid (or the admin cancels the
request). Cancelling refunds everything charged.

**Inquiry → quote → pay.** The customer only sends the request. Admin builds a quote (delivery can be calculated by
distance) and sends it → a private payment link is emailed to the customer (and shown under Quotes in their account
if they have one). Paying it by card accepts the quote and creates the confirmed order + paid invoice
(`lib/server/paylinks.js`). A revised quote replaces the old link. Without Square configured, the link lets them
accept for cash on delivery instead.

**Emails** (`lib/server/notify.js`, SMTP via nodemailer). Customer: order placed · order confirmed / re-priced
(with refund or balance link) · balance link · payment received · refund · on its way · delivered · cancelled ·
request received · quote with pay link · quote paid. Staff (`ADMIN_NOTIFY_EMAIL`): new order · new inquiry · quote
paid / declined · balance paid · order cancelled by the customer. Everything is logged in **Admin → Emails**
(preview, re-send, SMTP test). Emails go out after the response, so SMTP problems never block an order.

**Routing** (`lib/server/routing.js`): 1) lines JOLOF's warehouses can fill go to JOLOF regardless of distance
(optional max-miles limit in Settings); 2) the rest go to the nearest approved supplier warehouse with stock
(one warehouse when possible); 3) anything left is flagged *Needs a supplier*. Admin can reassign any shipment.
A supplier who declines returns the stock and the lines re-route.

**Delivery fee** (`lib/delivery.js`): per shipment = max(minimum, base + miles ÷ per-miles × charge),
e.g. $20 per 100 miles + $10 base; optional free-delivery threshold. Road miles from Google Routes API.

**Privacy.** Customers only ever see JOLOF TRADING (no supplier/warehouse). Suppliers see only their own lines at
their supply price — no customer name, contact, address or retail prices.

**Drivers** (Admin → Drivers): add the delivery team, assign a driver on each confirmed order; the customer sees the
driver once the order ships.

## Routes

| Area | Routes |
|---|---|
| Storefront | `/`, `/trading` |
| Auth | `/login`, `/register` |
| Checkout | `/checkout`, `/checkout/success`, `/pay/[token]` (private quote / balance payment link) |
| Customer | `/account`, `/account/orders`, `/account/invoices/[id]`, `/account/orders/[id]`, `/account/quotes`, `/account/quotes/[id]`, `/account/quotes/new`, `/account/saved`, `/account/profile` |
| Admin | `/admin`, `/admin/orders`, `/admin/invoices/[id]`, `/admin/drivers`, `/admin/product-requests`, `/admin/orders/[id]`, `/admin/inquiries`, `/admin/inquiries/[id]`, `/admin/products`, `/admin/departments`, `/admin/inventory`, `/admin/vendors`, `/admin/vendors/[id]`, `/admin/trading`, `/admin/customers`, `/admin/customers/[id]`, `/admin/emails`, `/admin/settings` |
| Supplier | `/vendor`, `/vendor/orders`, `/vendor/orders/[id]`, `/vendor/products`, `/vendor/warehouses` |

## Project layout

```
app/api/             REST endpoints (auth, orders, inquiries, vendor, admin, settings)
lib/server/          db, auth (JWT cookie), maps, routing, orders, inquiries, catalogue, state (role-scoped data)
lib/store.js         client store — every action calls the API and receives fresh state
lib/delivery.js      delivery fee rule (shared by server + settings preview)
prisma/schema.prisma database schema · prisma/seed-data.js starter data · prisma/migrations/
app/, components/    UI (storefront, account, supplier portal, admin)
```
