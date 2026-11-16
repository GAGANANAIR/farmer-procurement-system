/**
 * e-Krishi Store & State Management
 * Handles API persistence with seamless LocalStorage offline fallback & reactive events
 */

class KrishiStore {
  constructor() {
    this.apiBase = window.location.origin.includes("5000") || window.location.origin.includes("5050") 
      ? "/api" 
      : null;
    this.subscribers = [];
    this.currentRole = "farmer"; // 'farmer' or 'admin'
    this.currentFarmerId = "FAR-MH-2024-8841";
    this.currentAdminId = "ADM-001";
    this.selectedProcurementId = null;
    this.isOnlineServer = false;

    // Cache
    this.farmers = [];
    this.procurements = [];
    this.payments = [];
    this.notifications = [];
    this.procurementCentres = [];
    this.mspRates = [];
  }

  async init() {
    // 1. Try checking if local REST API server is responsive
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        this.apiBase = "/api";
        this.isOnlineServer = true;
      }
    } catch (e) {
      this.apiBase = null;
      this.isOnlineServer = false;
    }

    // 2. Load from API or LocalStorage/SeedData
    if (this.isOnlineServer) {
      await this.loadFromApi();
    } else {
      this.loadFromStorage();
    }

    // Auto select first procurement if available
    const myProcs = this.getProcurements();
    if (myProcs.length > 0) {
      this.selectedProcurementId = myProcs[0].id;
    }

    this.notify("init");
  }

  loadFromStorage() {
    const saved = localStorage.getItem("ekrishi_db_v1");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.farmers = data.farmers || SEED_DATA.farmers;
        this.procurements = data.procurements || SEED_DATA.procurements;
        this.payments = data.payments || SEED_DATA.payments;
        this.notifications = data.notifications || SEED_DATA.notifications;
        this.procurementCentres = data.procurementCentres || SEED_DATA.procurementCentres;
        this.mspRates = data.mspRates || SEED_DATA.mspRates;
        return;
      } catch (e) {
        console.error("Storage corrupted, resetting to seed data", e);
      }
    }
    // Seed default
    this.farmers = JSON.parse(JSON.stringify(SEED_DATA.farmers));
    this.procurements = JSON.parse(JSON.stringify(SEED_DATA.procurements));
    this.payments = JSON.parse(JSON.stringify(SEED_DATA.payments));
    this.notifications = JSON.parse(JSON.stringify(SEED_DATA.notifications));
    this.procurementCentres = JSON.parse(JSON.stringify(SEED_DATA.procurementCentres));
    this.mspRates = JSON.parse(JSON.stringify(SEED_DATA.mspRates));
    this.persistLocal();
  }

  persistLocal() {
    const data = {
      farmers: this.farmers,
      procurements: this.procurements,
      payments: this.payments,
      notifications: this.notifications,
      procurementCentres: this.procurementCentres,
      mspRates: this.mspRates
    };
    localStorage.setItem("ekrishi_db_v1", JSON.stringify(data));
  }

  async loadFromApi() {
    try {
      const [fRes, pRes, payRes, nRes, cRes, mRes] = await Promise.all([
        fetch("/api/farmers"),
        fetch("/api/procurements"),
        fetch("/api/payments"),
        fetch("/api/notifications"),
        fetch("/api/centres"),
        fetch("/api/msp")
      ]);

      if (fRes.ok) this.farmers = await fRes.json();
      if (pRes.ok) this.procurements = await pRes.json();
      if (payRes.ok) this.payments = await payRes.json();
      if (nRes.ok) this.notifications = await nRes.json();
      if (cRes.ok) this.procurementCentres = await cRes.json();
      if (mRes.ok) this.mspRates = await mRes.json();
    } catch (e) {
      console.warn("API load failed, falling back to local storage:", e);
      this.loadFromStorage();
    }
  }

  subscribe(listener) {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.subscribers.forEach(cb => {
      try { cb(event, payload); } catch (err) { console.error("Subscriber error", err); }
    });
  }

  setRole(role) {
    this.currentRole = role;
    this.notify("role_changed", role);
  }

  setFarmer(farmerId) {
    this.currentFarmerId = farmerId;
    const myProcs = this.getProcurements();
    if (myProcs.length > 0) {
      this.selectedProcurementId = myProcs[0].id;
    } else {
      this.selectedProcurementId = null;
    }
    this.notify("farmer_changed", farmerId);
  }

  getCurrentFarmer() {
    return this.farmers.find(f => f.id === this.currentFarmerId) || this.farmers[0];
  }

  getCurrentAdmin() {
    return SEED_DATA.adminUsers.find(a => a.id === this.currentAdminId) || SEED_DATA.adminUsers[0];
  }

  getProcurements(forActiveFarmerOnly = true) {
    if (this.currentRole === "admin" && !forActiveFarmerOnly) {
      return this.procurements;
    }
    return this.procurements.filter(p => p.farmerId === this.currentFarmerId);
  }

  getProcurementById(id) {
    return this.procurements.find(p => p.id === id) || null;
  }

  setSelectedProcurement(id) {
    this.selectedProcurementId = id;
    this.notify("procurement_selected", id);
  }

  getPayments(forActiveFarmerOnly = true) {
    if (this.currentRole === "admin" && !forActiveFarmerOnly) {
      return this.payments;
    }
    return this.payments.filter(p => p.farmerId === this.currentFarmerId);
  }

  getNotifications() {
    return this.notifications.filter(n => n.farmerId === this.currentFarmerId);
  }

  async markAllNotificationsRead() {
    this.notifications.forEach(n => {
      if (n.farmerId === this.currentFarmerId) {
        n.isRead = true;
      }
    });

    if (this.isOnlineServer) {
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farmerId: this.currentFarmerId })
        });
      } catch (e) {}
    } else {
      this.persistLocal();
    }
    this.notify("notifications_updated");
  }

  async createProcurement(data) {
    const farmer = this.getCurrentFarmer();
    const estQty = parseFloat(data.estimatedQuantityKg) || 1000;
    const msp = parseFloat(data.mspPerQuintal) || 2275;
    const totAmount = Math.round((estQty / 100.0) * msp);

    const centre = this.procurementCentres.find(c => c.id === data.procurementCentreId) || { name: "Karnal Central APMC Mandi" };
    const nowStr = new Date().toISOString();
    const newId = `PRC-2024-${Math.floor(1000 + Math.random() * 9000)}`;

    const stages = STAGES_CONFIG.map((cfg, idx) => ({
      stageId: cfg.id,
      stageName: cfg.name,
      status: idx === 0 ? "Completed" : idx === 1 ? "In Progress" : "Pending",
      completedAt: idx === 0 ? nowStr : null,
      officer: idx === 0 ? "Self (Online Farmer Portal)" : idx === 1 ? "APMC Automated Scheduler" : "-",
      relevantInfo: idx === 0 ? `Crop: ${data.cropName} | Est. Qty: ${estQty} kg` : idx === 1 ? `Requested Slot: ${data.slotDate}, ${data.slotTime}` : "-",
      remarks: idx === 0 ? "Registration submitted successfully. Awaiting gate slot approval." : "-"
    }));

    const newProc = {
      id: newId,
      farmerId: farmer.id,
      farmerName: farmer.name,
      cropName: data.cropName,
      variety: data.variety || "FAQ High Yield",
      estimatedQuantityKg: estQty,
      actualQuantityKg: estQty,
      mspPerQuintal: msp,
      totalAmount: totAmount,
      procurementCentreId: data.procurementCentreId,
      centreName: centre.name,
      slotDate: data.slotDate,
      slotTime: data.slotTime,
      weighingDate: null,
      currentStageIndex: 2,
      procurementStatus: "In Progress",
      paymentStatus: "Payment Pending",
      vehicleNumber: data.vehicleNumber || "MH-10-AZ-1122",
      tokenNumber: `TKN-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: nowStr,
      updatedAt: nowStr,
      stages: stages
    };

    const newPay = {
      id: `PAY-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      procurementId: newId,
      farmerId: farmer.id,
      farmerName: farmer.name,
      cropName: data.cropName,
      totalValue: totAmount,
      amountPaid: 0,
      pendingAmount: totAmount,
      transactionId: `TXN-2024-${Math.floor(10000 + Math.random() * 90000)}`,
      paymentDate: null,
      paymentMethod: "Direct Benefit Transfer (DBT-PFMS)",
      bankReferenceNo: "PENDING-PROCUREMENT",
      beneficiaryAccount: `${farmer.bankDetails.bankName} (${farmer.bankDetails.accountMasked})`,
      status: "Payment Pending",
      remarks: "New slot booked. Payment will be initiated after weighing and approval."
    };

    const newNotif = {
      id: `NOTIF-${Math.floor(1000 + Math.random() * 9000)}`,
      farmerId: farmer.id,
      procurementId: newId,
      type: "SLOT_CONFIRMED",
      title: "Procurement Slot Booked",
      message: `Your booking for ${data.cropName} (${estQty} kg) on ${data.slotDate} at ${centre.name} has been placed.`,
      channel: "In-App & SMS",
      isRead: false,
      createdAt: nowStr
    };

    if (this.isOnlineServer) {
      try {
        const res = await fetch("/api/procurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmerId: farmer.id,
            farmerName: farmer.name,
            cropName: data.cropName,
            variety: data.variety,
            estimatedQuantityKg: estQty,
            mspPerQuintal: msp,
            procurementCentreId: data.procurementCentreId,
            slotDate: data.slotDate,
            slotTime: data.slotTime,
            vehicleNumber: data.vehicleNumber
          })
        });
        if (res.ok) {
          const resData = await res.json();
          await this.loadFromApi();
          this.selectedProcurementId = resData.procurement.id;
          this.notify("procurement_created", resData.procurement);
          return resData.procurement;
        }
      } catch (e) {
        console.warn("API create failed, falling back to local storage:", e);
      }
    }

    // Local fallback
    this.procurements.unshift(newProc);
    this.payments.unshift(newPay);
    this.notifications.unshift(newNotif);
    this.selectedProcurementId = newId;
    this.persistLocal();
    this.notify("procurement_created", newProc);
    return newProc;
  }

  async updateStage(procId, stageId, status, remarks, relevantInfo, actualQty) {
    const stageNum = parseInt(stageId);
    const proc = this.getProcurementById(procId);
    if (!proc) return false;

    if (this.isOnlineServer) {
      try {
        const res = await fetch(`/api/procurements/${procId}/stage`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: stageNum,
            status: status,
            remarks: remarks,
            relevantInfo: relevantInfo,
            actualQuantityKg: actualQty,
            officer: this.getCurrentAdmin().name
          })
        });
        if (res.ok) {
          await this.loadFromApi();
          this.notify("stage_updated", { procId, stageId });
          return true;
        }
      } catch (e) {
        console.warn("API updateStage failed, falling back to local:", e);
      }
    }

    // Local Update
    const nowStr = new Date().toISOString();
    proc.stages.forEach(st => {
      if (st.stageId === stageNum) {
        st.status = status;
        if (status === "Completed") st.completedAt = nowStr;
        if (remarks) st.remarks = remarks;
        if (relevantInfo) st.relevantInfo = relevantInfo;
        st.officer = this.getCurrentAdmin().name;
      } else if (st.stageId < stageNum && status === "Completed") {
        if (st.status !== "Completed") {
          st.status = "Completed";
          if (!st.completedAt) st.completedAt = nowStr;
        }
      } else if (st.stageId === stageNum + 1 && status === "Completed") {
        if (st.status === "Pending") st.status = "In Progress";
      }
    });

    if (status === "Completed") {
      proc.currentStageIndex = Math.min(8, stageNum + 1);
      proc.procurementStatus = stageNum >= 6 ? "Completed" : "In Progress";
    } else {
      proc.currentStageIndex = stageNum;
      proc.procurementStatus = "In Progress";
    }

    if (stageNum === 5 && actualQty) {
      proc.actualQuantityKg = parseFloat(actualQty);
      proc.weighingDate = new Date().toISOString().split("T")[0];
      proc.totalAmount = Math.round((proc.actualQuantityKg / 100.0) * proc.mspPerQuintal);
      const pay = this.payments.find(p => p.procurementId === procId);
      if (pay) {
        pay.totalValue = proc.totalAmount;
        pay.pendingAmount = Math.max(0, proc.totalAmount - pay.amountPaid);
      }
    }

    if (stageNum === 7 && status === "Completed") {
      proc.paymentStatus = "Payment Processing";
      const pay = this.payments.find(p => p.procurementId === procId);
      if (pay) pay.status = "Payment Processing";
    } else if (stageNum === 8 && status === "Completed") {
      proc.paymentStatus = "Payment Successful";
      const pay = this.payments.find(p => p.procurementId === procId);
      if (pay) {
        pay.status = "Payment Successful";
        pay.amountPaid = pay.totalValue;
        pay.pendingAmount = 0;
        pay.paymentDate = nowStr;
        pay.bankReferenceNo = `SBI${Date.now().toString().slice(-10)}`;
      }
    }

    proc.updatedAt = nowStr;

    // In-app Notification
    const notifTypeMap = {
      2: "SLOT_CONFIRMED",
      3: "ARRIVAL",
      4: "QUALITY",
      5: "WEIGHING",
      6: "APPROVED",
      7: "PAYMENT_INITIATED",
      8: "PAYMENT_SUCCESS"
    };

    const notif = {
      id: `NOTIF-${Math.floor(1000 + Math.random() * 9000)}`,
      farmerId: proc.farmerId,
      procurementId: proc.id,
      type: notifTypeMap[stageNum] || "GENERAL",
      title: `${STAGES_CONFIG[stageNum - 1].name} (${status})`,
      message: `Procurement ${proc.id} for ${proc.cropName}: ${STAGES_CONFIG[stageNum - 1].name} updated to ${status}. ${remarks || ""}`,
      channel: "In-App & SMS",
      isRead: false,
      createdAt: nowStr
    };
    this.notifications.unshift(notif);

    this.persistLocal();
    this.notify("stage_updated", { procId, stageId });
    return true;
  }

  async updatePayment(procId, status, bankRef, txnId, method, remarks) {
    const proc = this.getProcurementById(procId);
    const pay = this.payments.find(p => p.procurementId === procId);
    if (!pay) return false;

    if (this.isOnlineServer) {
      try {
        const res = await fetch(`/api/procurements/${procId}/payment`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            bankReferenceNo: bankRef,
            transactionId: txnId,
            paymentMethod: method,
            remarks
          })
        });
        if (res.ok) {
          await this.loadFromApi();
          this.notify("payment_updated", { procId, status });
          return true;
        }
      } catch (e) {
        console.warn("API updatePayment failed, using local fallback:", e);
      }
    }

    // Local update
    const nowStr = new Date().toISOString();
    pay.status = status;
    if (bankRef) pay.bankReferenceNo = bankRef;
    if (txnId) pay.transactionId = txnId;
    if (method) pay.paymentMethod = method;
    if (remarks) pay.remarks = remarks;

    if (status === "Payment Successful") {
      pay.amountPaid = pay.totalValue;
      pay.pendingAmount = 0;
      pay.paymentDate = nowStr;
      if (proc) {
        proc.paymentStatus = "Payment Successful";
        proc.currentStageIndex = 8;
        proc.stages.forEach(st => {
          if (st.stageId === 8) {
            st.status = "Completed";
            st.completedAt = nowStr;
            st.relevantInfo = `Bank Ref: ${pay.bankReferenceNo}`;
            st.remarks = "Direct Benefit Transfer (DBT) credited successfully.";
          }
        });
      }
    } else if (status === "Payment Processing") {
      if (proc) proc.paymentStatus = "Payment Processing";
    } else if (status === "Payment Failed") {
      pay.amountPaid = 0;
      pay.pendingAmount = pay.totalValue;
      if (proc) proc.paymentStatus = "Payment Failed";
    }

    const notif = {
      id: `NOTIF-${Math.floor(1000 + Math.random() * 9000)}`,
      farmerId: pay.farmerId,
      procurementId: procId,
      type: status === "Payment Successful" ? "PAYMENT_SUCCESS" : status === "Payment Failed" ? "PAYMENT_FAILED" : "PAYMENT_INITIATED",
      title: status === "Payment Successful" ? "Payment Credited Successfully" : status === "Payment Failed" ? "Payment Failed" : "Payment Processing",
      message: `Payment update for ${pay.cropName}: status is now '${status}'. ${remarks || ""}`,
      channel: "In-App & SMS",
      isRead: false,
      createdAt: nowStr
    };
    this.notifications.unshift(notif);

    this.persistLocal();
    this.notify("payment_updated", { procId, status });
    return true;
  }

  getDashboardStats() {
    const procs = this.getProcurements();
    const pays = this.getPayments();

    const totalRecords = procs.length;
    const completedProcs = procs.filter(p => p.procurementStatus === "Completed").length;
    const pendingProcs = procs.filter(p => p.procurementStatus === "Pending" || p.procurementStatus === "In Progress").length;

    let totalProcurementValue = 0;
    let totalReceived = 0;
    let pendingPayment = 0;

    pays.forEach(p => {
      totalProcurementValue += (p.totalValue || 0);
      totalReceived += (p.amountPaid || 0);
      pendingPayment += (p.pendingAmount || 0);
    });

    return {
      totalRecords,
      completedProcs,
      pendingProcs,
      totalProcurementValue,
      totalReceived,
      pendingPayment
    };
  }

  resetToDemo() {
    localStorage.removeItem("ekrishi_db_v1");
    this.loadFromStorage();
    this.notify("reset");
  }
}

// Global store instance
window.store = new KrishiStore();
