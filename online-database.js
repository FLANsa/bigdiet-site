import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---- Config/App ----
const cfg = window.__FIREBASE_CONFIG__;
if (!cfg) throw new Error("Missing window.__FIREBASE_CONFIG__ (ensure firebase-config.js defines it)");
const app = getApps().length ? getApp() : initializeApp(cfg);
const db  = getFirestore(app);

// ---- Helpers (Riyadh time) ----
function nowInRiyadh() { return new Date(new Date().toLocaleString("en-US",{ timeZone:"Asia/Riyadh" })); }
function ymd(d=nowInRiyadh()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;}
function hm(d=nowInRiyadh()){const h=String(d.getHours()).padStart(2,"0"),m=String(d.getMinutes()).padStart(2,"0");return `${h}:${m}`;}
function validatePhoneNumber(phone){return /^\d{10}$/.test(phone);}

// ================= CUSTOMERS (docId = phone) =================
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
  const snap = await getDoc(doc(db,"customers", phone));
  return snap.exists() ? ({ id:snap.id, ...snap.data() }) : null;
}
async function getCustomerById(id){ return getCustomerByPhone(id); }
async function getCustomers(){
  const snap = await getDocs(collection(db,"customers"));
  const items = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  items.sort((a,b)=>(b.registrationDate||"").localeCompare(a.registrationDate||""));
  return items;
}
async function updateCustomer(id, fields){ await updateDoc(doc(db,"customers", id), fields); return { id }; }
async function deleteCustomer(id){ await deleteDoc(doc(db,"customers", id)); return { id }; }

// ================= PACKAGES =================
async function getPackages(){
  const q = query(collection(db,"packages"), orderBy("name","asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}
async function getPackageById(id){
  const snap = await getDoc(doc(db,"packages", id));
  return snap.exists()?({ id:snap.id, ...snap.data() }):null;
}
async function addPackage(pkg){
  // pkg = { name, price, meals, description, status? }
  const ref = await addDoc(collection(db,"packages"), { status:"نشط", ...pkg });
  return { id: ref.id };
}
async function updatePackage(id, fields){ await updateDoc(doc(db,"packages", id), fields); }
async function deletePackage(id){ await deleteDoc(doc(db,"packages", id)); }

// ================= SUBSCRIPTIONS =================
async function getSubscriptions(){
  const snap = await getDocs(collection(db,"subscriptions"));
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}
async function getActiveSubscriptionByCustomerId(customerId){
  const q = query(
    collection(db,"subscriptions"),
    where("customerId","==",customerId),
    where("status","==","نشط"),
    orderBy("startDate","desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id:d.id, ...d.data() };
}
async function createSubscription(sub){
  // sub = { customerId, packageId, startDate, endDate, remainingMeals, remainingSnacks, status, hasSnacks }
  const ref = await addDoc(collection(db,"subscriptions"), sub);
  return { id: ref.id };
}
async function updateSubscription(id, fields){ await updateDoc(doc(db,"subscriptions", id), fields); }
async function deleteSubscription(id){ await deleteDoc(doc(db,"subscriptions", id)); }

// ================= DAILY REGISTRATIONS =================
async function addDailyRegistration({ customerId, meals=0, snacks=0, notes="" }){
  const reg = {
    customerId,
    date: ymd(),
    time: hm(),
    mealType: meals>0 ? "Meals" : "",
    snackType: snacks>0 ? "Snacks" : "",
    meals, snacks, notes
  };
  const ref = await addDoc(collection(db,"dailyRegistrations"), reg);

  // Decrement counters on active subscription if found
  const sub = await getActiveSubscriptionByCustomerId(customerId);
  if (sub) {
    const fields = {};
    if (meals>0)  fields.remainingMeals  = Math.max(0,(sub.remainingMeals||0)-meals);
    if (snacks>0) fields.remainingSnacks = Math.max(0,(sub.remainingSnacks||0)-snacks);
    if (Object.keys(fields).length) await updateSubscription(sub.id, fields);
  }
  return { id: ref.id };
}
async function deleteDailyRegistration(id){
  // Optional: restore counters (reads doc then adds back)
  const rRef = doc(db,"dailyRegistrations", id);
  const rSnap = await getDoc(rRef);
  if (rSnap.exists()){
    const r = rSnap.data();
    const sub = await getActiveSubscriptionByCustomerId(r.customerId);
    if (sub){
      const fields = {};
      if (r.meals>0)  fields.remainingMeals  = (sub.remainingMeals||0)+r.meals;
      if (r.snacks>0) fields.remainingSnacks = (sub.remainingSnacks||0)+r.snacks;
      if (Object.keys(fields).length) await updateSubscription(sub.id, fields);
    }
  }
  await deleteDoc(rRef);
  return { id };
}
async function getDailyRegistrations(limitCount=200){
  const q = query(collection(db,"dailyRegistrations"), orderBy("date","desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}
async function listDailyRegistrationsByDate(dateStr){
  const q = query(collection(db,"dailyRegistrations"), where("date","==",dateStr), orderBy("time","asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}
async function getTodayRegistrations(){ return listDailyRegistrationsByDate(ymd()); }

// ================= ACTIVITIES =================
async function logActivity({ type, customerId=null, description, date=ymd(), time=hm(), time24=hm() }){
  const ref = await addDoc(collection(db,"activities"), { type, customerId, description, date, time, time24 });
  return { id: ref.id };
}
async function getActivities(limitCount=500){
  const snap = await getDocs(collection(db,"activities"));
  const items = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  items.sort((a,b)=> new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
  return items.slice(0, limitCount);
}

// ================= DASHBOARD STATS =================
async function getDashboardStats(){
  const [customers, subscriptions, packagesList, todayRegs] = await Promise.all([
    getCustomers(),
    getSubscriptions(),
    getPackages(),
    getTodayRegistrations()
  ]);
  const activeSubscriptions = subscriptions.filter(s=>s.status==="نشط").length;
  return {
    totalCustomers: customers.length,
    activeSubscriptions,
    totalPackages: packagesList.length,
    todayRegistrations: todayRegs.length
  };
}

// Expose globally for pages
window.firebaseDB_instance = {
  isOnline: true,
  validatePhoneNumber,

  // Customers
  addCustomer, getCustomerByPhone, getCustomerById, getCustomers, updateCustomer, deleteCustomer,

  // Packages
  getPackages, getPackageById, addPackage, updatePackage, deletePackage,

  // Subscriptions
  getSubscriptions, getActiveSubscriptionByCustomerId, createSubscription, updateSubscription, deleteSubscription,

  // Daily
  addDailyRegistration, deleteDailyRegistration, getDailyRegistrations, listDailyRegistrationsByDate, getTodayRegistrations,

  // Activities & Dashboard
  logActivity, getActivities, getDashboardStats
};
