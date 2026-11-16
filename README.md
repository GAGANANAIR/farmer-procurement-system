# e-Krishi Kisaan — Procurement & Payment Tracking System
### Smart India Hackathon | Problem Statement **SIH26032**
> Ministry of Agriculture & Farmers' Welfare | PM-AASHA / MSP Price Support Scheme

---

## 📁 Project Structure

```
farmer-procurement-system/
├── index.html                        ← Main single-page application
├── server.ps1                        ← PowerShell REST API + static file server
├── css/
│   └── style.css                     ← Full green-govt theme stylesheet
├── data/
│   └── database.json                 ← JSON database (3 farmers, 5 procurements)
└── js/
    ├── data.js                       ← Seed data constants & stage config
    ├── store.js                      ← State manager (API + LocalStorage)
    ├── utils.js                      ← Formatters, badges, toasts, modals
    ├── app.js                        ← Router, navigation, app boot
    └── components/
        ├── farmer-dashboard.js       ← Dashboard + stats + charts
        ├── procurement-tracker.js    ← 8-stage timeline tracker + new booking
        ├── payment-tracker.js        ← Payment cards, detail rows, history table
        ├── history.js                ← Full history table with search & filters
        ├── notifications.js          ← Notification panel + page
        └── admin-panel.js            ← Admin CRUD — stage & payment updates
```

---

## 🚀 How to Run Locally

### Option A — With PowerShell REST Server (Full Backend)

1. Open **Windows PowerShell** (not CMD) as Administrator
2. Run:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
cd "C:\Users\gagan\.gemini\antigravity\scratch\farmer-procurement-system"
.\server.ps1
```
3. Open your browser at **http://localhost:5000/**

> The server provides a full REST API and also serves all static files.

---

### Option B — Without Server (Offline / LocalStorage Mode)

1. Open `index.html` directly in your browser **(double-click the file)**
2. The app auto-detects no server and falls back to **browser LocalStorage**
3. All features work identically — data is saved locally in the browser

> ⚠️ Due to browser security (CORS), direct file:// opening may block fetch calls. Use Option A for the best experience, or use VS Code Live Server extension.

---

### Option C — VS Code Live Server

1. Open the project folder in VS Code
2. Install the **Live Server** extension
3. Right-click `index.html` → **Open with Live Server**
4. URL: `http://127.0.0.1:5500/`

---

## 👤 Demo Credentials / Accounts

| Role | Farmer ID | Name | State |
|------|-----------|------|-------|
| **Farmer** | FAR-MH-2024-8841 | Ramesh Kumar Patel | Maharashtra |
| **Farmer** | FAR-PB-2024-1029 | Sardar Balvinder Singh Sandhu | Punjab |
| **Farmer** | FAR-RJ-2024-3401 | Sunita Devi Choudhary | Rajasthan |
| **Admin** | ADM-001 | Dr. S. K. Verma | Karnal APMC |
| **Admin** | ADM-002 | Anita Sharma | Finance Officer |

> Switch between roles using the **Farmer / Admin** toggle in the sidebar.
> Switch demo farmers using the **🔄 Switch Demo Farmer** sidebar button.

---

## 🧭 Feature Walkthrough

### 1. Farmer Dashboard
- View your profile, land, bank (DBT-linked) info
- Stats: Total procurements, Completed, In Progress, Total value received, Pending
- Bar chart: Procurement value by crop
- Donut chart: Payment status breakdown
- Recent procurements quick table with **Track** button

### 2. Procurement Tracking (8 Stages)
1. 📋 Registration Submitted
2. 📅 Slot Booking Confirmed
3. 🚛 Produce Arrived at Procurement Centre
4. 🔬 Quality Inspection (FAQ Grade)
5. ⚖️ Weighing Completed
6. ✅ Procurement Approved
7. 🏦 Payment Processing (PFMS/DBT)
8. 💰 Payment Completed (UTR Credit)

- **Green** = Completed | **Blue** = In Progress (animated pulse) | **Grey** = Pending
- Each stage shows: officer name, timestamp, relevant info (moisture %, weight, UTR), official remarks
- Select different procurements via dropdown

### 3. Payment Tracking
- Summary cards: Total value / Received / Processing / Pending
- Detailed payment cards per procurement with Bank Ref/UTR
- Colour-coded alerts for each payment state
- Payment history table with search + status filter

