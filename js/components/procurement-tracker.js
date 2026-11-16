/**
 * Procurement Tracking Timeline Component
 */

function renderProcurementTracking() {
  const container = document.getElementById("page-procurement-tracking");
  if (!container) return;

  const myProcs = store.getProcurements();
  if (myProcs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No procurement records found</h3><p>Please register a new procurement to get started.</p><br><button class="btn btn-primary" onclick="openNewProcurementModal()">+ Register New Procurement</button></div>`;
    return;
  }

  const selectedId = store.selectedProcurementId || myProcs[0].id;
  const proc = store.getProcurementById(selectedId) || myProcs[0];

  container.innerHTML = `
    <!-- Header with selector -->
    <div class="timeline-wrapper" style="margin-bottom:16px; padding: 16px 24px;">
      <div class="timeline-header" style="margin-bottom:0">
        <div class="section-title" style="margin:0"><div class="title-icon">🗓️</div>Procurement Timeline Tracker</div>
        <div class="timeline-selector">
          <span class="text-sm text-muted">Select Record:</span>
          <select id="proc-selector" onchange="onProcSelectorChange(this.value)">
            ${myProcs.map(p => `<option value="${p.id}" ${p.id === proc.id ? "selected" : ""}>${p.id} — ${p.cropName} (${p.slotDate})</option>`).join("")}
          </select>
        </div>
      </div>
    </div>

    <!-- Procurement summary chips -->
    <div class="timeline-wrapper" style="margin-bottom:16px; padding:16px 24px 10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div>
          <h3 style="font-size:1.05rem; font-weight:800; color:var(--grey-900);">${sanitize(proc.cropName)} — ${sanitize(proc.variety || "")}</h3>
          <div class="text-sm text-muted">Token: <strong>${sanitize(proc.tokenNumber)}</strong> &nbsp;|&nbsp; Vehicle: ${sanitize(proc.vehicleNumber)} &nbsp;|&nbsp; Centre: ${sanitize(proc.centreName)}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          ${procStatusBadge(proc.procurementStatus)}
          ${statusBadge(proc.paymentStatus)}
          <button class="btn btn-sm btn-outline-green" onclick="openNewProcurementModal()">+ New</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
        <div class="payment-card"><div class="payment-card-label">Quantity (Actual)</div><div class="payment-card-value" style="font-size:1.1rem;">${(proc.actualQuantityKg || 0).toLocaleString("en-IN")} kg</div></div>
        <div class="payment-card"><div class="payment-card-label">MSP Rate</div><div class="payment-card-value" style="font-size:1.1rem;">${formatCurrency(proc.mspPerQuintal)}/Qtl</div></div>
        <div class="payment-card"><div class="payment-card-label">Total Amount</div><div class="payment-card-value success" style="font-size:1.1rem;">${formatCurrency(proc.totalAmount)}</div></div>
        <div class="payment-card"><div class="payment-card-label">Slot Date</div><div class="payment-card-value" style="font-size:1rem;">${formatDateOnly(proc.slotDate)}</div></div>
      </div>
    </div>

    <!-- Stepper Overview -->
    ${renderStepperBar(proc)}

    <!-- Full Timeline -->
    <div class="timeline-wrapper">
      <div class="section-title" style="margin-bottom:16px"><div class="title-icon">📋</div>Detailed Stage-by-Stage Progress</div>
      <div class="timeline">
        ${proc.stages.map(stage => renderTimelineItem(stage)).join("")}
      </div>
    </div>
  `;
}

function renderStepperBar(proc) {
  const stages = proc.stages || [];
  return `
    <div class="timeline-wrapper" style="margin-bottom:16px; padding:16px 24px;">
      <div class="section-title" style="margin-bottom:12px"><div class="title-icon">📊</div>Progress Overview</div>
      <div style="display:flex; gap:0; align-items:flex-start; overflow-x:auto; padding-bottom:8px;">
        ${stages.map((st, i) => {
          const cls = st.status === "Completed" ? "completed" : st.status === "In Progress" ? "inprogress" : "pending";
          const bgColor = cls === "completed" ? "var(--green-500)" : cls === "inprogress" ? "var(--blue-600)" : "var(--grey-300)";
          const txtColor = cls !== "pending" ? "white" : "var(--grey-600)";
          return `
            <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:70px;position:relative;">
              ${i < stages.length - 1 ? `<div style="position:absolute;top:16px;left:50%;width:100%;height:2px;background:${cls === 'completed' ? 'var(--green-400)' : 'var(--grey-200)'};z-index:0;"></div>` : ""}
              <div style="width:32px;height:32px;border-radius:50%;background:${bgColor};color:${txtColor};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8rem;z-index:1;border:2px solid white;box-shadow:0 0 0 2px ${bgColor};">${cls === "completed" ? "✓" : cls === "inprogress" ? "⟳" : i+1}</div>
              <div style="font-size:.62rem;text-align:center;margin-top:6px;color:${cls === 'pending' ? 'var(--grey-500)' : 'var(--grey-800)'};font-weight:${cls !== 'pending' ? '700':'400'};max-width:70px;line-height:1.2;">${sanitize(st.stageName.split(" ").slice(0,2).join(" "))}</div>
            </div>`;
        }).join("")}
      </div>
    </div>`;
}

function renderTimelineItem(stage) {
  const cls = getStageClass(stage.status);
  const icon = stage.status === "Completed" ? "✓" : stage.status === "In Progress" ? "⟳" : stage.stageId;
  return `
    <div class="timeline-item ${cls}">
      <div class="timeline-dot">${icon}</div>
      <div class="timeline-item-header">
        <div class="timeline-stage-name">Stage ${stage.stageId}: ${sanitize(stage.stageName)}</div>
        <div class="timeline-status-badge">${statusBadge(stage.status)}</div>
      </div>
      <div class="timeline-meta">
        ${stage.completedAt ? `✅ Completed: ${formatDate(stage.completedAt)}` : "🕐 Not yet completed"}
        ${stage.officer && stage.officer !== "-" ? ` &nbsp;|&nbsp; 👤 ${sanitize(stage.officer)}` : ""}
      </div>
      ${stage.relevantInfo && stage.relevantInfo !== "-" ? `<div class="timeline-info">ℹ️ ${sanitize(stage.relevantInfo)}</div>` : ""}
      ${stage.remarks && stage.remarks !== "-" ? `<div class="timeline-remarks">📝 "${sanitize(stage.remarks)}"</div>` : ""}
    </div>`;
}

function onProcSelectorChange(id) {
  store.setSelectedProcurement(id);
  renderProcurementTracking();
}

// ---- New Procurement Registration Modal ----
function openNewProcurementModal() {
  const centres = store.procurementCentres;
  const mspRates = store.mspRates;

  document.getElementById("modal-new-proc-body").innerHTML = `
    <div class="alert alert-info">ℹ️ Submitting this form will register your produce for procurement and request a slot at the selected mandi.</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Crop Name <span class="required">*</span></label>
        <select id="np-crop" class="form-control" onchange="onCropSelectChange(this.value)">
          <option value="">Select Crop</option>
          ${mspRates.map(m => `<option value="${m.crop}">${m.crop} — ₹${m.mspPerQuintal}/Qtl</option>`).join("")}
          <option value="_custom">Other Crop (Enter manually)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Variety / Grade</label>
        <input type="text" id="np-variety" class="form-control" placeholder="e.g. HD-2967, FAQ Grade A">
      </div>
    </div>
    <div id="custom-crop-row" style="display:none" class="form-group">
      <label class="form-label">Enter Crop Name <span class="required">*</span></label>
      <input type="text" id="np-crop-custom" class="form-control" placeholder="Enter crop name">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Estimated Quantity (kg) <span class="required">*</span></label>
        <input type="number" id="np-qty" class="form-control" placeholder="e.g. 3000" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">MSP Rate (₹/Quintal)</label>
        <input type="number" id="np-msp" class="form-control" placeholder="Auto-filled or enter manually">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Procurement Centre <span class="required">*</span></label>
      <select id="np-centre" class="form-control">
        <option value="">Select Mandi / Procurement Centre</option>
        ${centres.map(c => `<option value="${c.id}">${c.name} — ${c.district}, ${c.state}</option>`).join("")}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Preferred Slot Date <span class="required">*</span></label>
        <input type="date" id="np-date" class="form-control" min="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Preferred Time Slot</label>
        <select id="np-time" class="form-control">
          <option>08:00 AM - 10:30 AM</option>
          <option>09:00 AM - 11:30 AM</option>
          <option>10:00 AM - 12:30 PM</option>
          <option>11:00 AM - 01:30 PM</option>
          <option>12:00 PM - 02:30 PM</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Vehicle Number (Tractor/Truck)</label>
      <input type="text" id="np-vehicle" class="form-control" placeholder="e.g. MH-10-AZ-4421">
    </div>
    <div id="np-est-amount" style="margin-top:4px; font-size:0.85rem; color:var(--green-700); font-weight:600;"></div>
  `;

  // Wire up auto-calculate
  document.getElementById("np-qty").addEventListener("input", calcEstAmount);
  document.getElementById("np-msp").addEventListener("input", calcEstAmount);

  openModal("modal-new-proc");
}

function onCropSelectChange(val) {
  const customRow = document.getElementById("custom-crop-row");
  customRow.style.display = val === "_custom" ? "block" : "none";
  // Auto-fill MSP
  const mspInput = document.getElementById("np-msp");
  const rate = store.mspRates.find(m => m.crop === val);
  if (rate) mspInput.value = rate.mspPerQuintal;
  calcEstAmount();
}

function calcEstAmount() {
  const qty = parseFloat(document.getElementById("np-qty")?.value) || 0;
  const msp = parseFloat(document.getElementById("np-msp")?.value) || 0;
  const el = document.getElementById("np-est-amount");
  if (el && qty > 0 && msp > 0) {
    const amt = Math.round((qty / 100) * msp);
    el.textContent = `📊 Estimated Procurement Value: ₹${amt.toLocaleString("en-IN")} (${qty/100} Qtl × ₹${msp}/Qtl)`;
  } else if (el) {
    el.textContent = "";
  }
}

async function submitNewProcurement() {
  const cropSel = document.getElementById("np-crop")?.value;
  const cropCustom = document.getElementById("np-crop-custom")?.value?.trim();
  const cropName = cropSel === "_custom" ? cropCustom : cropSel;
  const variety = document.getElementById("np-variety")?.value?.trim();
  const qty = document.getElementById("np-qty")?.value;
  const msp = document.getElementById("np-msp")?.value;
  const centreId = document.getElementById("np-centre")?.value;
  const slotDate = document.getElementById("np-date")?.value;
  const slotTime = document.getElementById("np-time")?.value;
  const vehicle = document.getElementById("np-vehicle")?.value?.trim();

  // Validate
  if (!cropName) { showToast("Please select or enter a crop name.", "error"); return; }
  if (!qty || parseFloat(qty) <= 0) { showToast("Please enter valid quantity.", "error"); return; }
  if (!centreId) { showToast("Please select a Procurement Centre.", "error"); return; }
  if (!slotDate) { showToast("Please select a slot date.", "error"); return; }

  const btn = document.getElementById("btn-submit-proc");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting…"; }

  try {
    await store.createProcurement({
      cropName, variety,
      estimatedQuantityKg: parseFloat(qty),
      mspPerQuintal: parseFloat(msp) || 2275,
      procurementCentreId: centreId,
      slotDate, slotTime,
      vehicleNumber: vehicle
    });
    closeModal("modal-new-proc");
    showToast("🎉 Procurement registered successfully! Slot booking in progress.", "success");
    renderProcurementTracking();
    renderFarmerDashboard();
    renderNotificationsPanel();
  } catch (err) {
    showToast("Failed to register procurement. Please try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Submit Registration"; }
  }
}
