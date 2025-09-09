import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* =========================
   App / Config
========================= */
const cfg = window.__FIREBASE_CONFIG__;
if (!cfg) throw new Error("Missing window.__FIREBASE_CONFIG__ (ensure firebase-config.js defines it)");
const app = getApps().length ? getApp() : initializeApp(cfg);
const db  = getFirestore(app);

/* =========================
   Shared Helpers (Riyadh)
========================= */
const RIYADH_TZ = "Asia/Riyadh";
function nowInRiyadh() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: RIYADH_TZ }));
}
function ymd(d = nowInRiyadh()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function hm(d = nowInRiyadh()) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
function validatePhoneNumber(phone) { return /^\d{10}$/.test(phone); }

/* =========================
   Business Rules (central)
========================= */
const RULES = {
  PACKAGE_DURATION_DAYS: 52,
  /**
   * Snacks rule: always 26 snacks by default if hasSnacks is true.
   * Adjust here once and the entire app stays consistent.
   */
  snacksForPackage(meals, hasSnacks) {
    return hasSnacks ? 26 : 0;
  }
};

/* =========================
   CUSTOMERS (docId = phone)
========================= */
async function addCustomer({ name, phone }) {
  if (!validatePhoneNumber(phone)) throw new Error("رقم الهاتف يجب أن يكون 10 أرقام");
  const ref = doc(db, "customers", phone);
  await setDoc(ref, {
    name, phone,
    registrationDate: ymd(),
    status: "نشط",
    currentPackage: null,
    createdAt: serverTimestamp()
  }, { merge: true });
  return { id: phone };
}
async function getCustomerByPhone(phone) {
  const snap = await getDoc(doc(db, "customers", phone));
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}
async function getCustomerById(id) { return getCustomerByPhone(id); }
async function getCustomers() {
  const snap = await getDocs(collection(db, "customers"));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Most recent registrations first (string yyy-mm-dd sorts fine)
  items.sort((a, b) => (b.registrationDate || "").localeCompare(a.registrationDate || ""));
  return items;
}
async function updateCustomer(id, fields) {
  await updateDoc(doc(db, "customers", id), fields);
  return { id };
}
async function deleteCustomer(id) {
  await deleteDoc(doc(db, "customers", id));
  return { id };
}

/* =========================
   PACKAGES
========================= */
async function getPackages() {
  const qy = query(collection(db, "packages"), orderBy("name", "asc"));
  const snap = await getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function getPackageById(id) {
  const snap = await getDoc(doc(db, "packages", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}
async function addPackage(pkg) {
  // pkg = { name, price, meals, description, status? }
  const ref = await addDoc(collection(db, "packages"), { status: "نشط", ...pkg });
  return { id: ref.id };
}
async function updatePackage(id, fields) { await updateDoc(doc(db, "packages", id), fields); }
async function deletePackage(id) { await deleteDoc(doc(db, "packages", id)); }

/* =========================
   SUBSCRIPTIONS
========================= */
async function getSubscriptions() {
  const snap = await getDocs(collection(db, "subscriptions"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Returns most-recent active subscription for a customer (or null).
 */
async function getActiveSubscriptionByCustomerId(customerId) {
  // First get all subscriptions for the customer, then filter and sort in memory
  // This avoids the need for a composite index
  const qy = query(
    collection(db, "subscriptions"),
    where("customerId", "==", customerId)
  );
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  
  // Filter active subscriptions and sort by startDate
  const activeSubs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(sub => sub.status === "نشط")
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  
  return activeSubs.length > 0 ? activeSubs[0] : null;
}

/**
 * Create subscription with fields already computed by the caller.
 * sub = { customerId, packageId, startDate, endDate, remainingMeals, remainingSnacks, status, hasSnacks }
 */
async function createSubscription(sub) {
  const ref = await addDoc(collection(db, "subscriptions"), sub);
  return { id: ref.id };
}

/**
 * Convenience creator: computes remainingMeals/remainingSnacks from package + hasSnacks.
 * args = { customerId, packageId, startDate, endDate, hasSnacks, status? }
 */
async function createSubscriptionFromPackage(args) {
  const { customerId, packageId, startDate, endDate, hasSnacks, status = "نشط" } = args || {};
  const pkg = await getPackageById(packageId);
  if (!pkg) throw new Error("Package not found");
  const remainingMeals = Number(pkg.meals || 0);
  const remainingSnacks = RULES.snacksForPackage(remainingMeals, !!hasSnacks);
  const ref = await addDoc(collection(db, "subscriptions"), {
    customerId, packageId, startDate, endDate, hasSnacks, status,
    remainingMeals, remainingSnacks
  });
  return { id: ref.id };
}

async function updateSubscription(id, fields) { await updateDoc(doc(db, "subscriptions", id), fields); }
async function deleteSubscription(id) { await deleteDoc(doc(db, "subscriptions", id)); }

/* =========================
   DAILY REGISTRATIONS
========================= */
async function addDailyRegistration({ customerId, meals = 0, snacks = 0, notes = "" }) {
  // Write registration
  const reg = {
    customerId,
    date: ymd(),
    time: hm(),
    mealType: meals > 0 ? "Meals" : "",
    snackType: snacks > 0 ? "Snacks" : "",
    meals, snacks, notes
  };
  const ref = await addDoc(collection(db, "dailyRegistrations"), reg);

  // Decrement counters on the active subscription (if any)
  const sub = await getActiveSubscriptionByCustomerId(customerId);
  if (sub) {
    const fields = {};
    if (meals > 0)  fields.remainingMeals  = Math.max(0, Number(sub.remainingMeals || 0)  - meals);
    if (snacks > 0) fields.remainingSnacks = Math.max(0, Number(sub.remainingSnacks || 0) - snacks);
    if (Object.keys(fields).length) await updateSubscription(sub.id, fields);
  }

  return { id: ref.id };
}

async function deleteDailyRegistration(id) {
  // Read to restore counters
  const rRef = doc(db, "dailyRegistrations", id);
  const rSnap = await getDoc(rRef);
  if (rSnap.exists()) {
    const r = rSnap.data();
    const sub = await getActiveSubscriptionByCustomerId(r.customerId);
    if (sub) {
      const fields = {};
      if (r.meals  > 0) fields.remainingMeals  = Number(sub.remainingMeals  || 0) + r.meals;
      if (r.snacks > 0) fields.remainingSnacks = Number(sub.remainingSnacks || 0) + r.snacks;
      if (Object.keys(fields).length) await updateSubscription(sub.id, fields);
    }
  }
  await deleteDoc(rRef);
  return { id };
}

async function getDailyRegistrations(limitCount = 200) {
  const qy = query(collection(db, "dailyRegistrations"), orderBy("date", "desc"), limit(limitCount));
  const snap = await getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function listDailyRegistrationsByDate(dateStr) {
  // Use a simpler query to avoid composite index requirement
  const qy = query(
    collection(db, "dailyRegistrations"),
    where("date", "==", dateStr)
  );
  const snap = await getDocs(qy);
  const registrations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Sort by time in memory instead of using orderBy in the query
  return registrations.sort((a, b) => {
    const timeA = a.time || "00:00";
    const timeB = b.time || "00:00";
    return timeA.localeCompare(timeB);
  });
}
async function getTodayRegistrations() { return listDailyRegistrationsByDate(ymd()); }

/** Convenience: latest N registrations for a customer */
async function listDailyRegistrationsByCustomer(customerId, limitCount = 50) {
  const all = await getDailyRegistrations(1000);
  return all
    .filter(r => r.customerId === customerId)
    .sort((a, b) => new Date(`${b.date} ${b.time || "00:00"}`) - new Date(`${a.date} ${a.time || "00:00"}`))
    .slice(0, limitCount);
}

/** Convenience: registrations filtered by date window (inclusive) & optional customer */
async function listDailyRegistrationsBetween(startDate, endDate, customerId = null) {
  const all = await getDailyRegistrations(2000);
  return all.filter(r => {
    const inRange = r.date >= startDate && r.date <= endDate;
    const byCustomer = customerId ? r.customerId === customerId : true;
    return inRange && byCustomer;
  });
}

/* =========================
   ACTIVITIES
========================= */
async function logActivity({ type, customerId = null, description, date = ymd(), time = hm(), time24 = hm() }) {
  const ref = await addDoc(collection(db, "activities"), { type, customerId, description, date, time, time24 });
  return { id: ref.id };
}
async function getActivities(limitCount = 500) {
  const snap = await getDocs(collection(db, "activities"));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Prefer time24 when present for consistent sorting
  items.sort((a, b) => {
    const ta = `${a.date || ""} ${(a.time24 || a.time || "00:00")}`;
    const tb = `${b.date || ""} ${(b.time24 || b.time || "00:00")}`;
    return new Date(tb) - new Date(ta);
  });
  return items.slice(0, limitCount);
}

/* =========================
   DASHBOARD STATS
========================= */
async function getDashboardStats() {
  const [customers, subscriptions, packagesList, todayRegs] = await Promise.all([
    getCustomers(),
    getSubscriptions(),
    getPackages(),
    getTodayRegistrations()
  ]);
  const activeSubscriptions = subscriptions.filter(s => s.status === "نشط").length;
  const todayMealsCollected = todayRegs.reduce((sum, r) => sum + Number(r.meals || 0), 0);
  return {
    totalCustomers: customers.length,
    activeSubscriptions,
    totalPackages: packagesList.length,
    todayRegistrations: todayRegs.length,
    todayMealsCollected
  };
}

/* =========================
   Public API (global)
========================= */
window.firebaseDB_instance = {
  // Flags
  isOnline: true,

  // Rules (exposed for UI pages that need constants)
  RULES,

  // Validators
  validatePhoneNumber,

  // Customers
  addCustomer, getCustomerByPhone, getCustomerById, getCustomers, updateCustomer, deleteCustomer,

  // Packages
  getPackages, getPackageById, addPackage, updatePackage, deletePackage,

  // Subscriptions
  getSubscriptions, getActiveSubscriptionByCustomerId,
  createSubscription, createSubscriptionFromPackage, updateSubscription, deleteSubscription,

  // Daily
  addDailyRegistration, deleteDailyRegistration,
  getDailyRegistrations, listDailyRegistrationsByDate, getTodayRegistrations,
  listDailyRegistrationsByCustomer, listDailyRegistrationsBetween,

  // Activities & Dashboard
  logActivity, getActivities, getDashboardStats
};