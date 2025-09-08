// Database Management System for big dait
class Database {
    constructor() {
        this.init();
        // Don't initialize sample activities automatically
        // this.initializeSampleActivities();
    }

    init() {
        // Initialize database if not exists
        if (!localStorage.getItem('bigDaitDB')) {
            const initialData = {
                customers: [],
                subscriptions: [],
                packages: [],
                dailyRegistrations: [],
                activities: [],
                settings: {
                    packageDuration: 52, // days
                    currentMonth: new Date().getMonth(),
                    currentYear: new Date().getFullYear()
                }
            };
            localStorage.setItem('bigDaitDB', JSON.stringify(initialData));
        }
        
        // Initialize empty database - no sample data
    }


    getData() {
        return JSON.parse(localStorage.getItem('bigDaitDB'));
    }

    saveData(data) {
        localStorage.setItem('bigDaitDB', JSON.stringify(data));
    }

    // Customer Management
    addCustomer(customer) {
        const data = this.getData();
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
        this.saveData(data);
        return newCustomer;
    }

    getCustomers() {
        return this.getData().customers;
    }

    updateCustomer(id, updates) {
        const data = this.getData();
        const index = data.customers.findIndex(c => c.id === id);
        if (index !== -1) {
            data.customers[index] = { ...data.customers[index], ...updates };
            this.saveData(data);
            return data.customers[index];
        }
        return null;
    }

    deleteCustomer(id) {
        const data = this.getData();
        data.customers = data.customers.filter(c => c.id !== id);
        this.saveData(data);
    }

    // Package Management
    addPackage(packageData) {
        const data = this.getData();
        const newPackage = {
            id: Date.now(),
            name: packageData.name,
            price: packageData.price,
            duration: 26, // Fixed 26 days
            meals: packageData.meals,
            description: packageData.description,
            status: 'نشط',
            ...packageData
        };
        data.packages.push(newPackage);
        this.saveData(data);
        return newPackage;
    }

    getPackages() {
        return this.getData().packages;
    }

    updatePackage(id, updates) {
        const data = this.getData();
        const index = data.packages.findIndex(p => p.id === id);
        if (index !== -1) {
            data.packages[index] = { ...data.packages[index], ...updates };
            this.saveData(data);
            return data.packages[index];
        }
        return null;
    }

    deletePackage(id) {
        const data = this.getData();
        data.packages = data.packages.filter(p => p.id !== id);
        this.saveData(data);
    }

    // Subscription Management
    addSubscription(subscription) {
        const data = this.getData();
        const startDate = new Date(subscription.startDate);
        const endDate = new Date(subscription.endDate);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const packageData = data.packages.find(p => p.id === subscription.packageId);
        const totalMeals = packageData ? packageData.meals : 0;
        const totalSnacks = subscription.hasSnacks ? 26 : 0;

        const newSubscription = {
            id: Date.now(),
            customerId: subscription.customerId,
            packageId: subscription.packageId,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            totalMeals: totalMeals,
            totalSnacks: totalSnacks,
            remainingMeals: totalMeals,
            remainingSnacks: totalSnacks,
            hasSnacks: subscription.hasSnacks,
            status: 'نشط',
            ...subscription
        };

        data.subscriptions.push(newSubscription);
        
        // Update customer status
        this.updateCustomer(subscription.customerId, {
            status: 'نشط',
            currentPackage: packageData ? packageData.name : 'غير محدد'
        });

        this.saveData(data);
        return newSubscription;
    }

    getSubscriptions() {
        return this.getData().subscriptions;
    }

    getActiveSubscriptions() {
        const today = new Date().toISOString().split('T')[0];
        return this.getData().subscriptions.filter(s => 
            s.status === 'نشط' && s.endDate >= today && s.remainingMeals > 0
        );
    }

    updateSubscription(id, updates) {
        const data = this.getData();
        const index = data.subscriptions.findIndex(s => s.id === id);
        if (index !== -1) {
            data.subscriptions[index] = { ...data.subscriptions[index], ...updates };
            this.saveData(data);
            return data.subscriptions[index];
        }
        return null;
    }

    deleteSubscription(id) {
        const data = this.getData();
        const subscription = data.subscriptions.find(s => s.id === id);
        if (subscription) {
            // Update customer status
            this.updateCustomer(subscription.customerId, {
                status: 'جديد',
                currentPackage: 'عميل جديد'
            });
        }
        data.subscriptions = data.subscriptions.filter(s => s.id !== id);
        this.saveData(data);
    }

