// Firebase Database Management System for Big Diet
// Implements the recommended structure: customers/{phone} as document ID

class FirebaseDatabase {
    constructor() {
        this.db = null;
        this.isOnline = false;
        this.init();
    }

    async init() {
        try {
            // Wait for Firebase to be loaded
            if (window.firebaseDB) {
                this.db = window.firebaseDB.db;
                this.isOnline = true;
                console.log('Firebase database connected (Data Storage Only)');
            } else {
                console.log('Firebase not loaded, using offline mode');
                this.isOnline = false;
            }
        } catch (error) {
            console.error('Error initializing Firebase database:', error);
            this.isOnline = false;
        }
    }

    // Customer Management - Using phone as document ID
    async addCustomer(customer) {
        if (!this.isOnline) {
            return this.addCustomerOffline(customer);
        }

        try {
            const customerData = {
                name: customer.name,
                phone: customer.phone,
                registrationDate: new Date().toISOString().split('T')[0],
                status: 'جديد',
                currentPackage: 'عميل جديد',
                createdAt: new Date().toISOString(),
                ...customer
            };

            // Use phone as document ID
            const customerRef = window.firebaseDB.doc(this.db, 'customers', customer.phone);
            await window.firebaseDB.setDoc(customerRef, customerData);
            
            return { id: customer.phone, ...customerData };
        } catch (error) {
            console.error('Error adding customer:', error);
            return this.addCustomerOffline(customer);
        }
    }

    async getCustomers() {
        if (!this.isOnline) {
            return this.getCustomersOffline();
        }

        try {
            const querySnapshot = await window.firebaseDB.getDocs(
                window.firebaseDB.collection(this.db, 'customers')
            );
            
            const customers = [];
            querySnapshot.forEach((doc) => {
                customers.push({ id: doc.id, ...doc.data() });
            });
            
            return customers;
        } catch (error) {
            console.error('Error getting customers:', error);
            return this.getCustomersOffline();
        }
    }

