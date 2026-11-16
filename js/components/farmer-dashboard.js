/**
 * Farmer Dashboard Component
 */

function renderFarmerDashboard() {
  const farmer = store.getCurrentFarmer();
  const stats = store.getDashboardStats();
  const procs = store.getProcurements();
  const pays  = store.getPayments();

  const container = document.getElementById("page-dashboard");
  if (!container) return;

  container.innerHTML = `
    <!-- Farmer Profile -->
    <div class="farmer-profile-card">
      <div class="profile-avatar">🧑‍🌾</div>
      <div class="profile-details">
        <h2>${sanitize(farmer.name)}</h2>
        <div class="farmer-id">🪪 ${sanitize(farmer.id)} &nbsp;|&nbsp; Kisan Credit Card: ${sanitize(farmer.kisanCardNo)}</div>
        <div class="profile-meta">
          <div class="meta-item"><span>📍</span><span>${sanitize(farmer.village)}, ${sanitize(farmer.district)}, ${sanitize(farmer.state)}</span></div>
          <div class="meta-item"><span>📞</span><span>${sanitize(farmer.phone)}</span></div>
          <div class="meta-item"><span>🌾</span><span>Land: ${farmer.landSizeAcres} Acres</span></div>
          <div class="meta-item"><span>🏦</span><span>${sanitize(farmer.bankDetails.bankName)} (${sanitize(farmer.bankDetails.accountMasked)})</span></div>
        </div>
        <div class="profile-badges">
          ${farmer.bankDetails.dbtLinked ? '<span class="profile-badge">✅ DBT Linked</span>' : '<span class="profile-badge">⚠️ DBT Not Linked</span>'}
          <span class="profile-badge">🌱 ${sanitize(farmer.primaryCrops.join(", "))}</span>
          <span class="profile-badge">📆 Registered: ${formatDateOnly(farmer.registrationDate)}</span>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-top">
          <div class="stat-label">Total Procurements</div>
          <div class="stat-icon">📋</div>
        </div>
        <div class="stat-value">${stats.totalRecords}</div>
        <div class="stat-sub">Registered records</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-top">
          <div class="stat-label">Completed</div>
          <div class="stat-icon">✅</div>
        </div>
        <div class="stat-value">${stats.completedProcs}</div>
        <div class="stat-sub">Fully processed</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-top">
          <div class="stat-label">In Progress / Pending</div>
          <div class="stat-icon">⏳</div>
        </div>
        <div class="stat-value">${stats.pendingProcs}</div>
        <div class="stat-sub">Awaiting completion</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-top">
          <div class="stat-label">Total Procurement Value</div>
          <div class="stat-icon">📊</div>
        </div>
        <div class="stat-value" style="font-size:1.3rem">${formatCurrency(stats.totalProcurementValue)}</div>
        <div class="stat-sub">Across all crops</div>
      </div>
      <div class="stat-card green">
        <div class="stat-top">
          <div class="stat-label">Total Payment Received</div>
          <div class="stat-icon">💰</div>
        </div>
        <div class="stat-value" style="font-size:1.3rem">${formatCurrency(stats.totalReceived)}</div>
        <div class="stat-sub">DBT credited</div>
      </div>
      <div class="stat-card red">
        <div class="stat-top">
          <div class="stat-label">Pending Payment</div>
          <div class="stat-icon">🏦</div>
        </div>
        <div class="stat-value" style="font-size:1.3rem">${formatCurrency(stats.pendingPayment)}</div>
        <div class="stat-sub">Yet to be credited</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <!-- Procurement Status Bar Chart -->
      <div class="chart-card">
        <h3>📦 Procurement by Crop</h3>
        <div class="chart-bar-wrap" id="crop-chart-bars">
          ${procs.map(p => {
            const pct = stats.totalProcurementValue > 0 ? Math.round((p.totalAmount / stats.totalProcurementValue) * 100) : 0;
            const color = p.paymentStatus === "Payment Successful" ? "var(--green-500)"
              : p.paymentStatus === "Payment Processing" ? "var(--blue-600)"
              : "var(--grey-400)";
            return `
              <div class="chart-bar-row">
                <div class="chart-bar-label">${sanitize(p.cropName)}</div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <div class="chart-bar-val">${formatCurrency(p.totalAmount)}</div>
              </div>`;
          }).join("")}
        </div>
      </div>

      <!-- Payment Status Donut -->
      <div class="chart-card">
        <h3>💳 Payment Status Overview</h3>
        <div class="mini-donut-wrap">
          <svg id="payment-donut" class="donut-svg" viewBox="0 0 128 128" width="128" height="128">
            <circle class="donut-track" cx="64" cy="64" r="54"/>
          </svg>
          <div class="donut-legend">
            <div class="donut-legend-item"><div class="donut-dot" style="background:var(--green-500)"></div>Received: ${formatCurrency(stats.totalReceived)}</div>
            <div class="donut-legend-item"><div class="donut-dot" style="background:var(--blue-600)"></div>Processing: ${formatCurrency(_getProcessingAmount(pays))}</div>
            <div class="donut-legend-item"><div class="donut-dot" style="background:var(--grey-300)"></div>Pending: ${formatCurrency(_getPendingAmount(pays))}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Procurements Table -->
    <div class="section-title"><div class="title-icon">🗂️</div>Recent Procurement Records</div>
    <div class="table-wrapper">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Procurement ID</th>
              <th>Crop</th>
              <th>Qty (kg)</th>
              <th>Centre</th>
              <th>Slot Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${procs.length === 0 ? `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📭</div><h3>No procurement records found</h3></div></td></tr>` :
              procs.map(p => `
              <tr>
                <td><span class="proc-id-badge">${sanitize(p.id)}</span></td>
                <td><strong>${sanitize(p.cropName)}</strong><br><span class="text-sm text-muted">${sanitize(p.variety || "")}</span></td>
                <td>${(p.actualQuantityKg || 0).toLocaleString("en-IN")}</td>
                <td class="text-sm">${sanitize(p.centreName)}</td>
                <td class="text-sm">${formatDateOnly(p.slotDate)}</td>
                <td><strong>${formatCurrency(p.totalAmount)}</strong></td>
                <td>${procStatusBadge(p.procurementStatus)}</td>
                <td>${statusBadge(p.paymentStatus)}</td>
                <td>
                  <button class="btn btn-sm btn-outline-green" onclick="viewProcurementTimeline('${sanitize(p.id)}')">🔍 Track</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- MSP Rate Info -->
    <div class="section-title"><div class="title-icon">📈</div>Current MSP Rates (Government Notified)</div>
    <div class="table-wrapper">
      <div class="table-container">
        <table>
          <thead><tr><th>Crop</th><th>Season</th><th>MSP (₹/Quintal)</th></tr></thead>
          <tbody>
            ${store.mspRates.map(m => `
              <tr>
                <td><strong>${sanitize(m.crop)}</strong></td>
                <td class="text-sm">${sanitize(m.season)}</td>
                <td><strong class="text-green">${formatCurrency(m.mspPerQuintal)}/Qtl</strong></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Render donut after DOM update
  setTimeout(() => {
    const received = stats.totalReceived;
    const processing = _getProcessingAmount(pays);
    const pending = _getPendingAmount(pays);
    renderDonut("payment-donut", [
      { value: received,   color: "var(--green-500)" },
      { value: processing, color: "var(--blue-600)" },
      { value: pending,    color: "var(--grey-300)" }
    ]);
  }, 50);
}

function _getProcessingAmount(pays) {
  return pays.filter(p => p.status === "Payment Processing").reduce((s, p) => s + (p.pendingAmount || 0), 0);
}
function _getPendingAmount(pays) {
  return pays.filter(p => p.status === "Payment Pending").reduce((s, p) => s + (p.pendingAmount || 0), 0);
}

function viewProcurementTimeline(id) {
  store.setSelectedProcurement(id);
  navigateTo("procurement-tracking");
}
