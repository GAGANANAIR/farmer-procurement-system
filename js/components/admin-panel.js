/**
 * Administrator Dashboard Component
 * - Search Farmers
 * - View & Update Procurement Stages
 * - Update Payment Status
 */

let _adminSelectedProcId = null;
let _adminViewFarmerId   = null;

function renderAdminDashboard() {
  const container = document.getElementById("page-admin");
  if (!container) return;

  const admin = store.getCurrentAdmin();
  const allProcs = store.procurements;
  const pendingProcs  = allProcs.filter(p => p.procurementStatus !== "Completed");
  const completedProcs = allProcs.filter(p => p.procurementStatus === "Completed");
  const pendingPay = allProcs.filter(p => p.paymentStatus !== "Payment Successful" && p.paymentStatus !== "Payment Failed");

  container.innerHTML = `
    <!-- Admin Profile Banner -->
    <div style="background:linear-gradient(135deg,var(--green-800),var(--green-500));color:white;border-radius:var(--border-radius);padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="width:52px;height:52px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;border:2px solid rgba(255,255,255,.4);">👨‍💼</div>
      <div style="flex:1;">
        <h2 style="font-size:1.1rem;font-weight:800;">${sanitize(admin.name)}</h2>
        <div style="font-size:0.8rem;opacity:.85;">${sanitize(admin.role)} &nbsp;•&nbsp; ${sanitize(admin.mandi)}</div>
        <div style="font-size:0.72rem;opacity:.7;margin-top:4px;">Badge: ${sanitize(admin.badge)} &nbsp;•&nbsp; Authorised Procurement Official</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="text-align:center;background:rgba(255,255,255,.12);padding:10px 16px;border-radius:8px;">
          <div style="font-size:1.4rem;font-weight:800;">${allProcs.length}</div>
          <div style="font-size:0.7rem;opacity:.8;">Total Records</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,.12);padding:10px 16px;border-radius:8px;">
          <div style="font-size:1.4rem;font-weight:800;">${pendingProcs.length}</div>
          <div style="font-size:0.7rem;opacity:.8;">In Progress</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,.12);padding:10px 16px;border-radius:8px;">
          <div style="font-size:1.4rem;font-weight:800;">${pendingPay.length}</div>
          <div style="font-size:0.7rem;opacity:.8;">Pending Payment</div>
        </div>
      </div>
    </div>

    <!-- Farmer Search -->
    <div class="admin-search-card">
      <div class="section-title" style="margin-bottom:12px;"><div class="title-icon">🔍</div>Search Farmer Records</div>
      <div class="admin-search-row">
        <div class="form-group" style="flex:1;margin-bottom:0;">
          <label class="form-label">Farmer ID or Name</label>
          <input type="text" id="admin-farmer-search" class="form-control" placeholder="Enter Farmer ID (e.g. FAR-MH-2024-8841) or Name…" list="farmer-list-datalist">
          <datalist id="farmer-list-datalist">
            ${store.farmers.map(f => `<option value="${f.id}">${f.name} — ${f.id}</option>`).join("")}
          </datalist>
        </div>
        <div style="flex-shrink:0; margin-top:22px;">
          <button class="btn btn-primary" onclick="adminSearchFarmer()">Search</button>
        </div>
      </div>
    </div>

    <!-- Farmer Result -->
    <div id="admin-farmer-result"></div>

    <!-- All Pending Procurements -->
    <div class="section-title"><div class="title-icon">⏳</div>All Pending / In-Progress Procurements</div>
    <div class="table-wrapper">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Procurement ID</th>
              <th>Farmer</th>
              <th>Crop</th>
              <th>Qty (kg)</th>
              <th>Centre</th>
              <th>Slot Date</th>
              <th>Proc. Status</th>
              <th>Payment Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${pendingProcs.length === 0 ? `<tr><td colspan="9"><div class="empty-state" style="padding:24px;"><div>✅</div><h3>All procurements completed</h3></div></td></tr>` :
              pendingProcs.map(p => `
              <tr>
                <td><span class="proc-id-badge">${sanitize(p.id)}</span></td>
                <td class="text-sm">${sanitize(p.farmerName)}<br><span class="text-muted" style="font-size:0.68rem;">${sanitize(p.farmerId)}</span></td>
                <td><strong>${sanitize(p.cropName)}</strong></td>
                <td>${(p.actualQuantityKg || 0).toLocaleString("en-IN")}</td>
                <td class="text-sm">${sanitize(p.centreName)}</td>
                <td class="text-sm">${formatDateOnly(p.slotDate)}</td>
                <td>${procStatusBadge(p.procurementStatus)}</td>
                <td>${statusBadge(p.paymentStatus)}</td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="openAdminUpdatePanel('${sanitize(p.id)}')">✏️ Update</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Stage Update Modal (opened inline) -->
    <div id="admin-update-panel"></div>
  `;
}

function adminSearchFarmer() {
  const q = (document.getElementById("admin-farmer-search")?.value || "").trim().toLowerCase();
  if (!q) { showToast("Please enter a Farmer ID or name.", "warning"); return; }

  const farmer = store.farmers.find(f =>
    f.id.toLowerCase() === q ||
    f.id.toLowerCase().includes(q) ||
    f.name.toLowerCase().includes(q)
  );

  const resultEl = document.getElementById("admin-farmer-result");
  if (!resultEl) return;

  if (!farmer) {
    resultEl.innerHTML = `<div class="alert alert-warning">⚠️ No farmer found matching "<strong>${sanitize(q)}</strong>". Please check the Farmer ID and try again.</div>`;
    return;
  }

  const farmerProcs = store.procurements.filter(p => p.farmerId === farmer.id);

  resultEl.innerHTML = `
    <div class="admin-farmer-overview" style="margin-bottom:16px;">
      <div>
        <h3>🧑‍🌾 ${sanitize(farmer.name)}</h3>
        <p>${sanitize(farmer.id)} &nbsp;|&nbsp; ${sanitize(farmer.village)}, ${sanitize(farmer.district)}, ${sanitize(farmer.state)}</p>
        <p>📞 ${sanitize(farmer.phone)} &nbsp;|&nbsp; 🏦 ${sanitize(farmer.bankDetails.bankName)} (${sanitize(farmer.bankDetails.accountMasked)}) &nbsp;|&nbsp; IFSC: ${sanitize(farmer.bankDetails.ifsc)}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:1.5rem;font-weight:800;">${farmerProcs.length}</div>
        <div style="font-size:0.8rem;opacity:.8;">Total Records</div>
      </div>
    </div>
    <div class="admin-proc-cards">
      ${farmerProcs.length === 0 ? "<p class='text-muted'>No procurement records for this farmer.</p>" :
        farmerProcs.map(p => `
        <div class="admin-proc-card ${_adminSelectedProcId === p.id ? 'selected' : ''}" onclick="openAdminUpdatePanel('${sanitize(p.id)}')">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <span class="proc-id-badge">${sanitize(p.id)}</span><br>
              <strong style="font-size:0.9rem;">${sanitize(p.cropName)}</strong> — ${sanitize(p.variety || "")}
            </div>
            ${procStatusBadge(p.procurementStatus)}
          </div>
          <div class="text-sm text-muted">📦 ${(p.actualQuantityKg||0).toLocaleString("en-IN")} kg &nbsp;|&nbsp; ${formatCurrency(p.totalAmount)}</div>
          <div class="text-sm text-muted">📅 ${formatDateOnly(p.slotDate)} &nbsp;|&nbsp; ${sanitize(p.centreName)}</div>
          <div style="margin-top:6px;">${statusBadge(p.paymentStatus)}</div>
          <button class="btn btn-sm btn-primary" style="margin-top:10px; width:100%;">✏️ Update Stages & Payment</button>
        </div>`).join("")}
    </div>
  `;
}

function openAdminUpdatePanel(procId) {
  _adminSelectedProcId = procId;
  const proc = store.getProcurementById(procId);
  if (!proc) return;

  const pay = store.payments.find(p => p.procurementId === procId);

  // Scroll to panel
  const panel = document.getElementById("admin-update-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="admin-stage-controls" style="margin-top:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
        <div>
          <div class="section-title" style="margin-bottom:4px;"><div class="title-icon">✏️</div>Update: ${sanitize(proc.id)} — ${sanitize(proc.cropName)}</div>
          <div class="text-sm text-muted">Farmer: ${sanitize(proc.farmerName)} &nbsp;|&nbsp; ${sanitize(proc.centreName)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${procStatusBadge(proc.procurementStatus)}
          ${statusBadge(proc.paymentStatus)}
        </div>
      </div>

      <!-- Stage Controls -->
      <div class="section-title" style="font-size:0.9rem; margin-bottom:12px;">📋 Procurement Stage Updates</div>
      ${proc.stages.map(st => `
        <div class="stage-control-item" id="stage-row-${st.stageId}">
          <div class="stage-left">
            <div class="stage-num ${st.status === 'Completed' ? 'done' : st.status === 'In Progress' ? 'cur' : 'pend'}">${st.status === 'Completed' ? '✓' : st.stageId}</div>
            <div class="stage-text">
              <h4>Stage ${st.stageId}: ${sanitize(st.stageName)}</h4>
              <p>${statusBadge(st.status)} ${st.completedAt ? `· ${formatDate(st.completedAt)}` : ""}</p>
            </div>
          </div>
          <div class="stage-actions">
            ${st.status !== "Completed" ? `
              <button class="btn btn-sm btn-primary" onclick="openStageUpdateModal(${st.stageId}, '${sanitize(procId)}')">
                ✏️ Update Stage
              </button>` : `
              <button class="btn btn-sm btn-secondary" disabled>✅ Done</button>
              <button class="btn btn-sm btn-outline-green" onclick="openStageUpdateModal(${st.stageId}, '${sanitize(procId)}')">📝 Edit Remarks</button>
            `}
          </div>
        </div>`).join("")}

      <!-- Payment Update Section -->
      <div class="divider"></div>
      <div class="section-title" style="font-size:0.9rem; margin-bottom:12px;">💳 Payment Status Update</div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px; margin-bottom:16px;">
        <div class="payment-card"><div class="payment-card-label">Total Value</div><div class="payment-card-value" style="font-size:1rem;">${formatCurrency(pay ? pay.totalValue : proc.totalAmount)}</div></div>
        <div class="payment-card success"><div class="payment-card-label">Paid</div><div class="payment-card-value success" style="font-size:1rem;">${formatCurrency(pay ? pay.amountPaid : 0)}</div></div>
        <div class="payment-card pending"><div class="payment-card-label">Pending</div><div class="payment-card-value pending" style="font-size:1rem;">${formatCurrency(pay ? pay.pendingAmount : proc.totalAmount)}</div></div>
        <div class="payment-card"><div class="payment-card-label">Current Status</div><div style="margin-top:6px;">${statusBadge(proc.paymentStatus)}</div></div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-info" onclick="openPaymentUpdateModal('${sanitize(procId)}')">💳 Update Payment Status</button>
        <button class="btn btn-sm btn-secondary" onclick="document.getElementById('admin-update-panel').innerHTML=''">✕ Close Panel</button>
      </div>
    </div>
  `;

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- Stage Update Modal ----
function openStageUpdateModal(stageId, procId) {
  const proc = store.getProcurementById(procId);
  if (!proc) return;
  const stage = proc.stages.find(s => s.stageId === stageId);
  if (!stage) return;

  document.getElementById("modal-stage-update-body").innerHTML = `
    <input type="hidden" id="su-proc-id" value="${sanitize(procId)}">
    <input type="hidden" id="su-stage-id" value="${stageId}">
    <div class="alert alert-info" style="margin-bottom:12px;">
      📋 Updating <strong>Stage ${stageId}: ${sanitize(stage.stageName)}</strong><br>
      <span class="text-sm">Current Status: ${statusBadge(stage.status)}</span>
    </div>
    <div class="form-group">
      <label class="form-label">New Status <span class="required">*</span></label>
      <select id="su-status" class="form-control">
        <option value="In Progress" ${stage.status === "In Progress" ? "selected":""}>In Progress</option>
        <option value="Completed" ${stage.status === "Completed" ? "selected":""}>Completed</option>
        <option value="Pending">Pending</option>
      </select>
    </div>
    ${stageId === 5 ? `
    <div class="form-group">
      <label class="form-label">Actual Quantity Weighed (kg) <span class="required">*</span></label>
      <input type="number" id="su-actual-qty" class="form-control" placeholder="Enter verified net weight in kg" value="${proc.actualQuantityKg || ""}">
      <div class="form-error" style="margin-top:4px;color:var(--grey-600);">This updates the final procurement value based on actual weight.</div>
    </div>` : ""}
    <div class="form-group">
      <label class="form-label">Relevant Information / Details</label>
      <input type="text" id="su-info" class="form-control" placeholder="Grade, moisture %, UTR, slip number…" value="${sanitize(stage.relevantInfo && stage.relevantInfo !== '-' ? stage.relevantInfo : "")}">
    </div>
    <div class="form-group">
      <label class="form-label">Official Remarks <span class="required">*</span></label>
      <textarea id="su-remarks" class="form-control" placeholder="Enter official remarks for this stage update…" rows="3">${sanitize(stage.remarks && stage.remarks !== '-' ? stage.remarks : "")}</textarea>
    </div>
  `;
  openModal("modal-stage-update");
}

async function submitStageUpdate() {
  const procId   = document.getElementById("su-proc-id")?.value;
  const stageId  = parseInt(document.getElementById("su-stage-id")?.value);
  const status   = document.getElementById("su-status")?.value;
  const info     = document.getElementById("su-info")?.value?.trim();
  const remarks  = document.getElementById("su-remarks")?.value?.trim();
  const actualQty = document.getElementById("su-actual-qty")?.value;

  if (!status) { showToast("Please select a status.", "error"); return; }
  if (!remarks) { showToast("Please enter official remarks.", "error"); return; }
  if (stageId === 5 && (!actualQty || parseFloat(actualQty) <= 0)) {
    showToast("Please enter the actual weighed quantity.", "error"); return;
  }

  const btn = document.getElementById("btn-submit-stage");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  try {
    await store.updateStage(procId, stageId, status, remarks, info, actualQty ? parseFloat(actualQty) : null);
    closeModal("modal-stage-update");
    showToast(`✅ Stage ${stageId} updated to "${status}" successfully.`, "success");
    renderAdminDashboard();
    renderFarmerDashboard();
    renderProcurementTracking();
    renderPaymentTracking();
    renderNotificationsPanel();
    renderNotificationsPage();
    // Reopen the update panel for the same procurement
    setTimeout(() => {
      openAdminUpdatePanel(procId);
    }, 200);
  } catch (err) {
    showToast("Failed to update stage. Please try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Save Update"; }
  }
}

// ---- Payment Update Modal ----
function openPaymentUpdateModal(procId) {
  const pay = store.payments.find(p => p.procurementId === procId);
  const proc = store.getProcurementById(procId);
  if (!pay) { showToast("Payment record not found.", "error"); return; }

  document.getElementById("modal-payment-update-body").innerHTML = `
    <input type="hidden" id="pu-proc-id" value="${sanitize(procId)}">
    <div class="alert alert-info" style="margin-bottom:12px;">
      💳 Updating payment for <strong>${sanitize(proc ? proc.cropName : procId)}</strong><br>
      Amount: <strong>${formatCurrency(pay.totalValue)}</strong> &nbsp;•&nbsp; Current: ${statusBadge(pay.status)}
    </div>
    <div class="alert alert-warning" style="margin-bottom:12px; font-size:0.8rem;">
      ⚠️ <strong>Important:</strong> Only update payment status after verifying with PFMS portal and bank confirmation. Do not confirm payments without actual bank credit verification.
    </div>
    <div class="form-group">
      <label class="form-label">Payment Status <span class="required">*</span></label>
      <select id="pu-status" class="form-control">
        <option value="Payment Pending" ${pay.status === "Payment Pending" ? "selected":""}>Payment Pending</option>
        <option value="Payment Processing" ${pay.status === "Payment Processing" ? "selected":""}>Payment Processing</option>
        <option value="Payment Successful" ${pay.status === "Payment Successful" ? "selected":""}>Payment Successful</option>
        <option value="Payment Failed" ${pay.status === "Payment Failed" ? "selected":""}>Payment Failed</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Bank Reference / UTR No.</label>
        <input type="text" id="pu-bank-ref" class="form-control" placeholder="SBI24101298412" value="${sanitize(pay.bankReferenceNo && !pay.bankReferenceNo.startsWith('PENDING') && !pay.bankReferenceNo.startsWith('NOT') ? pay.bankReferenceNo : "")}">
      </div>
      <div class="form-group">
        <label class="form-label">Transaction ID</label>
        <input type="text" id="pu-txn-id" class="form-control" placeholder="TXN-2024-XXXXX" value="${sanitize(pay.transactionId || "")}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Payment Method</label>
      <select id="pu-method" class="form-control">
        <option>Direct Benefit Transfer (DBT-PFMS)</option>
        <option>Aadhaar Payment Bridge (APBS)</option>
        <option>NEFT / RTGS (State Procurement Fund)</option>
        <option>Cooperative Bank Transfer</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Official Remarks <span class="required">*</span></label>
      <textarea id="pu-remarks" class="form-control" placeholder="Enter payment processing remarks, clearing reference, etc." rows="3">${sanitize(pay.remarks || "")}</textarea>
    </div>
  `;
  openModal("modal-payment-update");
}

async function submitPaymentUpdate() {
  const procId  = document.getElementById("pu-proc-id")?.value;
  const status  = document.getElementById("pu-status")?.value;
  const bankRef = document.getElementById("pu-bank-ref")?.value?.trim();
  const txnId   = document.getElementById("pu-txn-id")?.value?.trim();
  const method  = document.getElementById("pu-method")?.value;
  const remarks = document.getElementById("pu-remarks")?.value?.trim();

  if (!status) { showToast("Please select a payment status.", "error"); return; }
  if (!remarks) { showToast("Please enter official remarks.", "error"); return; }
  if (status === "Payment Successful" && !bankRef) {
    showToast("Bank Reference / UTR number is required for successful payment.", "error"); return;
  }

  const btn = document.getElementById("btn-submit-payment");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  try {
    await store.updatePayment(procId, status, bankRef, txnId, method, remarks);
    closeModal("modal-payment-update");
    showToast(`💳 Payment status updated to "${status}".`, "success");
    renderAdminDashboard();
    renderFarmerDashboard();
    renderPaymentTracking();
    renderNotificationsPanel();
    renderNotificationsPage();
    setTimeout(() => openAdminUpdatePanel(procId), 200);
  } catch (err) {
    showToast("Failed to update payment. Please try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Update Payment"; }
  }
}
