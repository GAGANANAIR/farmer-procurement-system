/**
 * Procurement History Table Component
 */

let _historySearchQ = "";
let _historyFilters = { crop: "", procStatus: "", payStatus: "", dateFrom: "", dateTo: "" };

function renderProcurementHistory() {
  const container = document.getElementById("page-history");
  if (!container) return;

  const allProcs = store.getProcurements();
  const crops = [...new Set(allProcs.map(p => p.cropName))];

  container.innerHTML = `
    <div class="section-title"><div class="title-icon">🗃️</div>Procurement History</div>

    <div class="table-wrapper">
      <div class="table-toolbar" style="flex-wrap:wrap; gap:10px;">
        <div class="search-wrap" style="flex:2; min-width:200px;">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="hist-search"
            placeholder="Search by ID, crop, centre…"
            oninput="onHistorySearch(this.value)">
        </div>
        <select class="table-filter" id="hist-crop" onchange="onHistoryFilterChange()">
          <option value="">All Crops</option>
          ${crops.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <select class="table-filter" id="hist-proc-status" onchange="onHistoryFilterChange()">
          <option value="">All Proc. Statuses</option>
          <option>Completed</option>
          <option>In Progress</option>
          <option>Pending</option>
        </select>
        <select class="table-filter" id="hist-pay-status" onchange="onHistoryFilterChange()">
          <option value="">All Payment Statuses</option>
          <option>Payment Successful</option>
          <option>Payment Processing</option>
          <option>Payment Pending</option>
          <option>Payment Failed</option>
        </select>
        <input type="date" class="table-filter" id="hist-date-from" onchange="onHistoryFilterChange()" title="From Date">
        <input type="date" class="table-filter" id="hist-date-to" onchange="onHistoryFilterChange()" title="To Date">
        <button class="btn btn-sm btn-secondary" onclick="clearHistoryFilters()">✕ Clear</button>
        <button class="btn btn-sm btn-primary" onclick="openNewProcurementModal()">+ New Procurement</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Procurement ID</th>
              <th>Crop</th>
              <th>Variety</th>
              <th>Qty (kg)</th>
              <th>Centre</th>
              <th>Slot Date</th>
              <th>Weighing Date</th>
              <th>Amount</th>
              <th>Proc. Status</th>
              <th>Payment Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="history-table-body">
            ${renderHistoryRows(allProcs)}
          </tbody>
        </table>
      </div>
      <div id="history-count" style="padding:10px 20px; font-size:0.78rem; color:var(--grey-600);">
        Showing ${allProcs.length} record(s)
      </div>
    </div>
  `;
}

function renderHistoryRows(procs) {
  if (!procs || procs.length === 0) {
    return `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">📭</div><h3>No procurement records match your filters</h3><p>Try clearing filters or registering a new procurement.</p></div></td></tr>`;
  }
  return procs.map(p => `
    <tr>
      <td><span class="proc-id-badge">${sanitize(p.id)}</span></td>
      <td>
        <strong>${sanitize(p.cropName)}</strong>
      </td>
      <td class="text-sm text-muted">${sanitize(p.variety || "—")}</td>
      <td>${(p.actualQuantityKg || 0).toLocaleString("en-IN")}</td>
      <td class="text-sm">${sanitize(p.centreName)}</td>
      <td class="text-sm">${formatDateOnly(p.slotDate)}</td>
      <td class="text-sm">${formatDateOnly(p.weighingDate)}</td>
      <td><strong>${formatCurrency(p.totalAmount)}</strong></td>
      <td>${procStatusBadge(p.procurementStatus)}</td>
      <td>${statusBadge(p.paymentStatus)}</td>
      <td>
        <button class="btn btn-sm btn-outline-green" onclick="viewProcurementTimeline('${sanitize(p.id)}')">🔍 View</button>
      </td>
    </tr>`).join("");
}

function getFilteredHistoryProcs() {
  const q = _historySearchQ.toLowerCase();
  const { crop, procStatus, payStatus, dateFrom, dateTo } = _historyFilters;
  return store.getProcurements().filter(p => {
    if (q && !(p.id + p.cropName + p.centreName + (p.variety || "")).toLowerCase().includes(q)) return false;
    if (crop && p.cropName !== crop) return false;
    if (procStatus && p.procurementStatus !== procStatus) return false;
    if (payStatus && p.paymentStatus !== payStatus) return false;
    if (dateFrom && p.slotDate && p.slotDate < dateFrom) return false;
    if (dateTo && p.slotDate && p.slotDate > dateTo) return false;
    return true;
  });
}

function refreshHistoryTable() {
  const filtered = getFilteredHistoryProcs();
  const tbody = document.getElementById("history-table-body");
  const count = document.getElementById("history-count");
  if (tbody) tbody.innerHTML = renderHistoryRows(filtered);
  if (count) count.textContent = `Showing ${filtered.length} record(s)`;
}

const onHistorySearch = debounce(function (val) {
  _historySearchQ = val;
  refreshHistoryTable();
}, 200);

function onHistoryFilterChange() {
  _historyFilters.crop       = document.getElementById("hist-crop")?.value || "";
  _historyFilters.procStatus = document.getElementById("hist-proc-status")?.value || "";
  _historyFilters.payStatus  = document.getElementById("hist-pay-status")?.value || "";
  _historyFilters.dateFrom   = document.getElementById("hist-date-from")?.value || "";
  _historyFilters.dateTo     = document.getElementById("hist-date-to")?.value || "";
  refreshHistoryTable();
}

function clearHistoryFilters() {
  _historySearchQ = "";
  _historyFilters = { crop: "", procStatus: "", payStatus: "", dateFrom: "", dateTo: "" };
  const fields = ["hist-search", "hist-crop", "hist-proc-status", "hist-pay-status", "hist-date-from", "hist-date-to"];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  refreshHistoryTable();
}
