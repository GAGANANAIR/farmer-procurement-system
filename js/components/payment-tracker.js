/**
 * Payment Tracking Dashboard Component
 */

function renderPaymentTracking() {
  const container = document.getElementById("page-payment-tracking");
  if (!container) return;

  const pays = store.getPayments();
  const procs = store.getProcurements();

  if (pays.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💳</div><h3>No payment records found</h3><p>Payment records will appear once your produce is procured.</p></div>`;
    return;
  }

  const totalValue    = pays.reduce((s, p) => s + (p.totalValue || 0), 0);
  const totalReceived = pays.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const totalPending  = pays.reduce((s, p) => s + (p.pendingAmount || 0), 0);
  const processing    = pays.filter(p => p.status === "Payment Processing").reduce((s, p) => s + (p.pendingAmount || 0), 0);

  container.innerHTML = `
    <!-- Payment Summary Cards -->
    <div class="payment-summary-grid">
      <div class="payment-card"><div class="payment-card-label">Total Procurement Value</div><div class="payment-card-value">${formatCurrency(totalValue)}</div></div>
      <div class="payment-card success"><div class="payment-card-label">Amount Received (DBT)</div><div class="payment-card-value success">${formatCurrency(totalReceived)}</div></div>
      <div class="payment-card processing"><div class="payment-card-label">Under Processing</div><div class="payment-card-value processing">${formatCurrency(processing)}</div></div>
      <div class="payment-card pending"><div class="payment-card-label">Pending Payment</div><div class="payment-card-value pending">${formatCurrency(totalPending)}</div></div>
    </div>

    <!-- Payment Records -->
    <div class="section-title"><div class="title-icon">📄</div>Procurement Payment Details</div>

    ${pays.map(pay => {
      const proc = procs.find(p => p.procurementId === pay.procurementId || p.id === pay.procurementId) || {};
      return `
      <div class="payment-detail-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:1rem; font-weight:800; color:var(--grey-900);">${sanitize(pay.cropName)}</div>
            <div class="text-sm text-muted">Procurement ID: <span class="proc-id-badge">${sanitize(pay.procurementId)}</span></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            ${statusBadge(pay.status)}
            ${pay.status === "Payment Successful" ? '<span style="font-size:1.5rem;">✅</span>' : pay.status === "Payment Processing" ? '<span style="font-size:1.5rem;">⏳</span>' : pay.status === "Payment Failed" ? '<span style="font-size:1.5rem;">❌</span>' : '<span style="font-size:1.5rem;">🕐</span>'}
          </div>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Total Procurement Value</span>
          <span class="payment-detail-value amount">${formatCurrency(pay.totalValue)}</span>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Amount Paid</span>
          <span class="payment-detail-value" style="color:${pay.amountPaid > 0 ? 'var(--green-700)' : 'var(--grey-500)'};">${formatCurrency(pay.amountPaid)}</span>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Pending Amount</span>
          <span class="payment-detail-value pending-amt">${formatCurrency(pay.pendingAmount)}</span>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Transaction ID</span>
          <span class="payment-detail-value font-mono text-sm">${sanitize(pay.transactionId || "—")}</span>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Payment Date</span>
          <span class="payment-detail-value">${formatDate(pay.paymentDate)}</span>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Payment Method</span>
          <span class="payment-detail-value">${sanitize(pay.paymentMethod || "DBT-PFMS")}</span>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Bank Reference / UTR</span>
          <span class="payment-detail-value font-mono text-sm">${sanitize(pay.bankReferenceNo || "—")}</span>
        </div>
        <div class="payment-detail-row">
          <span class="payment-detail-label">Beneficiary Account</span>
          <span class="payment-detail-value">${sanitize(pay.beneficiaryAccount || "—")}</span>
        </div>
        ${pay.remarks ? `
        <div class="payment-detail-row">
          <span class="payment-detail-label">Remarks</span>
          <span class="payment-detail-value text-sm" style="color:var(--grey-600);font-style:italic;">${sanitize(pay.remarks)}</span>
        </div>` : ""}

        ${pay.status === "Payment Successful" ? `
        <div class="alert alert-success" style="margin-top:14px; margin-bottom:0;">
          ✅ <strong>Payment Successfully Credited</strong><br>
          <span style="font-size:0.8rem;">Amount of ${formatCurrency(pay.amountPaid)} has been directly transferred to your linked bank account via DBT. This is a government-processed payment through PFMS.</span>
        </div>` : ""}
        ${pay.status === "Payment Processing" ? `
        <div class="alert alert-info" style="margin-top:14px; margin-bottom:0;">
          ⏳ <strong>Payment Under Processing</strong><br>
          <span style="font-size:0.8rem;">Your payment has been initiated via PFMS. It will be credited to your account within 24–72 business hours.</span>
        </div>` : ""}
        ${pay.status === "Payment Failed" ? `
        <div class="alert alert-danger" style="margin-top:14px; margin-bottom:0;">
          ❌ <strong>Payment Credit Failed</strong><br>
          <span style="font-size:0.8rem;">There was an issue processing your payment. The mandi finance officer has been notified and will re-initiate within 2 business days. Contact helpline if unresolved.</span>
        </div>` : ""}
      </div>`;
    }).join("")}

    <!-- Payment History Table -->
    <div class="section-title"><div class="title-icon">📜</div>Payment History</div>
    <div class="table-wrapper">
      <div class="table-toolbar">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="pay-search" placeholder="Search by Procurement ID, crop, UTR…" oninput="filterPaymentTable()">
        </div>
        <select class="table-filter" id="pay-status-filter" onchange="filterPaymentTable()">
          <option value="">All Payment Statuses</option>
          <option>Payment Successful</option>
          <option>Payment Processing</option>
          <option>Payment Pending</option>
          <option>Payment Failed</option>
        </select>
      </div>
      <div class="table-container">
        <table id="payment-history-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Procurement ID</th>
              <th>Crop</th>
              <th>Total Value</th>
              <th>Amount Paid</th>
              <th>Pending</th>
              <th>UTR / Bank Ref</th>
              <th>Payment Date</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="payment-table-body">
            ${renderPaymentTableRows(pays)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPaymentTableRows(pays) {
  if (!pays || pays.length === 0) {
    return `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📭</div><h3>No matching payment records</h3></div></td></tr>`;
  }
  return pays.map(p => `
    <tr>
      <td><span class="proc-id-badge" style="font-size:0.68rem;">${sanitize(p.id)}</span></td>
      <td><span class="proc-id-badge" style="font-size:0.68rem;">${sanitize(p.procurementId)}</span></td>
      <td><strong>${sanitize(p.cropName)}</strong></td>
      <td><strong>${formatCurrency(p.totalValue)}</strong></td>
      <td style="color:var(--green-700);font-weight:700;">${formatCurrency(p.amountPaid)}</td>
      <td style="color:var(--orange-600);font-weight:700;">${formatCurrency(p.pendingAmount)}</td>
      <td class="font-mono text-sm">${sanitize(p.bankReferenceNo || "—")}</td>
      <td class="text-sm">${formatDateOnly(p.paymentDate)}</td>
      <td class="text-sm">${sanitize(p.paymentMethod ? p.paymentMethod.replace("Direct Benefit Transfer ", "DBT").replace("Aadhaar Payment Bridge", "APBS") : "DBT")}</td>
      <td>${statusBadge(p.status)}</td>
    </tr>`).join("");
}

function filterPaymentTable() {
  const q = (document.getElementById("pay-search")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("pay-status-filter")?.value || "";
  const pays = store.getPayments().filter(p => {
    const matchQ = !q || (p.id + p.procurementId + p.cropName + (p.bankReferenceNo || "")).toLowerCase().includes(q);
    const matchS = !statusFilter || p.status === statusFilter;
    return matchQ && matchS;
  });
  const tbody = document.getElementById("payment-table-body");
  if (tbody) tbody.innerHTML = renderPaymentTableRows(pays);
}
