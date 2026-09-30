# InvoicePulse SaaS - Invoicing & Expense Management Dashboard

A full-stack web application designed for freelancers and small businesses to manage client profiles, generate downloadable PDF invoices, track operational expenses, and analyze financial performance metrics in real time.

---

## Features

- **Authentication & Security:** User registration and sign-in backed by Supabase Auth with Row-Level Security (RLS) ensuring strict multi-tenant data privacy.
- **Client Management:** Complete CRUD operations for adding, editing, searching, and deleting client contact records.
- **Invoice Tracking & PDF Generation:** Interactive invoice creation with automated status badges (Paid, Pending, Overdue) and client-side PDF export rendered via `html2pdf.js`.
- **Expense Logging:** Categorized business expense recorder for monitoring overhead costs.
- **Financial Analytics Dashboard:** Aggregated metrics calculating Total Clients, Paid Revenue, Outstanding Balance, Operational Expenses, and overall Net Profit.
- **Real-Time Client-Side Filtering:** Instant search filtering across client records and invoice transactions.

---

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3 (CSS Grid & Flexbox)
- **Backend & Database:** Supabase (PostgreSQL, Authentication, Row-Level Security)
- **Libraries:** `html2pdf.js` for document rendering, `@supabase/supabase-js` client SDK

---

## Setup & Local Development

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/InvoicePulse-SaaS.git](https://github.com/YOUR_USERNAME/InvoicePulse-SaaS.git)
   cd InvoicePulse-SaaS