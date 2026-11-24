# BillCraft — Invoicing, made simple.

**BillCraft** is a modern, responsive fintech SaaS web application engineered for freelancers, creatives, agencies, and small business owners to create, customize, download, and manage professional invoices in minutes.

---

## 💎 Brand Identity & Strict Aeonik Typography

- **Product Name:** BillCraft
- **Tagline:** Invoicing, made simple.
- **Typography:** Strictly powered by **Aeonik** (licensed from CoType Foundry) across every headline, button, label, dashboard statistic, invoice preview, and exported PDF document. Configured via base64 data URIs and local `.ttf` font files inside `fonts.css`.
- **Aesthetic:** Minimal, fintech-grade design inspired by Stripe, Mercury, and Linear. Clean slate/white backgrounds, sharp navy text, and sophisticated electric blue accents (`#2563eb`).

---

## 🚀 Key Functional Features

1. **Conversion-Focused Landing Page:**
   - Hero section with live interactive invoice card
   - 4-step "How It Works" workflow
   - 6 key feature highlights
   - Template showcase gallery
   - Transparent Free vs Pro pricing tiers
   - Interactive FAQ accordion & footer

2. **Full Invoice Creation & Precision Engine:**
   - Real-time side-by-side A4 document preview
   - Line items calculation with quantity, rate, and line totals
   - Support for 14+ world currencies: USD ($), EUR (€), GBP (£), NGN (₦), CAD (CA$), AUD (AU$), GHS (GH₵), JPY (¥), INR (₹), ZAR (R), and more
   - Precision decimal calculations avoiding floating-point rounding bugs
   - Discounts (flat or percentage), Tax percentage (e.g. VAT / Sales Tax), and shipping fees
   - Payment wire instructions and bank account details
   - Dynamic business logo upload (instant preview & base64 persistence)

3. **Four Professional Invoice Templates:**
   - **Minimal:** Clean, simple, modern with generous whitespace
   - **Corporate:** Formal business layout with structured headers and bank callout boxes
   - **Creative:** Bold accent styling with modern tags for studios and creative directors
   - **Elegant:** Premium editorial layout with refined double lines and luxury typography
   - Switch between any template on the fly without losing entered data

4. **Selectable-Text PDF & Print Engine:**
   - Direct high-resolution A4 PDF download using vectorized PDF document generation
   - Pure vector Print-to-PDF (`window.print`) with `@media print` A4 portrait stylesheets
   - Authentic selectable text with embedded Aeonik fonts (no low-quality raster screenshots)

5. **Client Management:**
   - Client directory with contact details and billing addresses
   - Quick one-click client selector in the invoice editor to auto-populate invoices
   - Instant "Invoice Client" action from the client roster

6. **Business Profile:**
   - Save your business identity, logo, address, contact, and bank details once
   - Automatically populates into every new invoice

7. **Invoice History & Fintech KPI Dashboard:**
   - Total Invoices Created
   - Total Invoice Value
   - Paid, Pending, and Overdue sums and counts (calculated from real data, never fake statistics)
   - Status updating: Draft, Sent, Pending, Paid, Overdue
   - Quick search by invoice number, company, or client name

8. **Monetization & Upgrade Architecture:**
   - **Free Plan:** 5 invoices per month, 2 core templates (Minimal & Corporate)
   - **Pro Plan:** Unlimited invoices, all 4 templates, priority features
   - Active upgrade prompts and plan switching in Settings for testing

9. **Backend & Supabase Synchronization:**
   - Supabase Auth (Sign Up, Sign In, Password Reset, Sign Out)
   - PostgreSQL schema with Row Level Security (RLS) located in `supabase/schema.sql`
   - Zero-dependency local persistence engine that operates out of the box with zero broken buttons!

---

## 📁 Project Structure

```
billcraft/
├── index.html                 # Main SaaS single-page application entry point
├── fonts.css                  # Genuine Aeonik @font-face declarations (base64 + TTF)
├── css/
│   └── styles.css             # Fintech design system, A4 rules, print styles
├── fonts/                     # Authentic Aeonik font files (Regular, Medium, Bold, Light)
│   ├── Aeonik-Regular.ttf
│   ├── Aeonik-Medium.ttf
│   ├── Aeonik-Bold.ttf
│   └── Aeonik-Light.ttf
├── js/
│   ├── app.js                 # Central controller, routing & event handlers
│   ├── storage.js             # Data persistence engine, models, seed data
│   ├── supabase-client.js     # Supabase Auth & Cloud database connector
│   ├── calculator.js          # Financial calculation engine (zero rounding error)
│   ├── templates.js           # 4 distinct invoice template renderers
│   ├── pdf-service.js         # Selectable-text PDF export & print engine
│   ├── ui.js                  # Landing page, dashboard, sidebar, toasts
│   ├── editor-ui.js           # Split-screen invoice editor & live preview
│   ├── clients-ui.js          # Client management directory
│   ├── business-ui.js         # Business profile settings
│   ├── templates-ui.js        # Template picker gallery
│   ├── settings-ui.js         # Settings & Supabase configuration
│   └── modals.js              # Auth, Upgrade, Client, & Preview modals
└── supabase/
    └── schema.sql             # Supabase PostgreSQL schema with RLS policies
```

---

## 🛠️ How to Run

1. Open `index.html` directly in any modern web browser (Edge, Chrome, Firefox, Safari).
2. Alternatively, serve with any local HTTP server:
   ```bash
   npx serve .
   # or
   python -m http.server 3000
   ```
3. To connect to Supabase:
   - Run `supabase/schema.sql` in your Supabase SQL Editor.
   - Go to **Settings** in the BillCraft sidebar and enter your **Project URL** and **Anon Key**.
