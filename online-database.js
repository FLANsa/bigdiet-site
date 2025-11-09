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
   Caching System
========================= */
const cache = {
  data: new Map(),
  ttl: {
    stats: 5 * 60 * 1000,      // 5 minutes for stats
    activities: 5 * 60 * 1000, // 5 minutes for activities
    customers: 10 * 60 * 1000,  // 10 minutes for customers
    other: 5 * 60 * 1000        // 5 minutes for other data
  },
  
  get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }
    return item.value;
  },
  
  set(key, value, ttl = this.ttl.other) {
    this.data.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  },
  
  clear(key) {
    if (key) {
      this.data.delete(key);
    } else {
      this.data.clear();
    }
  },
  
  // Clear cache when data is modified
  invalidate(pattern) {
    if (!pattern) {
      this.data.clear();
      return;
    }
    for (const key of this.data.keys()) {
      if (key.includes(pattern)) {
        this.data.delete(key);
      }
    }
  }
};

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
  cache.invalidate('customers');
  cache.invalidate('stats');
  // Cache the new customer name
  cache.set(`customer_name_${phone}`, name, 30 * 60 * 1000);
  return { id: phone };
}
async function getCustomerByPhone(phone) {
  const snap = await getDoc(doc(db, "customers", phone));
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}
async function getCustomerById(id) { return getCustomerByPhone(id); }
async function getCustomers() {
  const cacheKey = 'customers';
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const snap = await getDocs(collection(db, "customers"));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Most recent registrations first (string yyy-mm-dd sorts fine)
  items.sort((a, b) => (b.registrationDate || "").localeCompare(a.registrationDate || ""));
  
  cache.set(cacheKey, items, cache.ttl.customers);
  return items;
}

/**
 * Get customer names map for specific customer IDs (optimized)
 * Only fetches the required customers, not all customers
 */
