// Online Database Management System for Big Diet
// This replaces localStorage with Firebase Firestore

class OnlineDatabase {
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
                console.log('Online database connected');
            } else {
                console.log('Firebase not loaded, using offline mode');
                this.isOnline = false;
            }
        } catch (error) {
            console.error('Error initializing online database:', error);
            this.isOnline = false;
        }
    }

    // Customer Management
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
                ...customer
            };

            const docRef = await window.firebaseDB.addDoc(
                window.firebaseDB.collection(this.db, 'customers'),
                customerData
            );
            
            return { id: docRef.id, ...customerData };
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
}

// Initialize online database
window.onlineDB = new OnlineDatabase();