### 4. Procurement History
- Full table with 11 columns
- Search by ID, crop, centre
- Filter by: Crop | Proc Status | Payment Status | Date Range
- **View** button opens timeline for that record

### 5. Admin Dashboard
- **Search Farmer** by ID or name (datalist autocomplete)
- View all their procurements
- **Update any stage** (1–8) with status, remarks, relevant info
- Stage 5 (Weighing) — enter actual weight to auto-recalculate payment amount
- **Update Payment** — set Processing / Successful / Failed + enter UTR/Bank Ref
- Automatic notification generated on every update
- All-pending-procurements table

### 6. Notifications
- In-app notification panel (slide-in from right via bell icon 🔔)
- Full notifications page with unread count badge
- Mark individual or all-read
- Notification channels: In-App, SMS, WhatsApp (architecture ready)

---

## 🔄 End-to-End Demo Flow

```
1. Login as Farmer (FAR-MH-2024-8841 — Ramesh Kumar Patel)
2. Dashboard → See 3 procurement records, stats, charts
3. Click "Track" on PRC-2024-003 (Gram/Chana — PENDING)
4. See timeline stuck at Stage 3 (Produce Arrival)

5. Switch to ADMIN role (sidebar toggle)
6. All Pending table shows PRC-2024-003
7. Click "Update" → Stage 3 → Set "Completed" + Enter remarks
8. Stage 4 auto-advances to "In Progress"
9. Continue updating Stage 4 (Quality), Stage 5 (Weighing — enter weight)
10. Update Stage 6 (Approval) → Stage 7 (Payment Processing)
11. Update Payment → "Payment Successful" + Enter UTR number

12. Switch back to FARMER
13. Dashboard now shows updated stats
14. Timeline shows all 8 stages ✅ Completed
15. Payment card shows ₹1,36,000 credited with UTR
16. Notifications show all 7 update messages
```

---

## 🌐 REST API Endpoints (server.ps1 mode)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Server health check |
| GET | `/api/farmers` | All farmers |
| GET | `/api/procurements?farmerId=X` | Procurements (optionally filtered) |
| POST | `/api/procurements` | Create new procurement |
| PUT | `/api/procurements/:id/stage` | Update procurement stage |
| PUT | `/api/procurements/:id/payment` | Update payment status |
| GET | `/api/payments?farmerId=X` | Payment records |
| GET | `/api/notifications?farmerId=X` | Notifications |
| POST | `/api/notifications/mark-read` | Mark notification(s) read |
| GET | `/api/centres` | Procurement centres |
| GET | `/api/msp` | Current MSP rates |

---

## 📱 Responsive Design

| Device | Experience |
|--------|-----------|
| Desktop (1200px+) | Full sidebar + dashboard with charts |
| Tablet (768–1200px) | Collapsible sidebar, simplified charts |
| Mobile (<768px) | Hamburger menu, stacked cards, touch-optimised |

---

## 🔧 Customisation

- **Add new crops / MSP rates:** Edit `data/database.json` → `mspRates` array
- **Add procurement centres:** Edit `data/database.json` → `procurementCentres`
- **Add a farmer:** Edit `data/database.json` → `farmers` array
- **Reset to demo state:** Sidebar → "♻️ Reset Demo Data"
- **Switch PowerShell port:** Edit `$port = 5000` in `server.ps1`

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| State Management | Custom reactive store (KrishiStore class) |
| Backend | PowerShell 5.1 HttpListener (no Node/Python needed) |
| Database | JSON file (server) + LocalStorage (offline) |
| Charts | SVG-based custom bar chart + donut chart |
| Notifications | In-app real-time + SMS/WhatsApp integration-ready |
| Design | Government agriculture theme (Green & White) |
| Responsive | CSS Grid + Flexbox, mobile-first |

---

## ⚠️ Important Notes

1. **Demo Data Only** — All farmers, payment amounts, UTR references, and procurement data are fictional for demonstration
2. **No Real Payments** — This system does not process or initiate real financial transactions
3. **PFMS Integration** — The system is architecturally ready to connect to India's PFMS (Public Financial Management System) API
4. **DBT Compliance** — Payment flow follows Government of India DBT (Direct Benefit Transfer) standards

---

*Built for Smart India Hackathon (SIH) | Problem Statement SIH26032*
*Module: Procurement and Payment Status Tracking*