    // Get customer by phone (for customer portal)
    async getCustomerByPhone(phone) {
        if (!this.isOnline) {
            return this.getCustomerByPhoneOffline(phone);
        }

        try {
            const customerRef = window.firebaseDB.doc(this.db, 'customers', phone);
            const customerSnap = await window.firebaseDB.getDoc(customerRef);
            
            if (customerSnap.exists()) {
                return { id: customerSnap.id, ...customerSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting customer by phone:', error);
            return this.getCustomerByPhoneOffline(phone);
        }
    }

    async updateCustomer(customerId, updates) {
        if (!this.isOnline) {
            return this.updateCustomerOffline(customerId, updates);
        }

        try {
            const customerRef = window.firebaseDB.doc(this.db, 'customers', customerId);
            await window.firebaseDB.updateDoc(customerRef, updates);
            return true;
        } catch (error) {
            console.error('Error updating customer:', error);
            return this.updateCustomerOffline(customerId, updates);
        }
    }

    async deleteCustomer(customerId) {
        if (!this.isOnline) {
            return this.deleteCustomerOffline(customerId);
        }

        try {
            await window.firebaseDB.deleteDoc(
                window.firebaseDB.doc(this.db, 'customers', customerId)
            );
            return true;
        } catch (error) {
            console.error('Error deleting customer:', error);
            return this.deleteCustomerOffline(customerId);
        }
    }

    // Package Management
    async addPackage(packageData) {
        if (!this.isOnline) {
            return this.addPackageOffline(packageData);
        }

        try {
            const docRef = await window.firebaseDB.addDoc(
                window.firebaseDB.collection(this.db, 'packages'),
                packageData
            );
            
            return { id: docRef.id, ...packageData };
        } catch (error) {
            console.error('Error adding package:', error);
            return this.addPackageOffline(packageData);
        }
    }

    async getPackages() {
        if (!this.isOnline) {
            return this.getPackagesOffline();
        }

        try {
            const querySnapshot = await window.firebaseDB.getDocs(
                window.firebaseDB.collection(this.db, 'packages')
            );
            
            const packages = [];
            querySnapshot.forEach((doc) => {
                packages.push({ id: doc.id, ...doc.data() });
            });
            
            return packages;
        } catch (error) {
            console.error('Error getting packages:', error);
            return this.getPackagesOffline();
        }
    }

    // Subscription Management
    async addSubscription(subscription) {
        if (!this.isOnline) {
            return this.addSubscriptionOffline(subscription);
        }

        try {
            const docRef = await window.firebaseDB.addDoc(
                window.firebaseDB.collection(this.db, 'subscriptions'),
                subscription
            );
            
            return { id: docRef.id, ...subscription };
        } catch (error) {
            console.error('Error adding subscription:', error);
            return this.addSubscriptionOffline(subscription);
        }
    }

    async getSubscriptions() {
        if (!this.isOnline) {
            return this.getSubscriptionsOffline();
        }

        try {
            const querySnapshot = await window.firebaseDB.getDocs(
                window.firebaseDB.collection(this.db, 'subscriptions')
            );
            
            const subscriptions = [];
            querySnapshot.forEach((doc) => {
                subscriptions.push({ id: doc.id, ...doc.data() });
            });
            
            return subscriptions;
        } catch (error) {
            console.error('Error getting subscriptions:', error);
            return this.getSubscriptionsOffline();
        }
    }

    async getActiveSubscriptionByCustomerId(customerId) {
        if (!this.isOnline) {
            return this.getActiveSubscriptionByCustomerIdOffline(customerId);
        }

        try {
            const subscriptionsRef = window.firebaseDB.collection(this.db, 'subscriptions');
            const q = window.firebaseDB.query(
                subscriptionsRef,
                window.firebaseDB.where('customerId', '==', customerId),
                window.firebaseDB.where('status', '==', 'نشط')
            );
            
            const querySnapshot = await window.firebaseDB.getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
        } catch (error) {
            console.error('Error getting active subscription:', error);
            return this.getActiveSubscriptionByCustomerIdOffline(customerId);
        }
    }

    async getPackageById(packageId) {
        if (!this.isOnline) {
            return this.getPackageByIdOffline(packageId);
        }

        try {
            const docRef = window.firebaseDB.doc(this.db, 'packages', packageId);
            const docSnap = await window.firebaseDB.getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            
            return null;
        } catch (error) {
            console.error('Error getting package by ID:', error);
            return this.getPackageByIdOffline(packageId);
        }
    }

    // Daily Registration Management
    async addDailyRegistration(registration) {
        if (!this.isOnline) {
            return this.addDailyRegistrationOffline(registration);
        }

        try {
            const docRef = await window.firebaseDB.addDoc(
                window.firebaseDB.collection(this.db, 'dailyRegistrations'),
                registration
            );
            
            return { id: docRef.id, ...registration };
        } catch (error) {
            console.error('Error adding daily registration:', error);
            return this.addDailyRegistrationOffline(registration);
        }
    }

    async getTodayRegistrations() {
        if (!this.isOnline) {
            return this.getTodayRegistrationsOffline();
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            const registrationsRef = window.firebaseDB.collection(this.db, 'dailyRegistrations');
            const q = window.firebaseDB.query(
                registrationsRef,
                window.firebaseDB.where('date', '==', today)
            );
            
            const querySnapshot = await window.firebaseDB.getDocs(q);
            
            const registrations = [];
            querySnapshot.forEach((doc) => {
                registrations.push({ id: doc.id, ...doc.data() });
            });
            
            return registrations;
        } catch (error) {
            console.error('Error getting today registrations:', error);
            return this.getTodayRegistrationsOffline();
        }
    }

    async searchCustomersByPhone(phone) {
        if (!this.isOnline) {
            return this.searchCustomersByPhoneOffline(phone);
        }

        try {
            const customersRef = window.firebaseDB.collection(this.db, 'customers');
            const q = window.firebaseDB.query(
                customersRef,
                window.firebaseDB.where('phone', '==', phone)
            );
            
            const querySnapshot = await window.firebaseDB.getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
        } catch (error) {
            console.error('Error searching customers by phone:', error);
            return this.searchCustomersByPhoneOffline(phone);
        }
    }

    // Dashboard Statistics
    async getDashboardStats() {
        if (!this.isOnline) {
            return this.getDashboardStatsOffline();
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get all collections in parallel
            const [customersSnapshot, subscriptionsSnapshot, packagesSnapshot, registrationsSnapshot] = await Promise.all([
                window.firebaseDB.getDocs(window.firebaseDB.collection(this.db, 'customers')),
                window.firebaseDB.getDocs(window.firebaseDB.collection(this.db, 'subscriptions')),
                window.firebaseDB.getDocs(window.firebaseDB.collection(this.db, 'packages')),
                window.firebaseDB.getDocs(window.firebaseDB.collection(this.db, 'dailyRegistrations'))
            ]);

            const customers = [];
            customersSnapshot.forEach((doc) => {
                customers.push({ id: doc.id, ...doc.data() });
            });

            const subscriptions = [];
            subscriptionsSnapshot.forEach((doc) => {
                subscriptions.push({ id: doc.id, ...doc.data() });
            });

            const packages = [];
            packagesSnapshot.forEach((doc) => {
                packages.push({ id: doc.id, ...doc.data() });
            });

            const registrations = [];
            registrationsSnapshot.forEach((doc) => {
                registrations.push({ id: doc.id, ...doc.data() });
            });

            const activeSubscriptions = subscriptions.filter(s => 
                s.status === 'نشط' && s.endDate >= today && s.remainingMeals > 0
            );

            const todayRegistrations = registrations.filter(r => r.date === today);
            const todayMealsCollected = todayRegistrations.reduce((sum, r) => sum + (r.meals || 0), 0);

            return {
                totalCustomers: customers.length,
                activeSubscriptions: activeSubscriptions.length,
                totalPackages: packages.filter(p => p.status === 'نشط').length,
                todayRegistrations: todayRegistrations.length,
                todayMealsCollected: todayMealsCollected
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return this.getDashboardStatsOffline();
        }
    }

    // Daily Registration
    async addDailyRegistration(registration) {
        if (!this.isOnline) {
            return this.addDailyRegistrationOffline(registration);
        }

        try {
            const docRef = await window.firebaseDB.addDoc(
                window.firebaseDB.collection(this.db, 'dailyRegistrations'),
                registration
            );
            
            return { id: docRef.id, ...registration };
        } catch (error) {
            console.error('Error adding daily registration:', error);
            return this.addDailyRegistrationOffline(registration);
        }
    }

    async getDailyRegistrations() {
        if (!this.isOnline) {
            return this.getDailyRegistrationsOffline();
        }

        try {
            const querySnapshot = await window.firebaseDB.getDocs(
                window.firebaseDB.collection(this.db, 'dailyRegistrations')
            );
            
            const registrations = [];
            querySnapshot.forEach((doc) => {
                registrations.push({ id: doc.id, ...doc.data() });
            });
            
            return registrations;
        } catch (error) {
            console.error('Error getting daily registrations:', error);
            return this.getDailyRegistrationsOffline();
        }
    }

    // Activity Management
    async addActivity(activity) {
        if (!this.isOnline) {
            return this.addActivityOffline(activity);
        }

        try {
            const docRef = await window.firebaseDB.addDoc(
                window.firebaseDB.collection(this.db, 'activities'),
                activity
            );
            
            return { id: docRef.id, ...activity };
        } catch (error) {
            console.error('Error adding activity:', error);
            return this.addActivityOffline(activity);
        }
    }

    async getActivities() {
        if (!this.isOnline) {
            return this.getActivitiesOffline();
        }

        try {
            const querySnapshot = await window.firebaseDB.getDocs(
                window.firebaseDB.collection(this.db, 'activities')
            );
            
            const activities = [];
            querySnapshot.forEach((doc) => {
                activities.push({ id: doc.id, ...doc.data() });
            });
            
            return activities;
        } catch (error) {
            console.error('Error getting activities:', error);
            return this.getActivitiesOffline();
        }
    }

    // Offline fallback methods (using localStorage)
    addCustomerOffline(customer) {
        const data = this.getOfflineData();
        const newCustomer = {
            id: Date.now(),
            name: customer.name,
            phone: customer.phone,
            registrationDate: new Date().toISOString().split('T')[0],
            status: 'جديد',
            currentPackage: 'عميل جديد',
            ...customer
        };
        data.customers.push(newCustomer);
        this.saveOfflineData(data);
        return newCustomer;
    }

    getCustomersOffline() {
        const data = this.getOfflineData();
        return data.customers;
    }

    getCustomerByPhoneOffline(phone) {
        const data = this.getOfflineData();
        return data.customers.find(customer => customer.phone === phone) || null;
    }

    searchCustomersByPhoneOffline(phone) {
        return this.getCustomerByPhoneOffline(phone);
    }

    updateCustomerOffline(customerId, updates) {
        const data = this.getOfflineData();
        const index = data.customers.findIndex(c => c.id == customerId);
        if (index !== -1) {
            data.customers[index] = { ...data.customers[index], ...updates };
            this.saveOfflineData(data);
            return true;
        }
        return false;
    }

    deleteCustomerOffline(customerId) {
        const data = this.getOfflineData();
        data.customers = data.customers.filter(c => c.id != customerId);
        this.saveOfflineData(data);
        return true;
    }

    addPackageOffline(packageData) {
        const data = this.getOfflineData();
        const newPackage = {
            id: Date.now(),
            ...packageData
        };
        data.packages.push(newPackage);
        this.saveOfflineData(data);
        return newPackage;
    }

    getPackagesOffline() {
        const data = this.getOfflineData();
        return data.packages;
    }

    addSubscriptionOffline(subscription) {
        const data = this.getOfflineData();
        const newSubscription = {
            id: Date.now(),
            ...subscription
        };
        data.subscriptions.push(newSubscription);
        this.saveOfflineData(data);
        return newSubscription;
    }

    getSubscriptionsOffline() {
        const data = this.getOfflineData();
        return data.subscriptions;
    }

    addDailyRegistrationOffline(registration) {
        const data = this.getOfflineData();
        const newRegistration = {
            id: Date.now(),
            ...registration
        };
        data.dailyRegistrations.push(newRegistration);
        this.saveOfflineData(data);
        return newRegistration;
    }

    getDailyRegistrationsOffline() {
        const data = this.getOfflineData();
        return data.dailyRegistrations;
    }

    addActivityOffline(activity) {
        const data = this.getOfflineData();
        const newActivity = {
            id: Date.now(),
            ...activity
        };
        data.activities.push(newActivity);
        this.saveOfflineData(data);
        return newActivity;
    }

    getActivitiesOffline() {
        const data = this.getOfflineData();
        return data.activities;
    }

    getActiveSubscriptionByCustomerIdOffline(customerId) {
        const data = this.getOfflineData();
        return data.subscriptions.find(s => s.customerId == customerId && s.status === 'نشط') || null;
    }

    getPackageByIdOffline(packageId) {
        const data = this.getOfflineData();
        return data.packages.find(p => p.id == packageId) || null;
    }

    getTodayRegistrationsOffline() {
        const data = this.getOfflineData();
        const today = new Date().toISOString().split('T')[0];
        return data.dailyRegistrations.filter(r => r.date === today);
    }

    getDashboardStatsOffline() {
        const data = this.getOfflineData();
        const today = new Date().toISOString().split('T')[0];
        
        const activeSubscriptions = data.subscriptions.filter(s => 
            s.status === 'نشط' && s.endDate >= today && s.remainingMeals > 0
        );
        
        const todayRegistrations = data.dailyRegistrations.filter(r => r.date === today);
        const todayMealsCollected = todayRegistrations.reduce((sum, r) => sum + (r.meals || 0), 0);

        return {
            totalCustomers: data.customers.length,
            activeSubscriptions: activeSubscriptions.length,
            totalPackages: data.packages.filter(p => p.status === 'نشط').length,
            todayRegistrations: todayRegistrations.length,
            todayMealsCollected: todayMealsCollected
        };
    }

    getOfflineData() {
        if (!localStorage.getItem('bigDaitDB')) {
            const initialData = {
                customers: [],
                subscriptions: [],
                packages: [],
                dailyRegistrations: [],
                activities: [],
                settings: {
                    packageDuration: 52,
                    currentMonth: new Date().getMonth(),
                    currentYear: new Date().getFullYear()
                }
            };
            localStorage.setItem('bigDaitDB', JSON.stringify(initialData));
        }
        return JSON.parse(localStorage.getItem('bigDaitDB'));
    }

    saveOfflineData(data) {
        localStorage.setItem('bigDaitDB', JSON.stringify(data));
    }

    // No authentication methods needed - using localStorage login
}

// Initialize Firebase database
window.firebaseDB_instance = new FirebaseDatabase();
