// Demo sign-ins shown on the login page (the data itself lives in prisma/seed-data.js).
export const DEMO_ACCOUNTS = [
  { role: 'admin', email: 'admin@jolof.demo', password: 'admin123', label: 'Admin' },
  { role: 'customer', email: 'retailer@jolof.demo', password: 'demo123', label: 'Retailer' },
  { role: 'customer', email: 'customer@jolof.demo', password: 'demo123', label: 'Individual' },
  { role: 'vendor', email: 'vendor@jolof.demo', password: 'demo123', label: 'Supplier' },
];