    // Daily Registration Management
    addDailyRegistration(registration) {
        const data = this.getData();
        const now = new Date();
        const timeString = now.toTimeString().slice(0, 5);
        
        const newRegistration = {
            id: Date.now(),
            customerId: registration.customerId,
            date: new Date().toISOString().split('T')[0],
            time: timeString,
            meals: registration.meals || 0,
            snacks: registration.snacks || 0,
            ...registration
        };

        data.dailyRegistrations.push(newRegistration);

        // Update subscription remaining meals/snacks
        const subscription = data.subscriptions.find(s => 
            s.customerId === registration.customerId && s.status === 'نشط'
        );
        
        if (subscription) {
            subscription.remainingMeals = Math.max(0, subscription.remainingMeals - (registration.meals || 0));
            subscription.remainingSnacks = Math.max(0, subscription.remainingSnacks - (registration.snacks || 0));
            
            // Update status if meals finished
            if (subscription.remainingMeals === 0) {
                subscription.status = 'منتهي';
                this.updateCustomer(registration.customerId, {
                    status: 'منتهي',
                    currentPackage: 'منتهي'
                });
            }
        }

        // Add activity
        this.addActivity({
            type: 'تسجيل وجبة',
            customerId: registration.customerId,
            description: this.formatRegistrationDescription(registration),
            time: timeString
        });

        this.saveData(data);
        return newRegistration;
    }

    getDailyRegistrations(date = null) {
        const data = this.getData();
        if (date) {
            return data.dailyRegistrations.filter(r => r.date === date);
        }
        return data.dailyRegistrations;
    }

    getTodayRegistrations() {
        const today = new Date().toISOString().split('T')[0];
        return this.getDailyRegistrations(today);
    }

    getCustomerRegistrations(customerId, limit = 10) {
        const data = this.getData();
        return data.dailyRegistrations
            .filter(r => r.customerId === customerId)
            .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
            .slice(0, limit);
    }

    // Activity Management
    addActivity(activity) {
        const data = this.getData();
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        // Convert to Arabic format for display
        let timeDisplay;
        if (hour === 0) {
            timeDisplay = `12:${String(minute).padStart(2, '0')} ص`;
        } else if (hour < 12) {
            timeDisplay = `${hour}:${String(minute).padStart(2, '0')} ص`;
        } else if (hour === 12) {
            timeDisplay = `12:${String(minute).padStart(2, '0')} م`;
        } else {
            timeDisplay = `${hour - 12}:${String(minute).padStart(2, '0')} م`;
        }
        
        const newActivity = {
            id: Date.now(),
            date: now.toISOString().split('T')[0],
            time: timeDisplay,
            time24: time24,
            ...activity
        };
        data.activities.push(newActivity);
        this.saveData(data);
        return newActivity;
    }

    getActivities(month = null, year = null, page = 1, limit = 25) {
        const data = this.getData();
        let activities = data.activities;

        // Filter to only show important activities
        const importantActivities = ['إضافة عميل', 'إضافة اشتراك', 'تعديل اشتراك', 'حذف اشتراك', 'إضافة باقة', 'تعديل باقة', 'حذف باقة'];
        activities = activities.filter(a => importantActivities.includes(a.type));

        if (month !== null && year !== null) {
            activities = activities.filter(a => {
                const activityDate = new Date(a.date);
                return activityDate.getMonth() === month && activityDate.getFullYear() === year;
            });
        }

        // Sort by date and time (newest first)
        activities.sort((a, b) => {
            // First compare dates
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (dateA.getTime() !== dateB.getTime()) {
                return dateB.getTime() - dateA.getTime(); // Newer dates first
            }
            
            // If dates are the same, compare times
            const timeA = a.time24 || a.time;
            const timeB = b.time24 || b.time;
            
            // Parse time strings (handle both 24h and Arabic format)
            const parseTime = (timeStr) => {
                if (timeStr.includes('ص') || timeStr.includes('م')) {
                    // Arabic format: "2:30 م" or "2:30 ص"
                    const isPM = timeStr.includes('م');
                    const timeOnly = timeStr.replace(/[صم]/g, '').trim();
                    const [hours, minutes] = timeOnly.split(':').map(Number);
                    let hour24 = hours;
                    if (isPM && hours !== 12) hour24 += 12;
                    if (!isPM && hours === 12) hour24 = 0;
                    return hour24 * 60 + minutes;
                } else {
                    // 24h format: "14:30"
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    return hours * 60 + minutes;
                }
            };
            
            const minutesA = parseTime(timeA);
            const minutesB = parseTime(timeB);
            
            return minutesB - minutesA; // Later times first
        });

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedActivities = activities.slice(startIndex, endIndex);

        return {
            activities: paginatedActivities,
            total: activities.length,
            page: page,
            totalPages: Math.ceil(activities.length / limit)
        };
    }

    // Utility Functions
    formatRegistrationDescription(registration) {
        const customer = this.getCustomers().find(c => c.id === registration.customerId);
        const customerName = customer ? customer.name : 'عميل غير معروف';
        
        let description = '';
        if (registration.meals > 0) {
            if (registration.meals === 1) description += 'وجبة واحدة';
            else if (registration.meals === 2) description += 'وجبتين';
            else description += `${registration.meals} وجبات`;
        }
        
        if (registration.snacks > 0) {
            if (description) description += ' و ';
            if (registration.snacks === 1) description += 'سناك';
            else if (registration.snacks === 2) description += 'سناكين';
            else description += `${registration.snacks} سناكس`;
        }

        return `${customerName} - ${description}`;
    }

