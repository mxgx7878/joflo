# JOLOF TRADING — Storefront + Dashboards (frontend demo)

Next.js 15 (App Router) · React 19 · Tailwind CSS 3 · Zustand · lucide-react · Recharts

This is a **frontend-only demo**. All data lives in the browser (localStorage key `jolof_demo_v1`),
so the full flow works without a backend and survives reloads. Open the store in one tab and the
admin in another — changes sync between tabs.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@jolof.demo | admin123 |
| Retailer (approved) | retailer@jolof.demo | demo123 |
| Individual customer | customer@jolof.demo | demo123 |
| Supplier (Sahel Wholesale Foods — Sydney & Brisbane warehouses) | vendor@jolof.demo | demo123 |
| Supplier (West Coast Beauty — Perth & Adelaide) | westcoast@beauty.demo | demo123 |

`kwame@accrabeauty.demo / demo123` is a retailer **awaiting approval** (approve it from Admin → Customers).
`cheikh@baobab.demo / demo123` is a supplier **awaiting approval** (approve it from Admin → Suppliers).

## The core flow

1. **Priced products** → Add to cart → `/checkout` → order placed → appears in *My Orders* and *Admin → Orders*. Stock is deducted.
2. **Price-on-request products / bulk / commodities** → *Enquire* → inquiry lands in *Admin → Inquiries*.
3. Admin builds and **sends a quote** → customer sees it in *Quotes & Inquiries* → **Accept** → an order is created automatically.
4. Admin moves the order through **Pending → Confirmed → Packed → Shipped → Delivered**, sets payment and tracking. Customer sees progress live.
5. New **retailer** sign-ups are *pending* until an admin approves them (they can browse and send inquiries meanwhile, but can't check out).

## Suppliers, warehouses & location routing

- **Delivery location first.** Shoppers pick their city on the first visit (also in the top bar and at checkout).
- **Suppliers / wholesalers** (`role: vendor`) register from `/register` → *Supplier / Wholesaler*, are approved by admin,
  then add **warehouses** and list **catalogue products** with a supply price and stock **per warehouse**.
- **Routing rule** (`lib/fulfilment.js`): an order goes to the *nearest* active warehouse that can fill the **whole order**;
  if none can, each line goes to the nearest warehouse holding it (split shipment). Lines nobody can fill are flagged
  *Needs a supplier* for admin. JOLOF's own stock is the house supplier `v-jolof`.
- **Supplier portal** (`/vendor`): new orders → Accept → Packed → Shipped (tracking) → Delivered. The customer order
  status follows the slowest supplier part. *Can't fulfil* returns the stock and re-routes to the next nearest supplier.
- **Admin**: Suppliers list/detail with approval, Inventory shows which supplier/warehouse holds each product,
  order detail has *Routing & suppliers* with manual reassignment and a routing log.
- **Guest checkout**: no account needed. Signing up later with the same email attaches those orders to the account.

## Routes

| Area | Routes |
|---|---|
| Storefront | `/` |
| Auth | `/login`, `/register` |
| Checkout | `/checkout`, `/checkout/success` |
| Customer | `/account`, `/account/orders`, `/account/orders/[id]`, `/account/quotes`, `/account/quotes/[id]`, `/account/quotes/new`, `/account/saved`, `/account/profile` |
| Admin | `/admin`, `/admin/orders`, `/admin/orders/[id]`, `/admin/inquiries`, `/admin/inquiries/[id]`, `/admin/products`, `/admin/categories`, `/admin/inventory`, `/admin/vendors`, `/admin/vendors/[id]`, `/admin/trading`, `/admin/customers`, `/admin/customers/[id]`, `/admin/settings` |
| Supplier | `/vendor`, `/vendor/orders`, `/vendor/orders/[id]`, `/vendor/products`, `/vendor/warehouses` |

## Project layout

```
app/                 routes (storefront, auth, checkout, account, admin)
components/store/    storefront (home page sections, header, drawers, enquiry modal)
components/account/  customer dashboard pieces
components/admin/    admin dashboard pieces
components/vendor/   supplier portal pieces
components/LocationPicker.jsx  delivery-location modal, header button and first-visit gate
components/ui.jsx    shared dashboard primitives (Modal, Drawer, Pill, StatCard…)
lib/catalogue.js     product catalogue + commodities (from the approved home page)
lib/seed.js          demo users, orders, inquiries
lib/store.js         the single app store — every action the backend will later replace
lib/locations.js     delivery cities + distance
lib/fulfilment.js    order routing to supplier warehouses (pure functions — move server-side as is)
lib/format.js        money/date formatting + status labels
public/products/     client-supplied product photos
```

## Connecting a backend later

Every read/write goes through `lib/store.js`. Each action there (`login`, `placeOrder`,
`submitInquiry`, `sendQuote`, `acceptQuote`, `updateOrderStatus`, `saveProduct`, `adjustWarehouseStock`,
`setUserStatus`, `saveWarehouse`, `saveOffer`, `setFulfilmentStatus`, `rejectFulfilment`, `reassignGroup`, …) maps 1:1 to an API endpoint, so the UI does not need to change — swap the
action bodies for `fetch` calls (e.g. to a Laravel API) and load initial data from the server.

Use **Settings → Reset demo data** in the admin to restore the original demo state.
