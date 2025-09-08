# Big Diet - Healthy Meal Subscription System

A complete Arabic RTL web application for managing healthy meal subscriptions.

## Features

### Admin System
- **Dashboard**: Overview with statistics and recent activity
- **Customer Management**: Add, edit, delete customers
- **Package Management**: Create and manage meal packages
- **Subscription Management**: Handle customer subscriptions
- **Daily Registration**: Record daily meal/snack collections
- **Authentication**: Secure login system

### Customer Portal
- **Standalone Portal**: Customers can check their subscription details
- **Phone Number Access**: No login required, just phone number
- **Subscription Details**: View remaining meals, snacks, days left

## File Structure

```
├── login.html              # Admin login page
├── dashboard.html          # Main admin dashboard
├── customers.html          # Customer management
├── packages.html           # Package management
├── subscriptions.html      # Subscription management
├── daily-registration.html # Daily meal registration
├── customer-portal.html    # Customer self-service portal
├── database.js            # Client-side database (localStorage)
├── styles.css             # Global styles
├── big-diet-logo.svg      # Logo file
└── textured-green-bg.svg  # Background texture
```

## Deployment Instructions

### 1. Web Server Deployment
- Upload all files to your web server
- Ensure all files are in the same directory
- No server-side requirements (pure client-side)

### 2. Local Development
- Open `login.html` in a web browser
- Default admin credentials: `admin` / `admin123`

### 3. Configuration
- All data is stored in browser localStorage
- No database setup required
- Works offline after initial load

## System Requirements

- Modern web browser with JavaScript enabled
- No server-side dependencies
- Bootstrap 5.3.0 (loaded from CDN)
- Font Awesome 6.0.0 (loaded from CDN)
- Google Fonts - Cairo (loaded from CDN)

## Features Overview

### Dashboard
- Real-time statistics
- Recent activity with pagination
- Month navigation for activities
- Automatic data calculation

### Customer Management
- 10-digit phone number validation
- Automatic registration date
- Status management (جديد, نشط, منتهي)
- CRUD operations

### Package Management
- Custom package creation
- 52-day default duration
- Flexible meal counts
- Status tracking

### Subscription Management
- Customer and package selection
- Automatic end date calculation (52 days)
- Snack inclusion option (26 snacks)
- Remaining meals/snacks tracking

### Daily Registration
- Customer search by name/phone
- Dynamic meal/snack dropdowns
- Automatic time recording
- Recent visits display

### Customer Portal
- Phone number access only
- Subscription details display
- Recent activity history
- Modern responsive design

## Security Notes

- Admin authentication required for management pages
- Customer portal is public (phone number only)
- All data stored locally in browser
- No sensitive data transmission

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Support

For technical support or customization requests, contact the development team.
