/**
 * Main App Controller — Router, Navigation, Init
 */

const PAGES = {
  "dashboard":             { label: "Farmer Dashboard",    icon: "🏠", farmer: true,  admin: false },
  "procurement-tracking":  { label: "Track Procurement",   icon: "📍", farmer: true,  admin: false },
  "payment-tracking":      { label: "Payment Tracking",    icon: "💳", farmer: true,  admin: false },
  "history":               { label: "Procurement History", icon: "🗃️", farmer: true,  admin: false },
  "notifications":         { label: "Notifications",       icon: "🔔", farmer: true,  admin: false },
  "admin":                 { label: "Admin Dashboard",     icon: "👨‍💼", farmer: false, admin: true  },
};

let _currentPage = "dashboard";

function navigateTo(pageId) {
  _currentPage = pageId;
  // Hide all pages, show target
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  const target = document.getElementById("page-" + pageId);
  if (target) target.classList.add("active");

  // Update nav active state
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add("active");

  // Update header breadcrumb
  const cfg = PAGES[pageId] || {};
  const hb = document.getElementById("header-breadcrumb-title");
  const hs = document.getElementById("header-breadcrumb-sub");
  if (hb) hb.textContent = cfg.label || pageId;
  if (hs) hs.textContent = store.currentRole === "admin" ? "Admin View" : "Farmer View";

  // Render the page
  renderPage(pageId);

  // Mobile: close sidebar on navigation
  closeMobileSidebar();

  // Close notifications panel
  const notifPanel = document.getElementById("notif-panel");
  if (notifPanel) notifPanel.classList.remove("open");
}

function renderPage(pageId) {
  switch (pageId) {
    case "dashboard":            renderFarmerDashboard();     break;
    case "procurement-tracking": renderProcurementTracking(); break;
    case "payment-tracking":     renderPaymentTracking();     break;
    case "history":              renderProcurementHistory();  break;
    case "notifications":        renderNotificationsPage();   break;
    case "admin":                renderAdminDashboard();      break;
  }
}

function buildSidebar() {
  const isAdmin = store.currentRole === "admin";
  const farmer  = store.getCurrentFarmer();
  const notifs  = store.getNotifications();
  const unreadNotifs = notifs.filter(n => !n.isRead).length;

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const farmerPages = Object.entries(PAGES).filter(([,v]) => v.farmer);
  const adminPages  = Object.entries(PAGES).filter(([,v]) => v.admin);

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">🌾</div>
        <div class="sidebar-logo-text">
          <h1>e-Krishi Kisaan</h1>
          <span>Procurement & Payment Tracker</span>
        </div>
      </div>
      <div class="sidebar-role-switcher">
        <button class="role-btn ${!isAdmin ? "active" : ""}" onclick="switchRole('farmer')">🧑‍🌾 Farmer</button>
        <button class="role-btn ${isAdmin ? "active" : ""}" onclick="switchRole('admin')">👨‍💼 Admin</button>
      </div>
    </div>

    <nav class="sidebar-nav">
      ${!isAdmin ? `
      <div class="nav-label">Farmer Portal</div>
      ${farmerPages.map(([id, cfg]) => `
        <div class="nav-item ${_currentPage === id ? "active" : ""}" data-page="${id}" onclick="navigateTo('${id}')">
          <span class="nav-icon">${cfg.icon}</span>
          <span>${cfg.label}</span>
          ${id === "notifications" && unreadNotifs > 0 ? `<span class="nav-badge">${unreadNotifs}</span>` : ""}
        </div>`).join("")}
      ` : `
      <div class="nav-label">Admin Portal</div>
      ${adminPages.map(([id, cfg]) => `
        <div class="nav-item ${_currentPage === id ? "active" : ""}" data-page="${id}" onclick="navigateTo('${id}')">
          <span class="nav-icon">${cfg.icon}</span>
          <span>${cfg.label}</span>
        </div>`).join("")}
      `}

      <div class="nav-label" style="margin-top:16px;">Quick Actions</div>
      ${!isAdmin ? `<div class="nav-item" onclick="openNewProcurementModal()"><span class="nav-icon">➕</span><span>New Procurement</span></div>` : ""}
      <div class="nav-item" onclick="switchFarmerDemo()"><span class="nav-icon">🔄</span><span>Switch Demo Farmer</span></div>
      <div class="nav-item" onclick="confirmAction('Reset all data to demo state?', () => { store.resetToDemo(); location.reload(); })"><span class="nav-icon">♻️</span><span>Reset Demo Data</span></div>
      <div class="nav-label" style="margin-top:16px;">SIH Information</div>
      <div class="nav-item" onclick="showSIHInfo()"><span class="nav-icon">ℹ️</span><span>About SIH26032</span></div>
    </nav>

    <div class="sidebar-farmer">
      <div class="sidebar-farmer-card">
        <div class="farmer-avatar">${isAdmin ? "👨‍💼" : "🧑‍🌾"}</div>
        <div class="farmer-info">
          <h4>${isAdmin ? sanitize(store.getCurrentAdmin().name) : sanitize(farmer.name)}</h4>
          <span>${isAdmin ? "Admin / Official" : sanitize(farmer.id)}</span>
        </div>
      </div>
    </div>
  `;
}

function switchRole(role) {
  store.setRole(role);
  // Navigate to default page for role
  if (role === "admin") {
    navigateTo("admin");
  } else {
    navigateTo("dashboard");
  }
  buildSidebar();
}

let _farmerIndex = 0;
function switchFarmerDemo() {
  _farmerIndex = (_farmerIndex + 1) % store.farmers.length;
  const f = store.farmers[_farmerIndex];
  store.setFarmer(f.id);
  buildSidebar();
  renderPage(_currentPage);
  showToast(`Switched to farmer: ${f.name} (${f.id})`, "info");
}

function showSIHInfo() {
  openModal("modal-sih-info");
}

function toggleMobileSidebar() {
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  if (!sidebar) return;
  sidebar.classList.toggle("open");
  overlay?.classList.toggle("show");
}
function closeMobileSidebar() {
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
}

// Store subscriber — rerender current page when data changes
function onStoreUpdate(event) {
  if (["init", "reset", "farmer_changed", "role_changed"].includes(event)) {
    buildSidebar();
    renderPage(_currentPage);
  } else if (["stage_updated", "payment_updated", "procurement_created"].includes(event)) {
    renderPage(_currentPage);
    renderNotificationsPanel();
    buildSidebar(); // refresh unread badge
  } else if (["notifications_updated"].includes(event)) {
    buildSidebar();
    renderNotificationsPanel();
  }
}

// ---- Application Entry Point ----
async function initApp() {
  // Start load bar animation
  await store.init();

  // Wire up store subscriber
  store.subscribe(onStoreUpdate);

  // Build initial layout
  buildSidebar();
  navigateTo("dashboard");

  // Hide loading screen
  const loader = document.getElementById("loading-screen");
  if (loader) {
    loader.classList.add("fade-out");
    setTimeout(() => loader.remove(), 600);
  }

  // Server status indicator
  const statusEl = document.getElementById("server-status");
  if (statusEl) {
    statusEl.textContent = store.isOnlineServer ? "🟢 Server Connected" : "🟡 Offline Mode (LocalStorage)";
    statusEl.style.color = store.isOnlineServer ? "var(--green-600)" : "var(--orange-600)";
  }
}

// Boot when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
