/**
 * UI Helper Utilities — toasts, badges, formatters, modals
 */

// ---- Formatters ----
function formatCurrency(amount) {
  if (amount == null) return "—";
  return "₹" + Number(amount).toLocaleString("en-IN");
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return isoStr; }
}

function formatDateOnly(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return isoStr; }
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function sanitize(str) {
  const div = document.createElement("div");
  div.textContent = String(str || "");
  return div.innerHTML;
}

// ---- Badge Generator ----
function statusBadge(status) {
  const map = {
    "Completed":          ["badge-success", "✓"],
    "In Progress":        ["badge-info",    "⟳"],
    "Pending":            ["badge-secondary","○"],
    "Payment Successful": ["badge-success", "✓"],
    "Payment Processing": ["badge-info",    "⟳"],
    "Payment Pending":    ["badge-warning", "⏳"],
    "Payment Failed":     ["badge-danger",  "✗"],
  };
  const [cls, icon] = map[status] || ["badge-secondary", "?"];
  return `<span class="badge ${cls}">${icon} ${sanitize(status)}</span>`;
}

function procStatusBadge(status) {
  const map = {
    "Completed":  "badge-success",
    "In Progress":"badge-info",
    "Pending":    "badge-warning",
    "Failed":     "badge-danger",
  };
  return `<span class="badge ${map[status] || "badge-secondary"}">${sanitize(status)}</span>`;
}

// ---- Toast Notifications ----
let _toastContainer = null;
function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById("toast-container");
    if (!_toastContainer) {
      _toastContainer = document.createElement("div");
      _toastContainer.id = "toast-container";
      _toastContainer.className = "toast-container";
      document.body.appendChild(_toastContainer);
    }
  }
  return _toastContainer;
}

function showToast(message, type = "success", duration = 3500) {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span> <span>${sanitize(message)}</span>`;
  const container = getToastContainer();
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all .3s ease";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ---- Modal Helpers ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add("open"); document.body.style.overflow = "hidden"; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove("open"); document.body.style.overflow = ""; }
}
function closeAllModals() {
  document.querySelectorAll(".modal-overlay.open").forEach(el => {
    el.classList.remove("open");
  });
  document.body.style.overflow = "";
}

// Close modal on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) closeAllModals();
});

// ---- Procurement Timeline Stage Utils ----
function getStageClass(status) {
  if (status === "Completed") return "completed";
  if (status === "In Progress") return "inprogress";
  return "pending";
}

function getStageIcon(status) {
  if (status === "Completed") return "✓";
  if (status === "In Progress") return "⟳";
  return "○";
}

function notifIcon(type) {
  const map = {
    "PAYMENT_SUCCESS": { icon: "💰", cls: "success" },
    "PAYMENT_INITIATED": { icon: "🏦", cls: "info" },
    "PAYMENT_FAILED": { icon: "⚠️", cls: "danger" },
    "SLOT_CONFIRMED": { icon: "📅", cls: "info" },
    "ARRIVAL": { icon: "🚛", cls: "info" },
    "QUALITY": { icon: "🔬", cls: "success" },
    "WEIGHING": { icon: "⚖️", cls: "success" },
    "APPROVED": { icon: "✅", cls: "success" },
    "GENERAL": { icon: "🔔", cls: "info" },
  };
  return map[type] || { icon: "🔔", cls: "info" };
}

// ---- Confirm Dialog ----
function confirmAction(message, onConfirm) {
  if (window.confirm(message)) onConfirm();
}

// ---- Debounce ----
function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---- Simple SVG Donut ----
function renderDonut(svgId, segments) {
  // segments: [{value, color}]
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const r = 54; const cx = 64; const cy = 64;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  if (total === 0) return;

  let offset = 0;
  svg.innerHTML = `<circle class="donut-track" cx="${cx}" cy="${cy}" r="${r}" />`;
  segments.forEach(seg => {
    const pct = seg.value / total;
    const dash = pct * circ;
    const gap = circ - dash;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "donut-segment");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    circle.setAttribute("stroke", seg.color);
    circle.setAttribute("stroke-dasharray", `${dash} ${gap}`);
    circle.setAttribute("stroke-dashoffset", `-${offset}`);
    svg.appendChild(circle);
    offset += dash;
  });
}