    getCustomerById(id) {
        return this.getCustomers().find(c => c.id === id);
    }

    getPackageById(id) {
        return this.getPackages().find(p => p.id === id);
    }

    getSubscriptionByCustomerId(customerId) {
        return this.getSubscriptions().find(s => s.customerId === customerId && s.status === 'نشط');
    }

    // Dashboard Statistics
    getDashboardStats() {
        const data = this.getData();
        const today = new Date().toISOString().split('T')[0];
        
        return {
            totalCustomers: data.customers.length,
            activeSubscriptions: this.getActiveSubscriptions().length,
            totalPackages: data.packages.filter(p => p.status === 'نشط').length,
            todayRegistrations: data.dailyRegistrations.filter(r => r.date === today).length,
            todayMealsCollected: data.dailyRegistrations
                .filter(r => r.date === today)
                .reduce((sum, r) => sum + (r.meals || 0), 0)
        };
    }

    // Search Functions
    searchCustomers(query) {
        const customers = this.getCustomers();
        return customers.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query)
        );
    }

    // Utility Methods

    exportData() {
        return JSON.stringify(this.getData(), null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            localStorage.setItem('bigDaitDB', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    getDatabaseSize() {
        const data = this.getData();
        return {
            customers: data.customers.length,
            subscriptions: data.subscriptions.length,
            packages: data.packages.length,
            dailyRegistrations: data.dailyRegistrations.length,
            activities: data.activities.length
        };
    }

    // Validation Methods
    validatePhoneNumber(phone) {
        return /^[0-9]{10}$/.test(phone);
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Search Methods
    searchCustomers(query) {
        const customers = this.getCustomers();
        return customers.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query)
        );
    }

    searchSubscriptions(query) {
        const subscriptions = this.getSubscriptions();
        return subscriptions.filter(s => {
            const customer = this.getCustomerById(s.customerId);
            const packageData = this.getPackageById(s.packageId);
            return (customer && customer.name.toLowerCase().includes(query.toLowerCase())) ||
                   (packageData && packageData.name.toLowerCase().includes(query.toLowerCase()));
        });
    }

    initializeSampleActivities() {
        const data = this.getData();
        
        // Only add sample activities if there are less than 30 activities
        if (data.activities.length < 30) {
            // Generate 30 sample activities for the current month
            const today = new Date();
            const sampleActivities = [];
            
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                
                const activityTypes = ['إضافة عميل', 'إضافة اشتراك', 'تعديل اشتراك', 'إضافة باقة', 'تعديل باقة', 'حذف اشتراك'];
                const customers = ['أحمد محمد', 'فاطمة السعيد', 'محمد القحطاني', 'سارة المطيري', 'عمر الشمري', 'نورا العتيبي'];
                const descriptions = ['عميل جديد', 'اشتراك أساسي', 'تحديث الاشتراك', 'باقة جديدة', 'تحديث الباقة', 'إلغاء الاشتراك'];
                
                const randomType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
                const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
                const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
                
                // Generate time with proper 24-hour format for sorting
                const hour = Math.floor(Math.random() * 24);
                const minute = Math.floor(Math.random() * 60);
                const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                
                // Convert to Arabic format for display
                let timeDisplay;
                if (hour === 0) {
                    timeDisplay = `12:${String(minute).padStart(2, '0')} ص`;
                } else if (hour < 12) {
                    timeDisplay = `${hour}:${String(minute).padStart(2, '0')} ص`;
                } else if (hour === 12) {
                    timeDisplay = `12:${String(minute).padStart(2, '0')} م`;
                } else {
                    timeDisplay = `${hour - 12}:${String(minute).padStart(2, '0')} م`;
                }
                
                sampleActivities.push({
                    id: Date.now() + i,
                    type: randomType,
                    customerId: Math.floor(Math.random() * 5) + 1,
                    description: `${randomDescription} - ${randomCustomer}`,
                    date: date.toISOString().split('T')[0],
                    time: timeDisplay,
                    time24: time24 // Store 24-hour format for sorting
                });
            }
            
            data.activities = [...data.activities, ...sampleActivities];
            this.saveData(data);
        }
    }
}

// Initialize global database instance
window.db = new Database();

// Global function to refresh dashboard if it exists
window.refreshDashboardIfExists = function() {
    if (window.refreshDashboard) {
        window.refreshDashboard();
    }
};

// Global utility functions

window.exportDatabase = function() {
    const data = window.db.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'big-dait-database.json';
    a.click();
    URL.revokeObjectURL(url);
};
