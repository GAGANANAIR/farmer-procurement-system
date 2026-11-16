/**
 * Notifications Panel Component
 */

function renderNotificationsPanel() {
  const notifs = store.getNotifications();
  const unread = notifs.filter(n => !n.isRead).length;

  // Update badge on bell icon
  const dot = document.getElementById("notif-dot");
  if (dot) dot.style.display = unread > 0 ? "block" : "none";
  const badge = document.querySelector(".nav-item[data-page='notifications'] .nav-badge");
  if (badge) {
    badge.textContent = unread > 0 ? unread : "";
    badge.style.display = unread > 0 ? "inline" : "none";
  }

  const list = document.getElementById("notif-list");
  if (!list) return;

  if (notifs.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:40px 20px;"><div class="empty-icon">🔔</div><h3>No notifications yet</h3><p>Updates will appear here as your procurement progresses.</p></div>`;
    return;
  }

  list.innerHTML = notifs.map(n => {
    const { icon, cls } = notifIcon(n.type);
    return `
      <div class="notif-item ${n.isRead ? "" : "unread"}" onclick="markNotifRead('${sanitize(n.id)}')">
        <div class="notif-icon ${cls}">${icon}</div>
        <div class="notif-body">
          <div class="notif-title">${sanitize(n.title)}</div>
          <div class="notif-msg">${sanitize(n.message)}</div>
          <div class="notif-time">${timeAgo(n.createdAt)} &nbsp;•&nbsp; ${sanitize(n.channel || "In-App")}</div>
        </div>
        ${!n.isRead ? '<div class="notif-unread-dot"></div>' : ""}
      </div>`;
  }).join("");
}

function markNotifRead(id) {
  const n = store.notifications.find(x => x.id === id);
  if (n) n.isRead = true;
  store.persistLocal && store.persistLocal();
  renderNotificationsPanel();
}

async function markAllRead() {
  await store.markAllNotificationsRead();
  renderNotificationsPanel();
  showToast("All notifications marked as read.", "success");
}

function toggleNotifPanel() {
  const panel = document.getElementById("notif-panel");
  if (!panel) return;
  panel.classList.toggle("open");
  if (panel.classList.contains("open")) {
    renderNotificationsPanel();
  }
}

// ---- In-page Notifications view ----
function renderNotificationsPage() {
  const container = document.getElementById("page-notifications");
  if (!container) return;

  const notifs = store.getNotifications();
  const unread = notifs.filter(n => !n.isRead).length;

  container.innerHTML = `
    <div class="section-title">
      <div class="title-icon">🔔</div>
      Notification Centre
      ${unread > 0 ? `<span class="badge badge-danger" style="margin-left:8px;">${unread} Unread</span>` : ""}
    </div>

    ${unread > 0 ? `
    <div style="text-align:right; margin-bottom:12px;">
      <button class="btn btn-sm btn-secondary" onclick="markAllRead()">✓ Mark All as Read</button>
    </div>` : ""}

    <div class="alert alert-info" style="margin-bottom:16px;">
      📱 <strong>Multi-Channel Notifications:</strong> This system is integrated with SMS and WhatsApp notification channels (via India Gov PFMS gateway). Push notifications will be sent to your registered mobile number at every critical stage.
    </div>

    ${notifs.length === 0 ? `
    <div class="empty-state">
      <div class="empty-icon">🔔</div>
      <h3>No notifications yet</h3>
      <p>You'll receive updates here as your procurement progresses through each stage.</p>
    </div>` :
    notifs.map(n => {
      const { icon, cls } = notifIcon(n.type);
      return `
      <div class="payment-detail-card" style="margin-bottom:12px; ${!n.isRead ? 'border-left: 4px solid var(--green-500);' : ''}">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div class="notif-icon ${cls}" style="flex-shrink:0;">${icon}</div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
              <strong style="font-size:0.9rem;">${sanitize(n.title)}</strong>
              <div style="display:flex; gap:6px; align-items:center;">
                ${!n.isRead ? '<span class="badge badge-success">New</span>' : '<span class="badge badge-secondary">Read</span>'}
                <span class="text-sm text-muted">${timeAgo(n.createdAt)}</span>
              </div>
            </div>
            <div style="font-size:0.83rem; color:var(--grey-700); line-height:1.5;">${sanitize(n.message)}</div>
            <div style="margin-top:8px; font-size:0.72rem; color:var(--grey-500);">
              📅 ${formatDate(n.createdAt)} &nbsp;|&nbsp; 
              📲 Channel: ${sanitize(n.channel || "In-App")} &nbsp;|&nbsp;
              🔗 Ref: <span class="proc-id-badge" style="font-size:.65rem;">${sanitize(n.procurementId)}</span>
            </div>
          </div>
          ${!n.isRead ? `<button class="btn btn-sm btn-secondary" style="flex-shrink:0;" onclick="markNotifRead('${sanitize(n.id)}')">✓</button>` : ""}
        </div>
      </div>`;
    }).join("")}

    <!-- SMS/WhatsApp Integration Info -->
    <div class="chart-card" style="margin-top:16px;">
      <h3>📡 Notification Channels (Integration Ready)</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:16px; margin-top:12px;">
        <div style="padding:14px; background:var(--green-50); border-radius:8px; border:1px solid var(--green-200);">
          <div style="font-size:1.3rem; margin-bottom:6px;">📱</div>
          <strong style="font-size:0.85rem;">SMS (DLT Gateway)</strong><br>
          <span class="text-sm text-muted">Sent via registered mobile number. All 7 key stage updates delivered as SMS.</span>
        </div>
        <div style="padding:14px; background:#e8f5e9; border-radius:8px; border:1px solid #a5d6a7;">
          <div style="font-size:1.3rem; margin-bottom:6px;">💬</div>
          <strong style="font-size:0.85rem;">WhatsApp (BSNL/Meta API)</strong><br>
          <span class="text-sm text-muted">Rich WhatsApp messages with procurement certificate and payment confirmation PDFs.</span>
        </div>
        <div style="padding:14px; background:var(--blue-100); border-radius:8px; border:1px solid #90caf9;">
          <div style="font-size:1.3rem; margin-bottom:6px;">🌐</div>
          <strong style="font-size:0.85rem;">In-App (This Portal)</strong><br>
          <span class="text-sm text-muted">Real-time notifications visible immediately upon each status change by admin.</span>
        </div>
        <div style="padding:14px; background:var(--gold-100); border-radius:8px; border:1px solid #f9e4a0;">
          <div style="font-size:1.3rem; margin-bottom:6px;">🤖</div>
          <strong style="font-size:0.85rem;">IVR / Voice Call</strong><br>
          <span class="text-sm text-muted">Automated Hindi/regional language voice call for payment credit confirmation (planned).</span>
        </div>
      </div>
    </div>
  `;
}