async function getCustomerNamesMap(customerIds) {
  if (!customerIds || customerIds.length === 0) return new Map();
  
  // Remove duplicates and nulls
  const uniqueIds = [...new Set(customerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  
  // Check cache for each customer
  const result = new Map();
  const missingIds = [];
  
  for (const id of uniqueIds) {
    const cacheKey = `customer_name_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      result.set(id, cached);
    } else {
      missingIds.push(id);
    }
  }
  
  // Fetch missing customers in parallel
  if (missingIds.length > 0) {
    const fetchPromises = missingIds.map(async (id) => {
      try {
        const customer = await getCustomerById(id);
        const name = customer ? (customer.name || '') : '';
        const cacheKey = `customer_name_${id}`;
        // Cache names for 30 minutes (they rarely change)
        cache.set(cacheKey, name, 30 * 60 * 1000);
        return { id, name };
      } catch (e) {
        console.warn(`Failed to fetch customer ${id}:`, e);
        return { id, name: '' };
      }
    });
    
    const fetched = await Promise.all(fetchPromises);
    fetched.forEach(({ id, name }) => result.set(id, name));
  }
  
  return result;
}
async function updateCustomer(id, fields) {
  await updateDoc(doc(db, "customers", id), fields);
  cache.invalidate('customers');
  cache.invalidate('stats');
  cache.invalidate(`customer_name_${id}`); // Invalidate name cache
  return { id };
}
async function deleteCustomer(id) {
  await deleteDoc(doc(db, "customers", id));
  cache.invalidate('customers');
  cache.invalidate('stats');
  return { id };
}

/* =========================
   PACKAGES
========================= */
async function getPackages() {
  const cacheKey = 'packages';
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const qy = query(collection(db, "packages"), orderBy("name", "asc"));
  const snap = await getDocs(qy);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  cache.set(cacheKey, items, cache.ttl.other);
  return items;
}
async function getPackageById(id) {
  const snap = await getDoc(doc(db, "packages", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}
async function addPackage(pkg) {
  // pkg = { name, price, meals, description, status? }
  const ref = await addDoc(collection(db, "packages"), { status: "نشط", ...pkg });
  cache.invalidate('packages');
  cache.invalidate('stats');
  return { id: ref.id };
}
async function updatePackage(id, fields) {
  await updateDoc(doc(db, "packages", id), fields);
  cache.invalidate('packages');
  cache.invalidate('stats');
}
async function deletePackage(id) {
  await deleteDoc(doc(db, "packages", id));
  cache.invalidate('packages');
  cache.invalidate('stats');
}

/* =========================
   SUBSCRIPTIONS
========================= */
async function getSubscriptions() {
  const cacheKey = 'subscriptions';
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const snap = await getDocs(collection(db, "subscriptions"));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  cache.set(cacheKey, items, cache.ttl.other);
  return items;
}

/**
 * Get count of active subscriptions (optimized query)
 * Uses Firestore where clause to filter at database level
 */
async function getActiveSubscriptionsCount() {
  const cacheKey = 'active_subscriptions_count';
  const cached = cache.get(cacheKey);
  if (cached !== null) return cached;
  
  const today = ymd();
  
  try {
    // Try to use where query for active subscriptions
    // Note: Firestore doesn't support multiple where clauses easily for this case
    // So we'll query active subscriptions and filter by date in memory
    const qy = query(
      collection(db, "subscriptions"),
      where("status", "==", "نشط")
    );
    const snap = await getDocs(qy);
    
    // Filter by endDate in memory (smaller dataset now)
    const count = snap.docs.filter(d => {
      const data = d.data();
      return !data.endDate || data.endDate >= today;
    }).length;
    
    cache.set(cacheKey, count, cache.ttl.stats);
    return count;
  } catch (error) {
    // Fallback to full fetch if query fails
    console.warn('Optimized query failed, falling back:', error);
    const all = await getSubscriptions();
    const today = ymd();
    const count = all.filter(s => 
      s.status === "نشط" && (!s.endDate || s.endDate >= today)
    ).length;
    cache.set(cacheKey, count, cache.ttl.stats);
    return count;
  }
}

/**
 * Check and expire subscriptions that have passed their endDate.
 * Marks them as "منتهي" even if they have remaining meals/snacks.
 */
async function checkAndExpireSubscriptions() {
  const today = ymd();
  const subscriptions = await getSubscriptions();
  const expired = subscriptions.filter(sub => 
    sub.status === "نشط" && sub.endDate && sub.endDate < today
  );
  
  // Update all expired subscriptions
  const updates = expired.map(sub => 
    updateSubscription(sub.id, { status: "منتهي" })
  );
  
  await Promise.all(updates);
  return expired.length;
}

/**
 * Returns most-recent active subscription for a customer (or null).
 * Excludes subscriptions that have expired (endDate < today) even if status is "نشط".
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
  
  const today = ymd();
  
  // Filter active subscriptions that haven't expired and sort by startDate
  const activeSubs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(sub => {
      // Must be active status
      if (sub.status !== "نشط") return false;
      // Must not be expired (endDate >= today)
      if (sub.endDate && sub.endDate < today) return false;
      return true;
    })
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  
  return activeSubs.length > 0 ? activeSubs[0] : null;
}

/**
 * Create subscription with fields already computed by the caller.
 * sub = { customerId, packageId, startDate, endDate, remainingMeals, remainingSnacks, status, hasSnacks }
 */
async function createSubscription(sub) {
  const ref = await addDoc(collection(db, "subscriptions"), sub);
  cache.invalidate('subscriptions');
  cache.invalidate('stats');
  cache.invalidate('active_subscriptions_count');
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

async function updateSubscription(id, fields) {
  await updateDoc(doc(db, "subscriptions", id), fields);
  cache.invalidate('subscriptions');
  cache.invalidate('stats');
  cache.invalidate('active_subscriptions_count');
}
async function deleteSubscription(id) {
  await deleteDoc(doc(db, "subscriptions", id));
  cache.invalidate('subscriptions');
  cache.invalidate('stats');
  cache.invalidate('active_subscriptions_count');
}

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
  cache.invalidate('activities');
  return { id: ref.id };
}
async function getActivities(limitCount = 500) {
  const cacheKey = `activities_all_${limitCount}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const snap = await getDocs(collection(db, "activities"));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Prefer time24 when present for consistent sorting
  items.sort((a, b) => {
    const ta = `${a.date || ""} ${(a.time24 || a.time || "00:00")}`;
    const tb = `${b.date || ""} ${(b.time24 || b.time || "00:00")}`;
    return new Date(tb) - new Date(ta);
  });
  const result = items.slice(0, limitCount);
  
  cache.set(cacheKey, result, cache.ttl.activities);
  return result;
}

/**
 * Get activities filtered by month and year (optimized query)
 * Uses date range query in Firestore for better performance
 */
async function getActivitiesByMonth(year, month, limitCount = 500) {
  // Calculate date range for the month
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
  
  const cacheKey = `activities_${year}_${month}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  // Query activities by date range
  const qy = query(
    collection(db, "activities"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  try {
    const snap = await getDocs(qy);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Sort by datetime (date + time)
    items.sort((a, b) => {
      const ta = `${a.date || ""} ${(a.time24 || a.time || "00:00")}`;
      const tb = `${b.date || ""} ${(b.time24 || b.time || "00:00")}`;
      return new Date(tb) - new Date(ta);
    });
    
    cache.set(cacheKey, items, cache.ttl.activities);
    return items;
  } catch (error) {
    // If query fails (e.g., missing index), fall back to getActivities and filter
    console.warn('Optimized query failed, falling back to full fetch:', error);
    const all = await getActivities(limitCount * 2);
    const filtered = all.filter(a => {
      if (!a.date) return false;
      const [y, m] = a.date.split('-').map(Number);
      return y === year && (m - 1) === month;
    });
    return filtered;
  }
}

/* =========================
   DASHBOARD STATS
========================= */
async function getDashboardStats() {
  const cacheKey = 'dashboard_stats';
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  // Optimize: use optimized queries in parallel
  const [customersSnap, packagesSnap, activeSubscriptions, todayRegs] = await Promise.all([
    getDocs(collection(db, "customers")),
    getDocs(collection(db, "packages")),
    getActiveSubscriptionsCount(),
    getTodayRegistrations()
  ]);
  
  const totalCustomers = customersSnap.size;
  const totalPackages = packagesSnap.size;
  const todayMealsCollected = todayRegs.reduce((sum, r) => sum + Number(r.meals || 0), 0);
  
  const stats = {
    totalCustomers,
    activeSubscriptions,
    totalPackages,
    todayRegistrations: todayRegs.length,
    todayMealsCollected
  };
  
  cache.set(cacheKey, stats, cache.ttl.stats);
  return stats;
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
  addCustomer, getCustomerByPhone, getCustomerById, getCustomers, getCustomerNamesMap, updateCustomer, deleteCustomer,

  // Packages
  getPackages, getPackageById, addPackage, updatePackage, deletePackage,

  // Subscriptions
  getSubscriptions, getActiveSubscriptionByCustomerId, getActiveSubscriptionsCount,
  createSubscription, createSubscriptionFromPackage, updateSubscription, deleteSubscription,
  checkAndExpireSubscriptions,

  // Daily
  addDailyRegistration, deleteDailyRegistration,
  getDailyRegistrations, listDailyRegistrationsByDate, getTodayRegistrations,
  listDailyRegistrationsByCustomer, listDailyRegistrationsBetween,

  // Activities & Dashboard
  logActivity, getActivities, getActivitiesByMonth, getDashboardStats,
  
  // Cache management (for debugging/clearing)
  clearCache: (pattern) => cache.invalidate(pattern)
};