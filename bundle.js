/**
 * BillCraft - Unified Application Bundle
 * Supports both direct file:// opening and http:// serving.
 * Strict Aeonik Typography • Fintech Invoicing
 */
(function() {
  'use strict';

/* --- START js/calculator.js --- */
/**
 * BillCraft - Financial Calculations & Precision Engine
 * Guarantees zero floating-point rounding errors and accurate accounting totals.
 */

function roundToTwo(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

function calculateInvoice(invoice) {
  const items = (invoice.items || []).map((item, index) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const lineTotal = roundToTwo(qty * price);
    return {
      ...item,
      id: item.id || `item_${index}_${Date.now()}`,
      quantity: qty,
      unitPrice: price,
      total: lineTotal
    };
  });

  const subtotal = roundToTwo(
    items.reduce((acc, curr) => acc + curr.total, 0)
  );

  let discountAmount = 0;
  const discountVal = Math.max(0, Number(invoice.discountValue) || 0);
  if (invoice.discountType === 'flat') {
    discountAmount = Math.min(subtotal, roundToTwo(discountVal));
  } else {
    // Percentage
    const pct = Math.min(100, discountVal);
    discountAmount = roundToTwo(subtotal * (pct / 100));
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxRate = Math.max(0, Number(invoice.taxRate) || 0);
  const taxAmount = roundToTwo(taxableAmount * (taxRate / 100));

  const shipping = Math.max(0, Number(invoice.shipping) || 0);

  const total = roundToTwo(taxableAmount + taxAmount + shipping);

  return {
    ...invoice,
    items,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    shipping,
    total
  };
}

/* --- END js/calculator.js --- */

/* --- START js/storage.js --- */
/**
 * BillCraft - Unified Storage & Data Management Engine
 * Handles local persistence, Supabase synchronization, validation,
 * financial calculations, and state management.
 */

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', format: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', format: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', format: 'en-GB' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', format: 'en-NG' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', format: 'en-CA' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', format: 'en-AU' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', format: 'en-GH' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', format: 'ja-JP' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', format: 'en-IN' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', format: 'en-ZA' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', format: 'en-KE' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', format: 'ar-AE' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', format: 'de-CH' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', format: 'en-SG' },
];

function getCurrency(code = 'USD') {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

function formatCurrency(amount, currencyCode = 'USD') {
  const num = Number(amount) || 0;
  const curr = getCurrency(currencyCode);
  return `${curr.symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Storage Keys
const STORAGE_KEYS = {
  USER: 'billcraft_user',
  BUSINESS: 'billcraft_business',
  CLIENTS: 'billcraft_clients',
  INVOICES: 'billcraft_invoices',
  SETTINGS: 'billcraft_settings',
  SUPABASE_CONFIG: 'billcraft_supabase_config'
};

// Default Seed Data
const DEFAULT_USER = {
  id: 'usr_guest_demo',
  email: 'alex@apexstudio.io',
  fullName: 'Alex Vance',
  isGuest: false,
  subscriptionTier: 'free', // 'free' | 'pro'
  monthlyInvoiceCount: 3,
  lastResetMonth: new Date().toISOString().slice(0, 7)
};

const DEFAULT_BUSINESS = {
  name: 'Apex Studio Creative LLC',
  logo: '',
  email: 'hello@apexstudio.io',
  phone: '+1 (415) 890-4321',
  address: '742 Montgomery St, Suite 400\nSan Francisco, CA 94111',
  website: 'https://apexstudio.io',
  defaultCurrency: 'USD',
  bankDetails: 'Mercury Bank, N.A.\nAccount: 8820 1934 9102\nRouting: 121000358\nSWIFT: MERCUS33',
  defaultTerms: 'Payment due within 14 calendar days of issue. Invoices overdue by 30+ days accrue a 1.5% late fee per month.',
  defaultNotes: 'Thank you for your business! Please reference the invoice number in wire details.'
};

const DEFAULT_CLIENTS = [
  {
    id: 'cli_01',
    name: 'Sarah Jenkins',
    companyName: 'Acme Cloud Solutions',
    email: 'sarah.jenkins@acmecloud.io',
    phone: '+1 (212) 555-0199',
    address: '350 5th Avenue, 42nd Floor\nNew York, NY 10118'
  },
  {
    id: 'cli_02',
    name: 'Liam Chen',
    companyName: 'Starlight Interactive Media',
    email: 'finance@starlightmedia.com',
    phone: '+1 (310) 555-0144',
    address: '9000 Sunset Blvd, Suite 800\nWest Hollywood, CA 90069'
  },
  {
    id: 'cli_03',
    name: 'Kofi Mensah',
    companyName: 'Vanguard Ventures Africa',
    email: 'accounts@vanguardafrica.com',
    phone: '+233 24 555 7890',
    address: 'Liberia Road, Ridge\nAccra, Ghana'
  }
];

const DEFAULT_INVOICES = [
  {
    id: 'inv_001',
    invoiceNumber: 'INV-2026-001',
    clientId: 'cli_01',
    clientName: 'Sarah Jenkins',
    clientCompany: 'Acme Cloud Solutions',
    clientEmail: 'sarah.jenkins@acmecloud.io',
    clientPhone: '+1 (212) 555-0199',
    clientAddress: '350 5th Avenue, 42nd Floor\nNew York, NY 10118',
    businessName: 'Apex Studio Creative LLC',
    businessEmail: 'hello@apexstudio.io',
    businessPhone: '+1 (415) 890-4321',
    businessAddress: '742 Montgomery St, Suite 400\nSan Francisco, CA 94111',
    businessWebsite: 'https://apexstudio.io',
    businessLogo: '',
    issueDate: '2026-11-01',
    dueDate: '2026-11-15',
    currency: 'USD',
    templateId: 'minimal',
    status: 'paid',
    items: [
      { id: 'item_1', description: 'Brand Identity Design & Design System', quantity: 1, unitPrice: 4200.00, total: 4200.00 },
      { id: 'item_2', description: 'Web Application UI/UX Architecture (40 hrs)', quantity: 40, unitPrice: 125.00, total: 5000.00 }
    ],
    subtotal: 9200.00,
    discountType: 'percentage',
    discountValue: 5,
    discountAmount: 460.00,
    taxRate: 8.5,
    taxAmount: 742.90,
    shipping: 0,
    total: 9482.90,
    paymentInstructions: 'Direct Wire / ACH to Mercury Bank, N.A.',
    bankDetails: 'Mercury Bank, N.A.\nAccount: 8820 1934 9102\nRouting: 121000358',
    notes: 'Project milestone 1 completed and approved.',
    terms: 'Payment received in full. Thank you!'
  },
  {
    id: 'inv_002',
    invoiceNumber: 'INV-2026-002',
    clientId: 'cli_02',
    clientName: 'Liam Chen',
    clientCompany: 'Starlight Interactive Media',
    clientEmail: 'finance@starlightmedia.com',
    clientPhone: '+1 (310) 555-0144',
    clientAddress: '9000 Sunset Blvd, Suite 800\nWest Hollywood, CA 90069',
    businessName: 'Apex Studio Creative LLC',
    businessEmail: 'hello@apexstudio.io',
    businessPhone: '+1 (415) 890-4321',
    businessAddress: '742 Montgomery St, Suite 400\nSan Francisco, CA 94111',
    businessWebsite: 'https://apexstudio.io',
    businessLogo: '',
    issueDate: '2026-11-12',
    dueDate: '2026-11-26',
    currency: 'USD',
    templateId: 'corporate',
    status: 'pending',
    items: [
      { id: 'item_3', description: 'Motion Design & Product Teaser 3D Renders', quantity: 2, unitPrice: 1850.00, total: 3700.00 },
      { id: 'item_4', description: 'Interactive Landing Page Frontend Development', quantity: 1, unitPrice: 2800.00, total: 2800.00 }
    ],
    subtotal: 6500.00,
    discountType: 'flat',
    discountValue: 0,
    discountAmount: 0.00,
    taxRate: 8.5,
    taxAmount: 552.50,
    shipping: 0,
    total: 7052.50,
    paymentInstructions: 'ACH Transfer or Wire',
    bankDetails: 'Mercury Bank, N.A.\nAccount: 8820 1934 9102\nRouting: 121000358',
    notes: 'Invoice for Sprint 3 deliverables.',
    terms: 'Due within 14 calendar days. Please send remittance advice upon payment.'
  },
  {
    id: 'inv_003',
    invoiceNumber: 'INV-2026-003',
    clientId: 'cli_03',
    clientName: 'Kofi Mensah',
    clientCompany: 'Vanguard Ventures Africa',
    clientEmail: 'accounts@vanguardafrica.com',
    clientPhone: '+233 24 555 7890',
    clientAddress: 'Liberia Road, Ridge\nAccra, Ghana',
    businessName: 'Apex Studio Creative LLC',
    businessEmail: 'hello@apexstudio.io',
    businessPhone: '+1 (415) 890-4321',
    businessAddress: '742 Montgomery St, Suite 400\nSan Francisco, CA 94111',
    businessWebsite: 'https://apexstudio.io',
    businessLogo: '',
    issueDate: '2026-10-15',
    dueDate: '2026-10-29',
    currency: 'USD',
    templateId: 'creative',
    status: 'overdue',
    items: [
      { id: 'item_5', description: 'Quarterly Advisory & Tech Due Diligence (Q4)', quantity: 1, unitPrice: 3500.00, total: 3500.00 }
    ],
    subtotal: 3500.00,
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0.00,
    taxRate: 0,
    taxAmount: 0.00,
    shipping: 0,
    total: 3500.00,
    paymentInstructions: 'International SWIFT Wire Transfer',
    bankDetails: 'Mercury Bank, N.A.\nAccount: 8820 1934 9102\nRouting: 121000358\nSWIFT: MERCUS33',
    notes: 'Past due reminder. Please initiate wire promptly.',
    terms: 'Standard net 14 payment terms apply.'
  }
];

class StorageEngine {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BUSINESS)) {
      localStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(DEFAULT_BUSINESS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
    }
  }

  // --- USER & AUTH ---
  getUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  }

  saveUser(userData) {
    const current = this.getUser();
    const updated = { ...current, ...userData };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    return updated;
  }

  isPro() {
    const user = this.getUser();
    return user.subscriptionTier === 'pro';
  }

  getInvoiceLimit() {
    return this.isPro() ? Infinity : 5;
  }

  getMonthlyCount() {
    const user = this.getUser();
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (user.lastResetMonth !== currentMonth) {
      user.monthlyInvoiceCount = 0;
      user.lastResetMonth = currentMonth;
      this.saveUser(user);
    }
    return user.monthlyInvoiceCount || 0;
  }

  canCreateInvoice() {
    if (this.isPro()) return true;
    return this.getMonthlyCount() < 5;
  }

  incrementMonthlyCount() {
    const user = this.getUser();
    const current = this.getMonthlyCount();
    user.monthlyInvoiceCount = current + 1;
    this.saveUser(user);
  }

  upgradeToPro() {
    return this.saveUser({ subscriptionTier: 'pro' });
  }

  downgradeToFree() {
    return this.saveUser({ subscriptionTier: 'free' });
  }

  // --- BUSINESS PROFILE ---
  getBusiness() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUSINESS);
      return data ? JSON.parse(data) : DEFAULT_BUSINESS;
    } catch {
      return DEFAULT_BUSINESS;
    }
  }

  saveBusiness(businessData) {
    const current = this.getBusiness();
    const updated = { ...current, ...businessData };
    localStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(updated));
    return updated;
  }

  // --- CLIENTS ---
  getClients() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return data ? JSON.parse(data) : DEFAULT_CLIENTS;
    } catch {
      return DEFAULT_CLIENTS;
    }
  }

  getClientById(id) {
    return this.getClients().find(c => c.id === id) || null;
  }

  saveClient(clientData) {
    const clients = this.getClients();
    let updatedClient;
    if (clientData.id) {
      const index = clients.findIndex(c => c.id === clientData.id);
      if (index !== -1) {
        clients[index] = { ...clients[index], ...clientData };
        updatedClient = clients[index];
      } else {
        updatedClient = { ...clientData, id: 'cli_' + Date.now() };
        clients.push(updatedClient);
      }
    } else {
      updatedClient = { ...clientData, id: 'cli_' + Date.now() };
      clients.push(updatedClient);
    }
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    return updatedClient;
  }

  deleteClient(id) {
    const clients = this.getClients().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    return true;
  }

  // --- INVOICES ---
  getInvoices() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return data ? JSON.parse(data) : DEFAULT_INVOICES;
    } catch {
      return DEFAULT_INVOICES;
    }
  }

  getInvoiceById(id) {
    return this.getInvoices().find(inv => inv.id === id) || null;
  }

  getNextInvoiceNumber() {
    const invoices = this.getInvoices();
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    // Find highest existing sequence
    let maxNum = 0;
    invoices.forEach(inv => {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
        const numPart = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    const nextSeq = String(maxNum + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  }

  isInvoiceNumberTaken(number, excludeId = null) {
    const invoices = this.getInvoices();
    return invoices.some(inv => inv.invoiceNumber.trim().toLowerCase() === number.trim().toLowerCase() && inv.id !== excludeId);
  }

  saveInvoice(invoiceData) {
    const invoices = this.getInvoices();
    let savedInvoice;

    // Check duplicate invoice number
    if (this.isInvoiceNumberTaken(invoiceData.invoiceNumber, invoiceData.id)) {
      throw new Error(`Invoice number "${invoiceData.invoiceNumber}" is already in use. Please choose a unique number.`);
    }

    if (invoiceData.id) {
      const index = invoices.findIndex(inv => inv.id === invoiceData.id);
      if (index !== -1) {
        invoices[index] = { ...invoices[index], ...invoiceData, updatedAt: new Date().toISOString() };
        savedInvoice = invoices[index];
      } else {
        if (!this.canCreateInvoice()) {
          throw new Error('You have reached the 5 invoices per month limit on the Free plan. Please upgrade to Pro for unlimited invoices.');
        }
        savedInvoice = { ...invoiceData, id: 'inv_' + Date.now(), createdAt: new Date().toISOString() };
        invoices.unshift(savedInvoice);
        this.incrementMonthlyCount();
      }
    } else {
      if (!this.canCreateInvoice()) {
        throw new Error('You have reached the 5 invoices per month limit on the Free plan. Please upgrade to Pro for unlimited invoices.');
      }
      savedInvoice = { ...invoiceData, id: 'inv_' + Date.now(), createdAt: new Date().toISOString() };
      invoices.unshift(savedInvoice);
      this.incrementMonthlyCount();
    }

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    return savedInvoice;
  }

  updateInvoiceStatus(id, newStatus) {
    const validStatuses = ['draft', 'sent', 'paid', 'pending', 'overdue'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}"`);
    }
    const invoices = this.getInvoices();
    const index = invoices.findIndex(inv => inv.id === id);
    if (index !== -1) {
      invoices[index].status = newStatus;
      invoices[index].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
      return invoices[index];
    }
    return null;
  }

  deleteInvoice(id) {
    const invoices = this.getInvoices().filter(inv => inv.id !== id);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    return true;
  }

  // --- STATS CALCULATION (Real, Accurate Figures) ---
  getDashboardStats() {
    const invoices = this.getInvoices();
    
    let totalValue = 0;
    let paidCount = 0;
    let paidValue = 0;
    let pendingCount = 0;
    let pendingValue = 0;
    let overdueCount = 0;
    let overdueValue = 0;
    let draftCount = 0;
    let draftValue = 0;

    invoices.forEach(inv => {
      const amount = Number(inv.total) || 0;
      totalValue += amount;

      switch (inv.status) {
        case 'paid':
          paidCount += 1;
          paidValue += amount;
          break;
        case 'pending':
        case 'sent':
          pendingCount += 1;
          pendingValue += amount;
          break;
        case 'overdue':
          overdueCount += 1;
          overdueValue += amount;
          break;
        case 'draft':
          draftCount += 1;
          draftValue += amount;
          break;
        default:
          break;
      }
    });

    const primaryCurrency = this.getBusiness().defaultCurrency || 'USD';

    return {
      totalCount: invoices.length,
      totalValue,
      paidCount,
      paidValue,
      pendingCount,
      pendingValue,
      overdueCount,
      overdueValue,
      draftCount,
      draftValue,
      primaryCurrency
    };
  }

  // --- SUPABASE CONFIG SETTINGS ---
  getSupabaseConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      return data ? JSON.parse(data) : { url: '', anonKey: '', connected: false };
    } catch {
      return { url: '', anonKey: '', connected: false };
    }
  }

  saveSupabaseConfig(config) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
    return config;
  }
}

const storage = new StorageEngine();

/* --- END js/storage.js --- */

/* --- START js/supabase-client.js --- */
/**
 * BillCraft - Supabase Integration Layer
 * Provides real Supabase Auth & Database synchronization when configured,
 * with graceful local fallback so users can test immediately.
 */

// [bundled import]
class SupabaseService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const config = storage.getSupabaseConfig();
    if (config.url && config.anonKey && window.supabase) {
      try {
        this.client = window.supabase.createClient(config.url, config.anonKey);
        this.isConfigured = true;
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
        this.client = null;
        this.isConfigured = false;
      }
    }
  }

  configure(url, anonKey) {
    if (!url || !anonKey) {
      storage.saveSupabaseConfig({ url: '', anonKey: '', connected: false });
      this.client = null;
      this.isConfigured = false;
      return { success: true, message: 'Disconnected from Supabase. Operating in Local Persistence mode.' };
    }

    try {
      if (window.supabase) {
        this.client = window.supabase.createClient(url, anonKey);
        this.isConfigured = true;
        storage.saveSupabaseConfig({ url, anonKey, connected: true });
        return { success: true, message: 'Successfully connected to Supabase backend!' };
      } else {
        throw new Error('Supabase JS SDK library not loaded.');
      }
    } catch (err) {
      this.isConfigured = false;
      return { success: false, message: err.message };
    }
  }

  // --- AUTHENTICATION ---

  async signUp(email, password, fullName = '') {
    if (this.isConfigured && this.client) {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) throw error;
      
      const user = {
        id: data.user.id,
        email: data.user.email,
        fullName: fullName || email.split('@')[0],
        isGuest: false,
        subscriptionTier: 'free',
        monthlyInvoiceCount: 0,
        lastResetMonth: new Date().toISOString().slice(0, 7)
      };
      storage.saveUser(user);
      return { user, message: 'Account created! Please check your email for confirmation if required.' };
    } else {
      // Local Auth Mode
      const user = {
        id: 'usr_' + Date.now(),
        email,
        fullName: fullName || email.split('@')[0],
        isGuest: false,
        subscriptionTier: 'free',
        monthlyInvoiceCount: 0,
        lastResetMonth: new Date().toISOString().slice(0, 7)
      };
      storage.saveUser(user);
      return { user, message: 'Account created successfully in BillCraft.' };
    }
  }

  async signIn(email, password) {
    if (this.isConfigured && this.client) {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      const user = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || email.split('@')[0],
        isGuest: false,
        subscriptionTier: 'free',
        monthlyInvoiceCount: storage.getMonthlyCount(),
        lastResetMonth: new Date().toISOString().slice(0, 7)
      };
      storage.saveUser(user);
      return { user, message: 'Signed in successfully.' };
    } else {
      // Local Auth Mode
      const current = storage.getUser();
      const user = {
        ...current,
        email,
        fullName: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        isGuest: false
      };
      storage.saveUser(user);
      return { user, message: 'Signed in successfully.' };
    }
  }

  async signOut() {
    if (this.isConfigured && this.client) {
      await this.client.auth.signOut();
    }
    const guestUser = {
      id: 'usr_guest',
      email: '',
      fullName: 'Guest User',
      isGuest: true,
      subscriptionTier: 'free',
      monthlyInvoiceCount: 0,
      lastResetMonth: new Date().toISOString().slice(0, 7)
    };
    storage.saveUser(guestUser);
    return { success: true };
  }

  async resetPassword(email) {
    if (this.isConfigured && this.client) {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      return { message: 'Password reset link sent to your email.' };
    } else {
      return { message: `Password reset instructions sent to ${email} (Demo Mode).` };
    }
  }

  async getCurrentUser() {
    if (this.isConfigured && this.client) {
      const { data: { session } } = await this.client.auth.getSession();
      if (session?.user) {
        return {
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          isGuest: false
        };
      }
    }
    return storage.getUser();
  }
}

const supabaseService = new SupabaseService();

/* --- END js/supabase-client.js --- */

/* --- START js/templates.js --- */
/**
 * BillCraft - Invoice Templates Renderer
 * Renders 4 distinct professional invoice designs:
 * 1. Minimal - Clean, simple and modern
 * 2. Corporate - Formal business layout
 * 3. Creative - Bold but professional layout
 * 4. Elegant - Premium typography and refined spacing
 */

// [bundled import]
const TEMPLATES = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, simple and modern layout with generous whitespace.',
    tier: 'free',
    badge: 'Popular',
    previewColor: '#0f172a'
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Formal business layout with structured tables and bank callouts.',
    tier: 'free',
    badge: 'Standard',
    previewColor: '#1e3a8a'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold, distinctive layout with modern visual accents for studios.',
    tier: 'pro',
    badge: 'Pro Tier',
    previewColor: '#0284c7'
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Refined editorial layout with subtle borders and premium spacing.',
    tier: 'pro',
    badge: 'Pro Tier',
    previewColor: '#334155'
  }
];

function getStatusBadgeClass(status) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'pending':
    case 'sent':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'draft':
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-300';
  }
}

function renderInvoiceHTML(inv) {
  const templateId = inv.templateId || 'minimal';
  switch (templateId) {
    case 'corporate':
      return renderCorporateTemplate(inv);
    case 'creative':
      return renderCreativeTemplate(inv);
    case 'elegant':
      return renderElegantTemplate(inv);
    case 'minimal':
    default:
      return renderMinimalTemplate(inv);
  }
}

// ============================================================================
// TEMPLATE 1: MINIMAL
// ============================================================================
function renderMinimalTemplate(inv) {
  const curr = inv.currency || 'USD';
  const logoHtml = inv.businessLogo 
    ? `<img src="${inv.businessLogo}" alt="${inv.businessName}" style="max-height: 52px; max-width: 180px; object-fit: contain; margin-bottom: 8px;" />` 
    : `<div style="font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">${inv.businessName || 'Your Business Name'}</div>`;

  const itemsRows = (inv.items || []).map(item => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 0; color: #1e293b; font-weight: 500;">
        ${escapeHtml(item.description || 'Item description')}
      </td>
      <td style="padding: 12px 16px; text-align: center; color: #475569;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 16px; text-align: right; color: #475569;">
        ${formatCurrency(item.unitPrice, curr)}
      </td>
      <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #0f172a;">
        ${formatCurrency(item.total, curr)}
      </td>
    </tr>
  `).join('');

  return `
  <div class="invoice-sheet" style="font-family: 'Aeonik', sans-serif; color: #1e293b; background: #ffffff; padding: 48px; min-height: 100%; box-sizing: border-box;">
    <!-- Top Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
      <div>
        ${logoHtml}
        <div style="font-size: 13px; color: #64748b; line-height: 1.5; white-space: pre-line; margin-top: 6px;">
          ${escapeHtml(inv.businessAddress || '')}
          ${inv.businessEmail ? `<div>${escapeHtml(inv.businessEmail)}</div>` : ''}
          ${inv.businessPhone ? `<div>${escapeHtml(inv.businessPhone)}</div>` : ''}
          ${inv.businessWebsite ? `<div>${escapeHtml(inv.businessWebsite)}</div>` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 9999px; margin-bottom: 12px;" class="${getStatusBadgeClass(inv.status)}">
          ${inv.status || 'Draft'}
        </div>
        <div style="font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -0.03em;">INVOICE</div>
        <div style="font-size: 14px; font-weight: 600; color: #2563eb; margin-top: 2px;">#${escapeHtml(inv.invoiceNumber)}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
          <div>Issued: <strong style="color: #334155;">${inv.issueDate || '—'}</strong></div>
          <div>Due: <strong style="color: #334155;">${inv.dueDate || '—'}</strong></div>
        </div>
      </div>
    </div>

    <!-- Bill To Section -->
    <div style="padding: 16px 20px; background: #f8fafc; border-radius: 8px; margin-bottom: 36px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 6px;">Billed To</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${escapeHtml(inv.clientCompany || inv.clientName || 'Client Name')}</div>
        ${inv.clientCompany && inv.clientName ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">Attn: ${escapeHtml(inv.clientName)}</div>` : ''}
        <div style="font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.4; white-space: pre-line;">${escapeHtml(inv.clientAddress || '')}</div>
      </div>
      <div style="text-align: right; font-size: 13px; color: #64748b; line-height: 1.6;">
        ${inv.clientEmail ? `<div>Email: <strong style="color: #1e293b;">${escapeHtml(inv.clientEmail)}</strong></div>` : ''}
        ${inv.clientPhone ? `<div>Tel: <strong style="color: #1e293b;">${escapeHtml(inv.clientPhone)}</strong></div>` : ''}
        <div>Currency: <strong style="color: #1e293b;">${inv.currency || 'USD'}</strong></div>
      </div>
    </div>

    <!-- Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
      <thead>
        <tr style="border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">
          <th style="padding: 10px 0; text-align: left; font-weight: 700;">Description</th>
          <th style="padding: 10px 16px; text-align: center; font-weight: 700; width: 70px;">Qty</th>
          <th style="padding: 10px 16px; text-align: right; font-weight: 700; width: 120px;">Rate</th>
          <th style="padding: 10px 0; text-align: right; font-weight: 700; width: 130px;">Amount</th>
        </tr>
      </thead>
      <tbody style="font-size: 13px;">
        ${itemsRows}
      </tbody>
    </table>

    <!-- Totals Area -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 36px;">
      <div style="width: 280px; font-size: 13px; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between; color: #64748b;">
          <span>Subtotal:</span>
          <span style="font-weight: 600; color: #1e293b;">${formatCurrency(inv.subtotal, curr)}</span>
        </div>
        ${inv.discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #16a34a;">
            <span>Discount ${inv.discountType === 'percentage' ? `(${inv.discountValue}%)` : ''}:</span>
            <span style="font-weight: 600;">-${formatCurrency(inv.discountAmount, curr)}</span>
          </div>
        ` : ''}
        ${inv.taxRate > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #64748b;">
            <span>Tax (${inv.taxRate}%):</span>
            <span style="font-weight: 600; color: #1e293b;">+${formatCurrency(inv.taxAmount, curr)}</span>
          </div>
        ` : ''}
        ${inv.shipping > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #64748b;">
            <span>Shipping / Other:</span>
            <span style="font-weight: 600; color: #1e293b;">+${formatCurrency(inv.shipping, curr)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding-top: 10px; margin-top: 6px; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 700; color: #0f172a;">
          <span>Total:</span>
          <span style="color: #2563eb;">${formatCurrency(inv.total, curr)}</span>
        </div>
      </div>
    </div>

    <!-- Footer Information -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; font-size: 12px; color: #64748b; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div>
        ${inv.bankDetails ? `
          <div style="font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 4px;">Bank & Payment Details</div>
          <div style="white-space: pre-line; line-height: 1.5; color: #475569;">${escapeHtml(inv.bankDetails)}</div>
        ` : ''}
        ${inv.paymentInstructions ? `
          <div style="margin-top: 8px; color: #475569;"><strong>Instructions:</strong> ${escapeHtml(inv.paymentInstructions)}</div>
        ` : ''}
      </div>
      <div>
        ${inv.notes ? `
          <div style="font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 4px;">Notes</div>
          <div style="white-space: pre-line; line-height: 1.5; color: #475569; margin-bottom: 8px;">${escapeHtml(inv.notes)}</div>
        ` : ''}
        ${inv.terms ? `
          <div style="font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 4px;">Terms & Conditions</div>
          <div style="white-space: pre-line; line-height: 1.5; color: #64748b;">${escapeHtml(inv.terms)}</div>
        ` : ''}
      </div>
    </div>
  </div>
  `;
}

// ============================================================================
// TEMPLATE 2: CORPORATE
// ============================================================================
function renderCorporateTemplate(inv) {
  const curr = inv.currency || 'USD';
  const logoHtml = inv.businessLogo 
    ? `<img src="${inv.businessLogo}" alt="${inv.businessName}" style="max-height: 50px; max-width: 170px; object-fit: contain; margin-bottom: 6px;" />` 
    : `<div style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">${inv.businessName || 'Business Name'}</div>`;

  const itemsRows = (inv.items || []).map((item, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 16px; color: #0f172a; font-weight: 500;">
        ${escapeHtml(item.description || 'Item description')}
      </td>
      <td style="padding: 12px 16px; text-align: center; color: #334155;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 16px; text-align: right; color: #334155;">
        ${formatCurrency(item.unitPrice, curr)}
      </td>
      <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #0f172a;">
        ${formatCurrency(item.total, curr)}
      </td>
    </tr>
  `).join('');

  return `
  <div class="invoice-sheet" style="font-family: 'Aeonik', sans-serif; color: #0f172a; background: #ffffff; min-height: 100%; box-sizing: border-box;">
    <!-- Corporate Header Banner -->
    <div style="background: #1e3a8a; color: #ffffff; padding: 36px 48px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        ${logoHtml}
        <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">
          ${escapeHtml(inv.businessEmail || '')} ${inv.businessPhone ? `• ${escapeHtml(inv.businessPhone)}` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 30px; font-weight: 700; letter-spacing: 0.05em; color: #ffffff;">INVOICE</div>
        <div style="font-size: 14px; font-weight: 500; color: #93c5fd; margin-top: 2px;">#${escapeHtml(inv.invoiceNumber)}</div>
      </div>
    </div>

    <div style="padding: 36px 48px;">
      <!-- Corporate Metadata Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; margin-bottom: 8px;">Client Information</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${escapeHtml(inv.clientCompany || inv.clientName || 'Client Name')}</div>
          ${inv.clientCompany && inv.clientName ? `<div style="font-size: 13px; color: #475569;">Contact: ${escapeHtml(inv.clientName)}</div>` : ''}
          <div style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4; white-space: pre-line;">${escapeHtml(inv.clientAddress || '')}</div>
          ${inv.clientEmail ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">Email: ${escapeHtml(inv.clientEmail)}</div>` : ''}
        </div>
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; background: #f8fafc;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; margin-bottom: 8px;">Invoice Summary</div>
          <div style="font-size: 12px; color: #475569; display: grid; grid-template-columns: 100px 1fr; gap: 6px;">
            <span style="font-weight: 600;">Issue Date:</span><span>${inv.issueDate || '—'}</span>
            <span style="font-weight: 600;">Due Date:</span><span style="color: #dc2626; font-weight: 600;">${inv.dueDate || '—'}</span>
            <span style="font-weight: 600;">Status:</span><span><span class="${getStatusBadgeClass(inv.status)}" style="padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${inv.status}</span></span>
            <span style="font-weight: 600;">Currency:</span><span>${inv.currency}</span>
          </div>
        </div>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
            <th style="padding: 12px 16px; text-align: left; font-weight: 700;">Service / Description</th>
            <th style="padding: 12px 16px; text-align: center; font-weight: 700; width: 70px;">Qty</th>
            <th style="padding: 12px 16px; text-align: right; font-weight: 700; width: 120px;">Unit Rate</th>
            <th style="padding: 12px 16px; text-align: right; font-weight: 700; width: 130px;">Line Total</th>
          </tr>
        </thead>
        <tbody style="font-size: 13px;">
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals & Bank Box -->
      <div style="display: grid; grid-template-columns: 1fr 300px; gap: 32px; margin-bottom: 32px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; font-size: 12px;">
          <div style="font-weight: 700; color: #1e3a8a; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 6px;">Remittance & Wire Transfer</div>
          <div style="white-space: pre-line; line-height: 1.5; color: #1e3a8a;">${escapeHtml(inv.bankDetails || 'Bank details not provided')}</div>
        </div>

        <div style="font-size: 13px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; color: #475569;">
            <span>Subtotal:</span>
            <span style="font-weight: 600; color: #0f172a;">${formatCurrency(inv.subtotal, curr)}</span>
          </div>
          ${inv.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #16a34a;">
              <span>Discount:</span>
              <span style="font-weight: 600;">-${formatCurrency(inv.discountAmount, curr)}</span>
            </div>
          ` : ''}
          ${inv.taxRate > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Tax (${inv.taxRate}%):</span>
              <span style="font-weight: 600; color: #0f172a;">+${formatCurrency(inv.taxAmount, curr)}</span>
            </div>
          ` : ''}
          ${inv.shipping > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Additional Charges:</span>
              <span style="font-weight: 600; color: #0f172a;">+${formatCurrency(inv.shipping, curr)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 10px 14px; margin-top: 8px; background: #1e3a8a; color: #ffffff; border-radius: 6px; font-size: 16px; font-weight: 700;">
            <span>Grand Total:</span>
            <span>${formatCurrency(inv.total, curr)}</span>
          </div>
        </div>
      </div>

      <!-- Corporate Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #64748b; line-height: 1.5;">
        ${inv.terms ? `<div><strong>Terms & Conditions:</strong> ${escapeHtml(inv.terms)}</div>` : ''}
        ${inv.notes ? `<div style="margin-top: 4px;"><strong>Notes:</strong> ${escapeHtml(inv.notes)}</div>` : ''}
      </div>
    </div>
  </div>
  `;
}

// ============================================================================
// TEMPLATE 3: CREATIVE (Pro)
// ============================================================================
function renderCreativeTemplate(inv) {
  const curr = inv.currency || 'USD';
  const logoHtml = inv.businessLogo 
    ? `<img src="${inv.businessLogo}" alt="${inv.businessName}" style="max-height: 52px; max-width: 180px; object-fit: contain; margin-bottom: 8px;" />` 
    : `<div style="font-size: 24px; font-weight: 800; color: #0284c7; letter-spacing: -0.02em;">${inv.businessName || 'Design Studio'}</div>`;

  const itemsRows = (inv.items || []).map((item, idx) => `
    <tr style="border-bottom: 1px dashed #cbd5e1;">
      <td style="padding: 14px 0; color: #0f172a;">
        <div style="font-weight: 700; font-size: 14px;">${escapeHtml(item.description || 'Creative Service')}</div>
      </td>
      <td style="padding: 14px 16px; text-align: center; color: #475569; font-weight: 600;">
        ${item.quantity}
      </td>
      <td style="padding: 14px 16px; text-align: right; color: #475569; font-weight: 500;">
        ${formatCurrency(item.unitPrice, curr)}
      </td>
      <td style="padding: 14px 0; text-align: right; font-weight: 700; color: #0284c7; font-size: 14px;">
        ${formatCurrency(item.total, curr)}
      </td>
    </tr>
  `).join('');

  return `
  <div class="invoice-sheet" style="font-family: 'Aeonik', sans-serif; color: #0f172a; background: #ffffff; min-height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
    <!-- Creative Accent Top Bar -->
    <div style="height: 8px; background: linear-gradient(90deg, #0284c7, #2563eb, #6366f1); width: 100%;"></div>

    <div style="padding: 44px 48px; flex: 1;">
      <!-- Creative Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px;">
        <div>
          ${logoHtml}
          <div style="font-size: 13px; color: #64748b; line-height: 1.4; margin-top: 4px;">
            ${escapeHtml(inv.businessEmail || '')}
            ${inv.businessWebsite ? `<div>${escapeHtml(inv.businessWebsite)}</div>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.1em;">Invoice Reference</div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">#${escapeHtml(inv.invoiceNumber)}</div>
          <div style="margin-top: 4px;">
            <span class="${getStatusBadgeClass(inv.status)}" style="padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${inv.status}</span>
          </div>
        </div>
      </div>

      <!-- Big Amount Banner -->
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin-bottom: 36px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0369a1; letter-spacing: 0.05em;">Total Amount Due</div>
          <div style="font-size: 32px; font-weight: 800; color: #0c4a6e; letter-spacing: -0.03em;">${formatCurrency(inv.total, curr)}</div>
        </div>
        <div style="text-align: right; font-size: 13px; color: #0369a1;">
          <div>Issue Date: <strong>${inv.issueDate || '—'}</strong></div>
          <div>Payment Due: <strong style="color: #0284c7;">${inv.dueDate || '—'}</strong></div>
        </div>
      </div>

      <!-- Client & Business Info Columns -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 36px;">
        <div>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.08em; margin-bottom: 6px;">Client Details</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${escapeHtml(inv.clientCompany || inv.clientName || 'Client Name')}</div>
          ${inv.clientCompany && inv.clientName ? `<div style="font-size: 13px; color: #475569;">${escapeHtml(inv.clientName)}</div>` : ''}
          <div style="font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.4; white-space: pre-line;">${escapeHtml(inv.clientAddress || '')}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.08em; margin-bottom: 6px;">From</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${escapeHtml(inv.businessName)}</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.4; white-space: pre-line;">${escapeHtml(inv.businessAddress || '')}</div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <thead>
          <tr style="border-bottom: 2px solid #0f172a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #0f172a;">
            <th style="padding: 10px 0; text-align: left; font-weight: 800;">Deliverable / Service</th>
            <th style="padding: 10px 16px; text-align: center; font-weight: 800; width: 70px;">Qty</th>
            <th style="padding: 10px 16px; text-align: right; font-weight: 800; width: 120px;">Rate</th>
            <th style="padding: 10px 0; text-align: right; font-weight: 800; width: 130px;">Total</th>
          </tr>
        </thead>
        <tbody style="font-size: 13px;">
          ${itemsRows}
        </tbody>
      </table>

      <!-- Subtotals -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 36px;">
        <div style="width: 260px; font-size: 13px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; color: #64748b;">
            <span>Subtotal:</span>
            <span style="font-weight: 600; color: #0f172a;">${formatCurrency(inv.subtotal, curr)}</span>
          </div>
          ${inv.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #16a34a;">
              <span>Discount:</span>
              <span style="font-weight: 600;">-${formatCurrency(inv.discountAmount, curr)}</span>
            </div>
          ` : ''}
          ${inv.taxRate > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #64748b;">
              <span>Tax (${inv.taxRate}%):</span>
              <span style="font-weight: 600; color: #0f172a;">+${formatCurrency(inv.taxAmount, curr)}</span>
            </div>
          ` : ''}
          ${inv.shipping > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #64748b;">
              <span>Shipping:</span>
              <span style="font-weight: 600; color: #0f172a;">+${formatCurrency(inv.shipping, curr)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Payment & Notes -->
      <div style="background: #fafafa; border: 1px solid #f1f5f9; border-radius: 8px; padding: 20px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div>
          <div style="font-weight: 700; color: #0284c7; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 4px;">Bank & Payment Info</div>
          <div style="white-space: pre-line; line-height: 1.5; color: #334155;">${escapeHtml(inv.bankDetails || 'Available upon request')}</div>
        </div>
        <div>
          <div style="font-weight: 700; color: #0284c7; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 4px;">Terms</div>
          <div style="white-space: pre-line; line-height: 1.5; color: #64748b;">${escapeHtml(inv.terms || 'Payment due upon receipt.')}</div>
        </div>
      </div>
    </div>
  </div>
  `;
}

// ============================================================================
// TEMPLATE 4: ELEGANT (Pro)
// ============================================================================
function renderElegantTemplate(inv) {
  const curr = inv.currency || 'USD';
  const logoHtml = inv.businessLogo 
    ? `<img src="${inv.businessLogo}" alt="${inv.businessName}" style="max-height: 54px; max-width: 180px; object-fit: contain; margin-bottom: 8px;" />` 
    : `<div style="font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: 0.08em; text-transform: uppercase;">${inv.businessName || 'Atelier'}</div>`;

  const itemsRows = (inv.items || []).map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 16px 0; color: #0f172a; font-weight: 500;">
        ${escapeHtml(item.description || 'Item description')}
      </td>
      <td style="padding: 16px 20px; text-align: center; color: #475569;">
        ${item.quantity}
      </td>
      <td style="padding: 16px 20px; text-align: right; color: #475569;">
        ${formatCurrency(item.unitPrice, curr)}
      </td>
      <td style="padding: 16px 0; text-align: right; font-weight: 600; color: #0f172a;">
        ${formatCurrency(item.total, curr)}
      </td>
    </tr>
  `).join('');

  return `
  <div class="invoice-sheet" style="font-family: 'Aeonik', sans-serif; color: #0f172a; background: #ffffff; padding: 56px; min-height: 100%; box-sizing: border-box; border: 1px solid #cbd5e1;">
    <!-- Elegant Header with Double Line Accent -->
    <div style="text-align: center; margin-bottom: 48px; border-bottom: 1px solid #0f172a; padding-bottom: 28px;">
      ${logoHtml}
      <div style="font-size: 12px; color: #64748b; letter-spacing: 0.05em; margin-top: 4px;">
        ${escapeHtml(inv.businessAddress || '')} • ${escapeHtml(inv.businessEmail || '')}
      </div>
      <div style="margin-top: 18px; display: inline-flex; align-items: center; gap: 16px;">
        <span style="height: 1px; width: 40px; background: #94a3b8;"></span>
        <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #0f172a;">INVOICE STATEMENT</span>
        <span style="height: 1px; width: 40px; background: #94a3b8;"></span>
      </div>
    </div>

    <!-- Metadata Row -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px;">
      <div>
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-bottom: 6px;">PREPARED FOR</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${escapeHtml(inv.clientCompany || inv.clientName || 'Client Name')}</div>
        ${inv.clientCompany && inv.clientName ? `<div style="color: #475569; margin-top: 2px;">Attn: ${escapeHtml(inv.clientName)}</div>` : ''}
        <div style="color: #64748b; margin-top: 4px; line-height: 1.4; white-space: pre-line;">${escapeHtml(inv.clientAddress || '')}</div>
      </div>
      <div style="text-align: right; line-height: 1.7;">
        <div><span style="color: #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Invoice No:</span> <strong style="color: #0f172a;">${escapeHtml(inv.invoiceNumber)}</strong></div>
        <div><span style="color: #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Date Issued:</span> <span>${inv.issueDate || '—'}</span></div>
        <div><span style="color: #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Payment Due:</span> <strong style="color: #0f172a;">${inv.dueDate || '—'}</strong></div>
        <div style="margin-top: 6px;"><span class="${getStatusBadgeClass(inv.status)}" style="padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${inv.status}</span></div>
      </div>
    </div>

    <!-- Elegant Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 36px;">
      <thead>
        <tr style="border-bottom: 1px solid #0f172a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #0f172a;">
          <th style="padding: 12px 0; text-align: left; font-weight: 700;">Particulars</th>
          <th style="padding: 12px 20px; text-align: center; font-weight: 700; width: 70px;">Qty</th>
          <th style="padding: 12px 20px; text-align: right; font-weight: 700; width: 120px;">Rate</th>
          <th style="padding: 12px 0; text-align: right; font-weight: 700; width: 130px;">Amount</th>
        </tr>
      </thead>
      <tbody style="font-size: 13px;">
        ${itemsRows}
      </tbody>
    </table>

    <!-- Elegant Totals -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
      <div style="width: 280px; font-size: 13px; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between; color: #64748b;">
          <span>Subtotal:</span>
          <span style="font-weight: 600; color: #0f172a;">${formatCurrency(inv.subtotal, curr)}</span>
        </div>
        ${inv.discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #16a34a;">
            <span>Discount:</span>
            <span style="font-weight: 600;">-${formatCurrency(inv.discountAmount, curr)}</span>
          </div>
        ` : ''}
        ${inv.taxRate > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #64748b;">
            <span>Tax (${inv.taxRate}%):</span>
            <span style="font-weight: 600; color: #0f172a;">+${formatCurrency(inv.taxAmount, curr)}</span>
          </div>
        ` : ''}
        ${inv.shipping > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #64748b;">
            <span>Shipping / Handling:</span>
            <span style="font-weight: 600; color: #0f172a;">+${formatCurrency(inv.shipping, curr)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 1px double #0f172a; font-size: 17px; font-weight: 700; color: #0f172a;">
          <span>Balance Due:</span>
          <span>${formatCurrency(inv.total, curr)}</span>
        </div>
      </div>
    </div>

    <!-- Settlement Details -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; font-size: 12px; color: #64748b; display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
      <div>
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; margin-bottom: 4px;">Settlement Details</div>
        <div style="white-space: pre-line; line-height: 1.5; color: #475569;">${escapeHtml(inv.bankDetails || 'Bank wire instructions available on file.')}</div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; margin-bottom: 4px;">Terms of Engagement</div>
        <div style="white-space: pre-line; line-height: 1.5; color: #475569;">${escapeHtml(inv.terms || 'Settlement expected strictly within contractual terms.')}</div>
      </div>
    </div>
  </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --- END js/templates.js --- */

/* --- START js/pdf-service.js --- */
/**
 * BillCraft - High-Fidelity PDF Generation & Print Service
 * Produces clean, selectable text A4 PDF documents matching invoice preview.
 */

function downloadInvoicePDF(invoice, containerElement) {
  if (!containerElement) {
    throw new Error('Invoice container element not found.');
  }

  const invoiceNum = invoice.invoiceNumber || 'Invoice';
  const clientName = (invoice.clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${invoiceNum}_${clientName}.pdf`;

  // Check if html2pdf is available
  if (window.html2pdf) {
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };

    return window.html2pdf().set(opt).from(containerElement).save();
  } else {
    // Fallback to print dialog
    printInvoice();
  }
}

function printInvoice() {
  window.print();
}

/* --- END js/pdf-service.js --- */

/* --- START js/ui.js --- */
/**
 * BillCraft - UI Rendering & View Controller
 * Builds all visual sections: Landing Page, Dashboard, Invoice Editor,
 * Client Management, Business Profile, Templates, and Modals.
 */

// [bundled import]
// [bundled import]
// [bundled import]
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
  } else {
    iconSvg = `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// LANDING PAGE RENDERER
// ============================================================================
function renderLandingPage() {
  const user = storage.getUser();
  const sampleInv = storage.getInvoices()[0] || {
    invoiceNumber: 'INV-2026-001',
    businessName: 'BillCraft Design Co.',
    clientName: 'Acme Corporation',
    issueDate: '2026-11-24',
    dueDate: '2026-12-08',
    currency: 'USD',
    templateId: 'minimal',
    status: 'paid',
    items: [
      { description: 'Product Brand Strategy', quantity: 1, unitPrice: 3200, total: 3200 },
      { description: 'SaaS Design System Architecture', quantity: 1, unitPrice: 4800, total: 4800 }
    ],
    subtotal: 8000,
    discountAmount: 0,
    taxRate: 8,
    taxAmount: 640,
    total: 8640
  };

  return `
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Navbar -->
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <div class="flex items-center gap-3 cursor-pointer" onclick="window.app.navigate('landing')">
          <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
            B
          </div>
          <div>
            <span class="text-xl font-bold tracking-tight text-slate-900">BillCraft</span>
            <span class="block text-[10px] uppercase tracking-wider font-semibold text-blue-600">Invoicing, made simple</span>
          </div>
        </div>

        <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#how-it-works" class="hover:text-blue-600 transition-colors">How It Works</a>
          <a href="#features" class="hover:text-blue-600 transition-colors">Features</a>
          <a href="#templates" class="hover:text-blue-600 transition-colors">Templates</a>
          <a href="#pricing" class="hover:text-blue-600 transition-colors">Pricing</a>
          <a href="#faq" class="hover:text-blue-600 transition-colors">FAQ</a>
        </nav>

        <div class="flex items-center gap-3">
          ${user.isGuest ? `
            <button onclick="window.app.openAuthModal('signin')" class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
              Log In
            </button>
            <button onclick="window.app.startNewInvoice()" class="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:shadow-blue-500/20">
              Create an Invoice
            </button>
          ` : `
            <button onclick="window.app.navigate('dashboard')" class="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition-all flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              Go to Dashboard
            </button>
          `}
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="py-16 md:py-24 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <!-- Hero Text -->
          <div class="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
              <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Modern Invoicing for Freelancers & Agencies
            </div>
            
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Create professional invoices <span class="text-blue-600">in minutes.</span>
            </h1>

            <p class="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Create, customize and download beautiful invoices without the hassle. BillCraft makes getting paid easier.
            </p>

            <div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button onclick="window.app.startNewInvoice()" class="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <span>Create an Invoice</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>

              <a href="#templates" class="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2">
                Explore Templates
              </a>
            </div>

            <div class="pt-6 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>No sign-up required to create</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>High-resolution PDF export</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Multiple currencies</span>
              </div>
            </div>
          </div>

          <!-- Hero Realistic Live Preview Card -->
          <div class="lg:col-span-6">
            <div class="relative mx-auto max-w-lg lg:max-w-none">
              <!-- Glow background -->
              <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-20"></div>
              
              <div class="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden">
                <div class="bg-slate-900 px-5 py-3 text-white flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span class="text-slate-400 font-mono ml-2">billcraft-live-preview.pdf</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">A4 Document</span>
                  </div>
                </div>

                <div class="p-6 bg-slate-100 max-h-[480px] overflow-y-auto">
                  <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 scale-95 origin-top transition-transform">
                    <div class="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <div class="text-lg font-bold text-slate-900">Apex Studio Creative</div>
                        <div class="text-xs text-slate-500">hello@apexstudio.io</div>
                      </div>
                      <div class="text-right">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Paid</span>
                        <div class="text-xs font-semibold text-slate-700 mt-1">#INV-2026-001</div>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 text-xs mb-4">
                      <div class="bg-slate-50 p-2.5 rounded">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Billed To</span>
                        <span class="font-bold text-slate-800">Acme Cloud Solutions</span>
                        <span class="text-slate-500 block">350 5th Avenue, New York</span>
                      </div>
                      <div class="bg-slate-50 p-2.5 rounded text-right">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Amount Due</span>
                        <span class="font-extrabold text-blue-600 text-sm">$9,482.90 USD</span>
                        <span class="text-slate-500 block text-[10px]">Due Nov 15, 2026</span>
                      </div>
                    </div>

                    <div class="border-t border-slate-200 pt-3">
                      <div class="flex justify-between text-xs py-1 text-slate-600">
                        <span>Brand Identity & Design System</span>
                        <span class="font-semibold text-slate-900">$4,200.00</span>
                      </div>
                      <div class="flex justify-between text-xs py-1 text-slate-600">
                        <span>Web Application UI/UX Architecture</span>
                        <span class="font-semibold text-slate-900">$5,000.00</span>
                      </div>
                      <div class="flex justify-between text-xs py-2 mt-2 border-t border-slate-200 font-bold text-slate-900">
                        <span>Total Paid</span>
                        <span class="text-blue-600">$9,482.90</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
                  <div class="text-xs text-slate-500">
                    Try editing this live right now
                  </div>
                  <button onclick="window.app.startNewInvoice()" class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all">
                    Open in Editor →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="py-20 bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Simple 4-Step Flow</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">How BillCraft Works</h2>
          <p class="text-slate-600 mt-3 text-base">From blank slate to a professional PDF invoice in less than 2 minutes.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative group hover:border-blue-300 transition-all">
            <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
              1
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Enter Business Details</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Add your company name, logo, contact information, and bank wire details once.</p>
          </div>

          <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative group hover:border-blue-300 transition-all">
            <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
              2
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Add Services & Prices</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Line items, quantities, unit prices, discounts, and taxes calculate automatically.</p>
          </div>

          <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative group hover:border-blue-300 transition-all">
            <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
              3
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Customize Layout</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Switch seamlessly between Minimal, Corporate, Creative, and Elegant templates.</p>
          </div>

          <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative group hover:border-blue-300 transition-all">
            <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
              4
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Download and Send</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Export a pristine vector A4 PDF with selectable text ready to send to your client.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 bg-slate-50 border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Enterprise Grade</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">Everything You Need to Bill Like a Pro</h2>
          <p class="text-slate-600 mt-3 text-base">Engineered with high fintech standards and seamless workflows.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Professional Templates</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Four distinct designs tailored for freelancers, agencies, corporate vendors, and creative studios.</p>
          </div>

          <div class="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Automatic Calculations</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Zero rounding errors. Live subtotal, discounts (flat or %), tax percentage, and additional fees calculated instantly.</p>
          </div>

          <div class="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Global Currencies</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Full support for USD, EUR, GBP, NGN, CAD, AUD, GHS, JPY, INR, ZAR, and more with exact symbols.</p>
          </div>

          <div class="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Selectable Text PDF Export</h3>
            <p class="text-sm text-slate-600 leading-relaxed">No raster screenshots. Renders genuine A4 PDF documents with sharp Aeonik typography and selectable text.</p>
          </div>

          <div class="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Full Invoice History</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Track invoices across Draft, Sent, Pending, Paid, and Overdue statuses with real computed dashboard metrics.</p>
          </div>

          <div class="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">Saved Business & Clients</h3>
            <p class="text-sm text-slate-600 leading-relaxed">Save company credentials, payment terms, and client rosters once to auto-populate invoices with one click.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Template Showcase Section -->
    <section id="templates" class="py-20 bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Design Variety</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">Crafted for Every Business Profile</h2>
          <p class="text-slate-600 mt-3 text-base">Select any template without re-entering your line items or customer data.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          ${TEMPLATES.map(tmpl => `
            <div class="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col">
              <div class="h-44 bg-slate-200 p-4 relative flex items-center justify-center overflow-hidden">
                <div class="w-3/4 h-full bg-white rounded shadow-sm border border-slate-300 p-3 transform rotate-1 scale-95 flex flex-col justify-between">
                  <div class="flex justify-between items-center border-b border-slate-100 pb-1">
                    <div class="w-12 h-2 bg-slate-800 rounded"></div>
                    <div class="w-6 h-2 bg-blue-600 rounded"></div>
                  </div>
                  <div class="space-y-1 my-2">
                    <div class="w-full h-1.5 bg-slate-200 rounded"></div>
                    <div class="w-4/5 h-1.5 bg-slate-200 rounded"></div>
                    <div class="w-3/5 h-1.5 bg-slate-200 rounded"></div>
                  </div>
                  <div class="flex justify-between items-center pt-1 border-t border-slate-100">
                    <div class="w-8 h-2 bg-slate-300 rounded"></div>
                    <div class="w-10 h-2 bg-slate-900 rounded"></div>
                  </div>
                </div>
                <span class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tmpl.tier === 'pro' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-200'}">
                  ${tmpl.badge}
                </span>
              </div>
              <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="font-bold text-slate-900 text-base">${tmpl.name}</h4>
                  <p class="text-xs text-slate-600 mt-1 leading-relaxed">${tmpl.description}</p>
                </div>
                <button onclick="window.app.startNewInvoice('${tmpl.id}')" class="mt-4 w-full py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-800 transition-colors">
                  Use ${tmpl.name} →
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-20 bg-slate-50 border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Transparent Pricing</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">Simple, Predictable Plans</h2>
          <p class="text-slate-600 mt-3 text-base">Start free and scale your billing as your business grows.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <!-- Free Plan -->
          <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mb-4">
                Starter
              </div>
              <h3 class="text-2xl font-bold text-slate-900">Free Tier</h3>
              <p class="text-sm text-slate-600 mt-1">Perfect for solo freelancers getting started.</p>
              
              <div class="mt-6 flex items-baseline gap-1">
                <span class="text-4xl font-extrabold text-slate-900">$0</span>
                <span class="text-slate-500 text-sm">/ month</span>
              </div>

              <ul class="mt-8 space-y-3.5 text-sm text-slate-600">
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Up to <strong>5 invoices per month</strong></span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Two core templates (Minimal & Corporate)</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Standard selectable text PDF downloads</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Basic client management</span>
                </li>
              </ul>
            </div>

            <button onclick="window.app.startNewInvoice()" class="mt-8 w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors">
              Get Started Free
            </button>
          </div>

          <!-- Pro Plan -->
          <div class="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-bl-xl">
              Recommended
            </div>

            <div>
              <div class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 mb-4">
                Unlimited Growth
              </div>
              <h3 class="text-2xl font-bold text-white">BillCraft Pro</h3>
              <p class="text-sm text-slate-400 mt-1">For active agencies, studios, and consultants.</p>
              
              <div class="mt-6 flex items-baseline gap-1">
                <span class="text-4xl font-extrabold text-white">$15</span>
                <span class="text-slate-400 text-sm">/ month</span>
              </div>

              <ul class="mt-8 space-y-3.5 text-sm text-slate-300">
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span><strong>Unlimited invoices</strong> (no monthly caps)</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>All 4 premium templates (including Creative & Elegant)</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Custom brand colors & high-res logo upload</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Unlimited clients & priority support</span>
                </li>
              </ul>
            </div>

            <button onclick="window.app.openUpgradeModal()" class="mt-8 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" class="py-20 bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Common Questions</span>
          <h2 class="text-3xl font-extrabold text-slate-900 mt-2">Frequently Asked Questions</h2>
        </div>

        <div class="space-y-4">
          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50">
            <h4 class="font-bold text-slate-900 text-base">Can I create an invoice without signing up?</h4>
            <p class="text-sm text-slate-600 mt-2 leading-relaxed">Yes! You can immediately use the invoice generator, customize line items, and download an A4 PDF without an account. You only need an account if you wish to store invoices permanently in your dashboard.</p>
          </div>

          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50">
            <h4 class="font-bold text-slate-900 text-base">Does BillCraft generate true selectable text PDFs?</h4>
            <p class="text-sm text-slate-600 mt-2 leading-relaxed">Yes. Unlike low-grade screenshot generators, BillCraft uses true PDF document rendering that produces crisp vectors and selectable text formatted specifically for standard A4 sheets.</p>
          </div>

          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50">
            <h4 class="font-bold text-slate-900 text-base">Can I switch between invoice templates without re-entering data?</h4>
            <p class="text-sm text-slate-600 mt-2 leading-relaxed">Absolutely. All items, client info, and calculation inputs are preserved when toggling between Minimal, Corporate, Creative, and Elegant layouts.</p>
          </div>

          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50">
            <h4 class="font-bold text-slate-900 text-base">Which currencies are supported?</h4>
            <p class="text-sm text-slate-600 mt-2 leading-relaxed">BillCraft supports USD, EUR, GBP, NGN, CAD, AUD, GHS, JPY, INR, ZAR, AED, CHF, and many others with correct regional symbols and decimal precision.</p>
          </div>

          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50">
            <h4 class="font-bold text-slate-900 text-base">Is my business information secure?</h4>
            <p class="text-sm text-slate-600 mt-2 leading-relaxed">Yes. BillCraft supports Supabase with strict Row Level Security (RLS) policies ensuring users only ever access their own invoices, clients, and profiles.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-slate-900 text-slate-400 py-12 text-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              B
            </div>
            <span class="text-lg font-bold text-white tracking-tight">BillCraft</span>
            <span class="text-xs text-slate-500 ml-2">Invoicing, made simple.</span>
          </div>

          <div class="flex items-center gap-6 text-xs">
            <a href="#features" class="hover:text-white transition-colors">Features</a>
            <a href="#templates" class="hover:text-white transition-colors">Templates</a>
            <a href="#pricing" class="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" class="hover:text-white transition-colors">FAQ</a>
            <button onclick="window.app.navigate('settings')" class="hover:text-white transition-colors">Supabase Config</button>
          </div>
        </div>

        <div class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 BillCraft SaaS Inc. All rights reserved. Strict Aeonik Typography.</p>
          <div class="flex items-center gap-4">
            <span class="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span class="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span class="hover:text-slate-400 cursor-pointer">Security</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
  `;
}

// ============================================================================
// DASHBOARD VIEW RENDERER
// ============================================================================
function renderDashboard() {
  const user = storage.getUser();
  const business = storage.getBusiness();
  const stats = storage.getDashboardStats();
  const invoices = storage.getInvoices();
  const monthlyCount = storage.getMonthlyCount();
  const isPro = storage.isPro();

  return `
  <div class="min-h-screen bg-slate-50 flex">
    <!-- App Sidebar -->
    ${renderSidebar('dashboard')}

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <!-- Top Bar -->
      <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
        <div class="flex items-center gap-4">
          <button onclick="window.app.toggleMobileSidebar()" class="lg:hidden text-slate-500 hover:text-slate-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 class="text-xl font-bold text-slate-900">Dashboard</h1>
        </div>

        <div class="flex items-center gap-4">
          <!-- Usage Counter Badge -->
          <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isPro ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-700'} text-xs font-semibold">
            ${isPro ? `
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Pro Plan (Unlimited Invoices)</span>
            ` : `
              <span>${monthlyCount} / 5 Invoices this month (Free)</span>
              <button onclick="window.app.openUpgradeModal()" class="text-blue-600 hover:underline ml-1">Upgrade</button>
            `}
          </div>

          <button onclick="window.app.startNewInvoice()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>Create Invoice</span>
          </button>
        </div>
      </header>

      <div class="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        <!-- Welcome Message -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-extrabold text-slate-900">Welcome back, ${escapeHtml(user.fullName || 'Creator')}</h2>
            <p class="text-sm text-slate-500 mt-1">Here is a real-time summary of ${escapeHtml(business.name || 'your business')} billing and cash flow.</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window.app.navigate('business')" class="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
              Business Profile
            </button>
            <button onclick="window.app.startNewInvoice()" class="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
              + New Invoice
            </button>
          </div>
        </div>

        <!-- Real Computed KPI Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Total Invoices -->
          <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Invoices</span>
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div class="text-2xl font-black text-slate-900 mt-3">${stats.totalCount}</div>
            <div class="text-xs text-slate-500 mt-1">Total created</div>
          </div>

          <!-- Total Value -->
          <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Value</span>
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div class="text-2xl font-black text-slate-900 mt-3">${formatCurrency(stats.totalValue, stats.primaryCurrency)}</div>
            <div class="text-xs text-slate-500 mt-1">Across all invoices</div>
          </div>

          <!-- Paid Invoices -->
          <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <span>Paid Invoices</span>
              <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <div class="text-2xl font-black text-emerald-700 mt-3">${formatCurrency(stats.paidValue, stats.primaryCurrency)}</div>
            <div class="text-xs text-slate-500 mt-1">${stats.paidCount} invoice${stats.paidCount === 1 ? '' : 's'} settled</div>
          </div>

          <!-- Pending Invoices -->
          <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center text-blue-600 text-xs font-bold uppercase tracking-wider">
              <span>Pending</span>
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div class="text-2xl font-black text-blue-700 mt-3">${formatCurrency(stats.pendingValue, stats.primaryCurrency)}</div>
            <div class="text-xs text-slate-500 mt-1">${stats.pendingCount} awaiting payment</div>
          </div>

          <!-- Overdue Invoices -->
          <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center text-rose-600 text-xs font-bold uppercase tracking-wider">
              <span>Overdue</span>
              <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div class="text-2xl font-black text-rose-700 mt-3">${formatCurrency(stats.overdueValue, stats.primaryCurrency)}</div>
            <div class="text-xs text-slate-500 mt-1">${stats.overdueCount} past due date</div>
          </div>
        </div>

        <!-- Invoices List Card -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Recent Invoices</h3>
              <p class="text-xs text-slate-500 mt-0.5">Manage, view, update status or download PDFs</p>
            </div>

            <!-- Filter Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <input 
                type="text" 
                id="invoice-search-input" 
                placeholder="Search invoice or client..." 
                oninput="window.app.filterInvoicesTable()"
                class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <select 
                id="invoice-status-filter" 
                onchange="window.app.filterInvoicesTable()"
                class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div id="invoices-table-container">
            ${renderInvoicesTable(invoices)}
          </div>
        </div>
      </div>
    </main>
  </div>
  `;
}

function renderInvoicesTable(invoices) {
  if (!invoices || invoices.length === 0) {
    return `
      <div class="p-12 text-center">
        <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </div>
        <h4 class="text-base font-bold text-slate-900">No invoices yet</h4>
        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create your first invoice to bill clients and start tracking payments.</p>
        <button onclick="window.app.startNewInvoice()" class="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
          Create New Invoice
        </button>
      </div>
    `;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-slate-700">
        <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
          <tr>
            <th class="px-6 py-3.5">Invoice #</th>
            <th class="px-6 py-3.5">Client</th>
            <th class="px-6 py-3.5">Issue Date</th>
            <th class="px-6 py-3.5">Due Date</th>
            <th class="px-6 py-3.5">Amount</th>
            <th class="px-6 py-3.5">Status</th>
            <th class="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${invoices.map(inv => `
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-6 py-4 font-bold text-slate-900">
                <span class="text-blue-600 hover:underline cursor-pointer" onclick="window.app.previewInvoiceModal('${inv.id}')">
                  ${escapeHtml(inv.invoiceNumber)}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="font-semibold text-slate-800">${escapeHtml(inv.clientCompany || inv.clientName || 'Unnamed Client')}</div>
                ${inv.clientCompany && inv.clientName ? `<div class="text-xs text-slate-400">${escapeHtml(inv.clientName)}</div>` : ''}
              </td>
              <td class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                ${inv.issueDate || '—'}
              </td>
              <td class="px-6 py-4 text-xs whitespace-nowrap font-medium ${inv.status === 'overdue' ? 'text-rose-600' : 'text-slate-600'}">
                ${inv.dueDate || '—'}
              </td>
              <td class="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                ${formatCurrency(inv.total, inv.currency)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <select 
                  onchange="window.app.changeInvoiceStatus('${inv.id}', this.value)"
                  class="text-xs font-semibold rounded-full px-2.5 py-1 border cursor-pointer focus:outline-none ${getStatusSelectStyle(inv.status)}"
                >
                  <option value="draft" ${inv.status === 'draft' ? 'selected' : ''}>Draft</option>
                  <option value="sent" ${inv.status === 'sent' ? 'selected' : ''}>Sent</option>
                  <option value="pending" ${inv.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="paid" ${inv.status === 'paid' ? 'selected' : ''}>Paid</option>
                  <option value="overdue" ${inv.status === 'overdue' ? 'selected' : ''}>Overdue</option>
                </select>
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap space-x-2">
                <button onclick="window.app.previewInvoiceModal('${inv.id}')" title="View Preview" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </button>
                <button onclick="window.app.editInvoice('${inv.id}')" title="Edit Invoice" class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button onclick="window.app.downloadInvoiceDirect('${inv.id}')" title="Download PDF" class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </button>
                <button onclick="window.app.deleteInvoicePrompt('${inv.id}')" title="Delete" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function getStatusSelectStyle(status) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    case 'pending':
    case 'sent':
      return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'overdue':
      return 'bg-rose-50 text-rose-800 border-rose-300';
    case 'draft':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
}

// ============================================================================
// SIDEBAR NAVIGATION
// ============================================================================
function renderSidebar(activeTab = 'dashboard') {
  const user = storage.getUser();
  const business = storage.getBusiness();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>' },
    { id: 'invoices', label: 'Invoices', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>' },
    { id: 'clients', label: 'Clients', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>' },
    { id: 'templates', label: 'Templates', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>' },
    { id: 'business', label: 'Business Profile', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>' },
    { id: 'settings', label: 'Settings', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>' }
  ];

  return `
  <aside id="app-sidebar" class="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between hidden lg:flex shrink-0 min-h-screen">
    <div>
      <!-- Brand Logo -->
      <div class="h-16 px-6 flex items-center gap-3 border-b border-slate-800 cursor-pointer" onclick="window.app.navigate('dashboard')">
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
          B
        </div>
        <div>
          <span class="text-base font-bold text-white tracking-tight">BillCraft</span>
          <span class="block text-[9px] uppercase tracking-wider font-semibold text-blue-400">Invoicing, made simple</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="p-4 space-y-1">
        ${navItems.map(item => `
          <button 
            onclick="window.app.navigate('${item.id}')"
            class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${item.icon}</svg>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- User Profile & Sign Out Footer -->
    <div class="p-4 border-t border-slate-800">
      <div class="p-3 rounded-xl bg-slate-800/80 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs font-bold text-white truncate">${escapeHtml(user.fullName || 'User')}</div>
          <div class="text-[11px] text-slate-400 truncate">${escapeHtml(user.email || 'guest@billcraft.io')}</div>
        </div>
        <button onclick="window.app.signOutUser()" title="Sign Out" class="text-slate-400 hover:text-rose-400 p-1.5 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <button onclick="window.app.navigate('landing')" class="hover:text-slate-400">← Landing Page</button>
        <span class="font-mono text-[10px]">v1.0 • Aeonik</span>
      </div>
    </div>
  </aside>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --- END js/ui.js --- */

/* --- START js/editor-ui.js --- */
/**
 * BillCraft - Invoice Editor & Live Preview UI
 * Two-column desktop layout with instant real-time calculations
 * and selectable-text A4 preview.
 */

// [bundled import]
// [bundled import]
// [bundled import]
function renderInvoiceEditor(existingInvoice = null) {
  const business = storage.getBusiness();
  const clients = storage.getClients();
  const nextNumber = storage.getNextInvoiceNumber();

  // Create or load active invoice state
  const today = new Date().toISOString().slice(0, 10);
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const invoice = existingInvoice ? { ...existingInvoice } : {
    id: null,
    invoiceNumber: nextNumber,
    clientId: clients[0]?.id || '',
    clientName: clients[0]?.name || '',
    clientCompany: clients[0]?.companyName || '',
    clientEmail: clients[0]?.email || '',
    clientPhone: clients[0]?.phone || '',
    clientAddress: clients[0]?.address || '',
    businessName: business.name || '',
    businessEmail: business.email || '',
    businessPhone: business.phone || '',
    businessAddress: business.address || '',
    businessWebsite: business.website || '',
    businessLogo: business.logo || '',
    issueDate: today,
    dueDate: inTwoWeeks,
    currency: business.defaultCurrency || 'USD',
    templateId: 'minimal',
    status: 'draft',
    items: [
      { id: 'item_1', description: 'Design & Engineering Services', quantity: 1, unitPrice: 1500.00, total: 1500.00 }
    ],
    subtotal: 1500.00,
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0.00,
    taxRate: 0,
    taxAmount: 0.00,
    shipping: 0,
    total: 1500.00,
    paymentInstructions: 'Bank wire transfer or ACH',
    bankDetails: business.bankDetails || '',
    notes: business.defaultNotes || 'Thank you for your business.',
    terms: business.defaultTerms || 'Payment due within 14 calendar days.'
  };

  // Attach to window for live manipulation
  window.currentEditorInvoice = calculateInvoice(invoice);

  return `
  <div class="min-h-screen bg-slate-100 flex flex-col">
    <!-- Top Action Toolbar -->
    <header class="bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div class="flex items-center gap-3">
        <button onclick="window.app.navigate('dashboard')" class="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors" title="Back to Dashboard">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <div>
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>${existingInvoice ? 'Edit Invoice' : 'New Invoice'}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold uppercase tracking-wider" id="editor-header-num">${invoice.invoiceNumber}</span>
          </h2>
          <span class="text-[11px] text-slate-400">Live updating preview • Aeonik font</span>
        </div>
      </div>

      <!-- Mobile Tab Switcher (Editor / Preview) -->
      <div class="flex lg:hidden rounded-lg bg-slate-100 p-1 text-xs font-semibold">
        <button id="mobile-tab-form" onclick="window.app.switchMobileTab('form')" class="px-3 py-1 rounded-md bg-white shadow-sm text-slate-900">Form</button>
        <button id="mobile-tab-preview" onclick="window.app.switchMobileTab('preview')" class="px-3 py-1 rounded-md text-slate-600">Preview</button>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 sm:gap-3">
        <button onclick="window.app.triggerPrint()" class="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 transition-all shadow-sm">
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          <span>Print</span>
        </button>

        <button onclick="window.app.triggerDownloadPDF()" class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          <span>Download PDF</span>
        </button>

        <button onclick="window.app.saveCurrentInvoice()" class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
          <span>Save Invoice</span>
        </button>
      </div>
    </header>

    <!-- Split Screen Work Area -->
    <div class="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- LEFT COLUMN: Form Editor (lg:col-span-6) -->
      <div id="editor-form-pane" class="lg:col-span-6 space-y-6">
        
        <!-- Template & Currency Picker Strip -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Invoice Template</label>
              <div class="flex flex-wrap gap-2">
                ${TEMPLATES.map(t => `
                  <button 
                    type="button" 
                    onclick="window.app.changeTemplate('${t.id}')"
                    id="template-btn-${t.id}"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${invoice.templateId === t.id ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}"
                  >
                    <span>${t.name}</span>
                    ${t.tier === 'pro' ? '<span class="ml-1 text-[9px] px-1 rounded bg-amber-200 text-amber-900 font-bold">PRO</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Currency</label>
              <select 
                id="inv-currency" 
                onchange="window.app.updateInvoiceField('currency', this.value)"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                ${CURRENCIES.map(c => `
                  <option value="${c.code}" ${invoice.currency === c.code ? 'selected' : ''}>
                    ${c.code} (${c.symbol}) - ${c.name}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Section A: Business Details -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">A</span>
              <span>Your Business Information</span>
            </h3>
            <button onclick="window.app.populateBusinessProfile()" class="text-xs text-blue-600 hover:underline font-semibold">
              ↺ Load Saved Profile
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Business / Freelancer Name *</label>
              <input 
                type="text" 
                id="inv-businessName" 
                value="${escapeHtml(invoice.businessName)}" 
                oninput="window.app.updateInvoiceField('businessName', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Apex Studio LLC"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Business Logo</label>
              <div class="flex items-center gap-3">
                <input 
                  type="file" 
                  id="inv-logo-upload" 
                  accept="image/*" 
                  onchange="window.app.handleLogoUpload(event)"
                  class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                ${invoice.businessLogo ? `
                  <button onclick="window.app.removeLogo()" class="text-[11px] text-rose-600 hover:underline">Remove</button>
                ` : ''}
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input 
                type="email" 
                id="inv-businessEmail" 
                value="${escapeHtml(invoice.businessEmail)}" 
                oninput="window.app.updateInvoiceField('businessEmail', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="billing@apexstudio.io"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input 
                type="text" 
                id="inv-businessPhone" 
                value="${escapeHtml(invoice.businessPhone)}" 
                oninput="window.app.updateInvoiceField('businessPhone', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="+1 (415) 890-4321"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">Business Address</label>
              <textarea 
                id="inv-businessAddress" 
                rows="2"
                oninput="window.app.updateInvoiceField('businessAddress', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="742 Montgomery St, Suite 400&#10;San Francisco, CA 94111"
              >${escapeHtml(invoice.businessAddress)}</textarea>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">Website (Optional)</label>
              <input 
                type="url" 
                id="inv-businessWebsite" 
                value="${escapeHtml(invoice.businessWebsite)}" 
                oninput="window.app.updateInvoiceField('businessWebsite', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="https://apexstudio.io"
              />
            </div>
          </div>
        </div>

        <!-- Section B: Client Information -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">B</span>
              <span>Client Information</span>
            </h3>

            <!-- Pick Saved Client Dropdown -->
            <div class="flex items-center gap-2">
              <select 
                onchange="window.app.handleSelectSavedClient(this.value)"
                class="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:outline-none font-semibold text-slate-700"
              >
                <option value="">-- Choose Saved Client --</option>
                ${clients.map(c => `
                  <option value="${c.id}" ${invoice.clientId === c.id ? 'selected' : ''}>
                    ${escapeHtml(c.companyName || c.name)}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Company Name</label>
              <input 
                type="text" 
                id="inv-clientCompany" 
                value="${escapeHtml(invoice.clientCompany)}" 
                oninput="window.app.updateInvoiceField('clientCompany', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Acme Cloud Solutions"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Contact Person Name</label>
              <input 
                type="text" 
                id="inv-clientName" 
                value="${escapeHtml(invoice.clientName)}" 
                oninput="window.app.updateInvoiceField('clientName', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Sarah Jenkins"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Client Email</label>
              <input 
                type="email" 
                id="inv-clientEmail" 
                value="${escapeHtml(invoice.clientEmail)}" 
                oninput="window.app.updateInvoiceField('clientEmail', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="finance@acmecloud.io"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Client Phone</label>
              <input 
                type="text" 
                id="inv-clientPhone" 
                value="${escapeHtml(invoice.clientPhone)}" 
                oninput="window.app.updateInvoiceField('clientPhone', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="+1 (212) 555-0199"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">Billing Address</label>
              <textarea 
                id="inv-clientAddress" 
                rows="2"
                oninput="window.app.updateInvoiceField('clientAddress', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="350 5th Avenue, 42nd Floor&#10;New York, NY 10118"
              >${escapeHtml(invoice.clientAddress)}</textarea>
            </div>
          </div>
        </div>

        <!-- Section C: Invoice Metadata -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">C</span>
              <span>Invoice Details</span>
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Invoice Number *</label>
              <input 
                type="text" 
                id="inv-invoiceNumber" 
                value="${escapeHtml(invoice.invoiceNumber)}" 
                oninput="window.app.updateInvoiceField('invoiceNumber', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Issue Date</label>
              <input 
                type="date" 
                id="inv-issueDate" 
                value="${invoice.issueDate}" 
                onchange="window.app.updateInvoiceField('issueDate', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
              <input 
                type="date" 
                id="inv-dueDate" 
                value="${invoice.dueDate}" 
                onchange="window.app.updateInvoiceField('dueDate', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <!-- Section D: Invoice Items -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">D</span>
              <span>Line Items & Pricing</span>
            </h3>
            <button onclick="window.app.addInvoiceItem()" class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <span>Add Item</span>
            </button>
          </div>

          <div id="invoice-items-container" class="space-y-3">
            ${renderEditorItems(invoice.items, invoice.currency)}
          </div>
        </div>

        <!-- Section E: Additional Charges & Adjustments -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">E</span>
              <span>Taxes, Discounts & Fees</span>
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Discount -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Discount</label>
              <div class="flex gap-1">
                <input 
                  type="number" 
                  step="0.01" 
                  id="inv-discountValue" 
                  value="${invoice.discountValue || 0}" 
                  oninput="window.app.updateInvoiceCalculationField('discountValue', this.value)"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <select 
                  id="inv-discountType" 
                  onchange="window.app.updateInvoiceCalculationField('discountType', this.value)"
                  class="px-2 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                >
                  <option value="percentage" ${invoice.discountType === 'percentage' ? 'selected' : ''}>%</option>
                  <option value="flat" ${invoice.discountType === 'flat' ? 'selected' : ''}>Flat</option>
                </select>
              </div>
            </div>

            <!-- Tax -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Tax Percentage (%)</label>
              <input 
                type="number" 
                step="0.01" 
                id="inv-taxRate" 
                value="${invoice.taxRate || 0}" 
                oninput="window.app.updateInvoiceCalculationField('taxRate', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g. 8.5"
              />
            </div>

            <!-- Shipping -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Shipping / Extra Charges</label>
              <input 
                type="number" 
                step="0.01" 
                id="inv-shipping" 
                value="${invoice.shipping || 0}" 
                oninput="window.app.updateInvoiceCalculationField('shipping', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <!-- Section F: Payment Instructions & Notes -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">F</span>
              <span>Payment Instructions & Terms</span>
            </h3>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Bank Account & Wire Transfer Details</label>
              <textarea 
                id="inv-bankDetails" 
                rows="2"
                oninput="window.app.updateInvoiceField('bankDetails', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Bank Name, Account #, Routing, SWIFT..."
              >${escapeHtml(invoice.bankDetails)}</textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Payment Instructions</label>
                <input 
                  type="text" 
                  id="inv-paymentInstructions" 
                  value="${escapeHtml(invoice.paymentInstructions)}" 
                  oninput="window.app.updateInvoiceField('paymentInstructions', this.value)"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="ACH, Wire or Stripe payment link"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Payment Status</label>
                <select 
                  id="inv-status" 
                  onchange="window.app.updateInvoiceField('status', this.value)"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="draft" ${invoice.status === 'draft' ? 'selected' : ''}>Draft</option>
                  <option value="sent" ${invoice.status === 'sent' ? 'selected' : ''}>Sent</option>
                  <option value="pending" ${invoice.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Paid</option>
                  <option value="overdue" ${invoice.status === 'overdue' ? 'selected' : ''}>Overdue</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Notes to Client</label>
              <textarea 
                id="inv-notes" 
                rows="2"
                oninput="window.app.updateInvoiceField('notes', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >${escapeHtml(invoice.notes)}</textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Terms & Conditions</label>
              <textarea 
                id="inv-terms" 
                rows="2"
                oninput="window.app.updateInvoiceField('terms', this.value)"
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >${escapeHtml(invoice.terms)}</textarea>
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT COLUMN: Live A4 Invoice Preview (lg:col-span-6) -->
      <div id="editor-preview-pane" class="lg:col-span-6 sticky top-20 hidden lg:block">
        <div class="bg-slate-200/60 p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-inner flex flex-col items-center">
          
          <div class="w-full flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
            <span class="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live A4 Preview
            </span>
            <span class="text-[11px] font-mono">210mm × 297mm • Aeonik</span>
          </div>

          <!-- The Live Printable Document Sheet -->
          <div id="invoice-preview-capture" class="a4-document-container w-full bg-white shadow-2xl">
            ${renderInvoiceHTML(window.currentEditorInvoice)}
          </div>
        </div>
      </div>

    </div>
  </div>
  `;
}

function renderEditorItems(items = [], currency = 'USD') {
  return items.map((item, idx) => `
    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2" id="item-row-${idx}">
      <div class="flex items-start gap-2">
        <div class="flex-1">
          <input 
            type="text" 
            placeholder="Service / item description..." 
            value="${escapeHtml(item.description)}" 
            oninput="window.app.updateItemField(${idx}, 'description', this.value)"
            class="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>
        <button onclick="window.app.removeInvoiceItem(${idx})" title="Remove item" class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] text-slate-500 font-bold uppercase">Qty</label>
          <input 
            type="number" 
            step="1" 
            min="1" 
            value="${item.quantity}" 
            oninput="window.app.updateItemField(${idx}, 'quantity', this.value)"
            class="w-full px-2 py-1 text-xs rounded-md border border-slate-300 font-semibold"
          />
        </div>
        <div>
          <label class="block text-[10px] text-slate-500 font-bold uppercase">Rate (${currency})</label>
          <input 
            type="number" 
            step="0.01" 
            min="0" 
            value="${item.unitPrice}" 
            oninput="window.app.updateItemField(${idx}, 'unitPrice', this.value)"
            class="w-full px-2 py-1 text-xs rounded-md border border-slate-300 font-semibold"
          />
        </div>
        <div>
          <label class="block text-[10px] text-slate-500 font-bold uppercase">Total</label>
          <div class="px-2 py-1 text-xs rounded-md bg-white border border-slate-200 font-bold text-slate-900 truncate">
            ${formatCurrency(item.total, currency)}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --- END js/editor-ui.js --- */

/* --- START js/clients-ui.js --- */
/**
 * BillCraft - Client Management View
 * Add, edit, save, delete clients, and auto-populate invoices.
 */

// [bundled import]
// [bundled import]
function renderClientsView() {
  const clients = storage.getClients();
  const invoices = storage.getInvoices();

  return `
  <div class="min-h-screen bg-slate-50 flex">
    ${renderSidebar('clients')}

    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
        <div class="flex items-center gap-4">
          <button onclick="window.app.toggleMobileSidebar()" class="lg:hidden text-slate-500 hover:text-slate-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 class="text-xl font-bold text-slate-900">Clients</h1>
        </div>

        <button onclick="window.app.openClientModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Add New Client</span>
        </button>
      </header>

      <div class="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900">Client Directory</h2>
            <p class="text-xs text-slate-500 mt-1">Saved clients automatically populate billing information during invoice creation.</p>
          </div>
          <div class="text-xs text-slate-500 font-semibold">
            ${clients.length} Saved Client${clients.length === 1 ? '' : 's'}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${clients.map(client => {
            const clientInvoices = invoices.filter(inv => inv.clientId === client.id || inv.clientName === client.name);
            const totalBilled = clientInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

            return `
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
              <div>
                <div class="flex justify-between items-start mb-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm">
                    ${(client.companyName || client.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div class="flex items-center gap-1">
                    <button onclick="window.app.openClientModal('${client.id}')" title="Edit Client" class="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="window.app.deleteClientPrompt('${client.id}')" title="Delete Client" class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>

                <h3 class="font-bold text-slate-900 text-base">${escapeHtml(client.companyName || client.name)}</h3>
                ${client.companyName && client.name ? `<div class="text-xs text-slate-500 font-medium">Attn: ${escapeHtml(client.name)}</div>` : ''}

                <div class="mt-4 space-y-1.5 text-xs text-slate-600">
                  ${client.email ? `
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <span class="truncate">${escapeHtml(client.email)}</span>
                    </div>
                  ` : ''}
                  ${client.phone ? `
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                      <span>${escapeHtml(client.phone)}</span>
                    </div>
                  ` : ''}
                  ${client.address ? `
                    <div class="text-slate-400 pt-1 text-[11px] line-clamp-2">
                      ${escapeHtml(client.address)}
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div class="text-xs">
                  <span class="text-slate-400 block text-[10px] uppercase font-bold">Invoices</span>
                  <span class="font-bold text-slate-800">${clientInvoices.length} created</span>
                </div>
                <button onclick="window.app.createInvoiceForClient('${client.id}')" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition-colors">
                  + Invoice Client
                </button>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    </main>
  </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --- END js/clients-ui.js --- */

/* --- START js/business-ui.js --- */
/**
 * BillCraft - Business Profile View
 * Save business identity, contact info, default terms, and bank details once.
 */

// [bundled import]
// [bundled import]
function renderBusinessProfileView() {
  const business = storage.getBusiness();

  return `
  <div class="min-h-screen bg-slate-50 flex">
    ${renderSidebar('business')}

    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
        <div class="flex items-center gap-4">
          <button onclick="window.app.toggleMobileSidebar()" class="lg:hidden text-slate-500 hover:text-slate-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 class="text-xl font-bold text-slate-900">Business Profile</h1>
        </div>

        <button onclick="window.app.saveBusinessProfileForm()" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <span>Save Changes</span>
        </button>
      </header>

      <div class="p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Your Business Details</h2>
          <p class="text-xs text-slate-500 mt-1">These details automatically populate onto every newly generated invoice.</p>
        </div>

        <form id="business-profile-form" onsubmit="window.app.saveBusinessProfileForm(event)" class="space-y-6">
          <!-- Card 1: Identity & Logo -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Company Brand & Logo</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Company / Studio Name *</label>
                <input 
                  type="text" 
                  id="biz-name" 
                  name="name"
                  value="${escapeHtml(business.name)}" 
                  required
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Default Invoicing Currency</label>
                <select 
                  id="biz-currency" 
                  name="defaultCurrency"
                  class="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  ${CURRENCIES.map(c => `
                    <option value="${c.code}" ${business.defaultCurrency === c.code ? 'selected' : ''}>
                      ${c.code} (${c.symbol}) - ${c.name}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 mb-1">Company Logo</label>
                <div class="flex items-center gap-4">
                  <div id="biz-logo-preview" class="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                    ${business.logo ? `
                      <img src="${business.logo}" alt="Logo" class="max-w-full max-h-full object-contain" />
                    ` : `
                      <span class="text-slate-400 text-xs">No Logo</span>
                    `}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      id="biz-logo-input" 
                      accept="image/*" 
                      onchange="window.app.handleBusinessLogoUpload(event)"
                      class="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <div class="text-[10px] text-slate-400 mt-1">PNG, JPG or SVG. Optimal size: 300x100px.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Contact Information -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Contact Information</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Billing Email</label>
                <input 
                  type="email" 
                  id="biz-email" 
                  name="email"
                  value="${escapeHtml(business.email)}" 
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  id="biz-phone" 
                  name="phone"
                  value="${escapeHtml(business.phone)}" 
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 mb-1">Physical / Postal Address</label>
                <textarea 
                  id="biz-address" 
                  name="address"
                  rows="2"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >${escapeHtml(business.address)}</textarea>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 mb-1">Website URL</label>
                <input 
                  type="url" 
                  id="biz-website" 
                  name="website"
                  value="${escapeHtml(business.website)}" 
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <!-- Card 3: Default Payment Terms & Bank Wire -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Default Wire Transfer & Terms</h3>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Default Bank Wire / ACH Details</label>
                <textarea 
                  id="biz-bankDetails" 
                  name="bankDetails"
                  rows="3"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Bank Name, Routing #, Account #, SWIFT/BIC code..."
                >${escapeHtml(business.bankDetails)}</textarea>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Default Payment Terms & Conditions</label>
                <textarea 
                  id="biz-terms" 
                  name="defaultTerms"
                  rows="2"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >${escapeHtml(business.defaultTerms)}</textarea>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Default Notes to Client</label>
                <textarea 
                  id="biz-notes" 
                  name="defaultNotes"
                  rows="2"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >${escapeHtml(business.defaultNotes)}</textarea>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all">
              Save Business Profile
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --- END js/business-ui.js --- */

/* --- START js/templates-ui.js --- */
/**
 * BillCraft - Templates Showcase View
 */

// [bundled import]
// [bundled import]
// [bundled import]
function renderTemplatesView() {
  const isPro = storage.isPro();

  return `
  <div class="min-h-screen bg-slate-50 flex">
    ${renderSidebar('templates')}

    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
        <div class="flex items-center gap-4">
          <button onclick="window.app.toggleMobileSidebar()" class="lg:hidden text-slate-500 hover:text-slate-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 class="text-xl font-bold text-slate-900">Invoice Templates</h1>
        </div>
      </header>

      <div class="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Select an Invoice Design</h2>
          <p class="text-xs text-slate-500 mt-1">All templates support our strict Aeonik typography, live calculations, and clean A4 PDF export.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${TEMPLATES.map(tmpl => {
            const isLocked = tmpl.tier === 'pro' && !isPro;

            return `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-blue-400 transition-all">
              <div>
                <div class="h-48 bg-slate-100 p-4 relative flex items-center justify-center border-b border-slate-100">
                  <div class="w-4/5 h-full bg-white rounded shadow-sm border border-slate-200 p-3 flex flex-col justify-between">
                    <div class="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <div class="w-16 h-2 rounded" style="background-color: ${tmpl.previewColor};"></div>
                      <div class="w-8 h-2 bg-blue-600 rounded"></div>
                    </div>
                    <div class="space-y-1.5 my-2">
                      <div class="w-full h-1.5 bg-slate-100 rounded"></div>
                      <div class="w-4/5 h-1.5 bg-slate-100 rounded"></div>
                      <div class="w-2/3 h-1.5 bg-slate-100 rounded"></div>
                    </div>
                    <div class="flex justify-between items-center pt-1.5 border-t border-slate-100">
                      <div class="w-10 h-2 bg-slate-200 rounded"></div>
                      <div class="w-12 h-2.5 rounded font-bold" style="background-color: ${tmpl.previewColor};"></div>
                    </div>
                  </div>

                  <span class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tmpl.tier === 'pro' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-700'}">
                    ${tmpl.badge}
                  </span>
                </div>

                <div class="p-5">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 text-base">${tmpl.name}</h3>
                    <span class="text-[11px] font-bold uppercase ${tmpl.tier === 'pro' ? 'text-amber-600' : 'text-slate-400'}">
                      ${tmpl.tier === 'pro' ? 'Pro Tier' : 'Free Tier'}
                    </span>
                  </div>
                  <p class="text-xs text-slate-600 mt-2 leading-relaxed">${tmpl.description}</p>
                </div>
              </div>

              <div class="p-5 pt-0">
                ${isLocked ? `
                  <button onclick="window.app.openUpgradeModal()" class="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
                    <span>Unlock with Pro</span>
                  </button>
                ` : `
                  <button onclick="window.app.startNewInvoice('${tmpl.id}')" class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors">
                    Use This Template →
                  </button>
                `}
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    </main>
  </div>
  `;
}

/* --- END js/templates-ui.js --- */

/* --- START js/settings-ui.js --- */
/**
 * BillCraft - Settings & Supabase Configuration View
 */

// [bundled import]
// [bundled import]
// [bundled import]
function renderSettingsView() {
  const user = storage.getUser();
  const config = storage.getSupabaseConfig();
  const isPro = storage.isPro();

  return `
  <div class="min-h-screen bg-slate-50 flex">
    ${renderSidebar('settings')}

    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
        <div class="flex items-center gap-4">
          <button onclick="window.app.toggleMobileSidebar()" class="lg:hidden text-slate-500 hover:text-slate-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 class="text-xl font-bold text-slate-900">Settings & Backend</h1>
        </div>
      </header>

      <div class="p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Application Configuration</h2>
          <p class="text-xs text-slate-500 mt-1">Manage cloud database synchronization, user subscription, and account preferences.</p>
        </div>

        <!-- Card 1: Subscription Tier -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Subscription Plan</h3>
              <p class="text-xs text-slate-500">Your current plan determines template access and invoice creation limits.</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${isPro ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-200'}">
              ${isPro ? 'Pro Member' : 'Free Tier (5 Invoices/mo)'}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div>
              <div class="text-sm font-bold text-slate-800">Switch Plan Mode</div>
              <div class="text-xs text-slate-500">Toggle between Free (5-invoice cap, 2 templates) and Pro (unlimited invoices, 4 templates) to test monetization rules.</div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                onclick="window.app.togglePlan('free')" 
                class="px-4 py-2 rounded-lg text-xs font-semibold border ${!isPro ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}"
              >
                Free Plan
              </button>
              <button 
                onclick="window.app.togglePlan('pro')" 
                class="px-4 py-2 rounded-lg text-xs font-semibold border ${isPro ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}"
              >
                Pro Plan
              </button>
            </div>
          </div>
        </div>

        <!-- Card 2: Supabase Backend Integration -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Supabase Cloud Integration</span>
                <span class="w-2.5 h-2.5 rounded-full ${config.connected ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
              </h3>
              <p class="text-xs text-slate-500">Connect your Supabase project for real cloud auth, PostgreSQL storage, and Row Level Security.</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded ${config.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
              ${config.connected ? 'Cloud Connected' : 'Local Persistence Active'}
            </span>
          </div>

          <form onsubmit="window.app.handleSaveSupabaseConfig(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Supabase Project URL</label>
              <input 
                type="url" 
                id="cfg-supabase-url" 
                value="${escapeHtml(config.url)}" 
                placeholder="https://xyzcompany.supabase.co" 
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Supabase Anon Key</label>
              <input 
                type="password" 
                id="cfg-supabase-key" 
                value="${escapeHtml(config.anonKey)}" 
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
              <a href="supabase/schema.sql" target="_blank" class="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                <span>View SQL Migration Schema (RLS)</span>
              </a>

              <div class="flex items-center gap-2">
                ${config.connected ? `
                  <button type="button" onclick="window.app.disconnectSupabase()" class="px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors">
                    Disconnect
                  </button>
                ` : ''}
                <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all">
                  Test & Save Connection
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Card 3: Typography Verification -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Strict Brand Typography Status</h3>
          <div class="flex items-center justify-between text-xs">
            <div>
              <div class="font-bold text-slate-800">Aeonik Typeface Family</div>
              <div class="text-slate-500">CoType Foundry licensed geometry. Fully embedded in CSS and vector PDF renderer.</div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Active Everywhere</span>
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --- END js/settings-ui.js --- */

/* --- START js/modals.js --- */
/**
 * BillCraft - Modal Dialogs
 * Auth Modal, Upgrade Modal, Client Edit Modal, and Full Invoice Preview Modal.
 */

// [bundled import]
// [bundled import]
function renderAuthModal(initialTab = 'signin') {
  return `
  <div id="auth-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
    <div class="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
      <button onclick="window.app.closeModal()" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <!-- Logo & Title -->
      <div class="text-center mb-6">
        <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-md shadow-blue-500/20 mb-3">
          B
        </div>
        <h3 class="text-xl font-bold text-slate-900" id="auth-modal-title">
          ${initialTab === 'signup' ? 'Create your BillCraft account' : 'Welcome back to BillCraft'}
        </h3>
        <p class="text-xs text-slate-500 mt-1">Invoicing, made simple. Powered by Supabase Auth.</p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold">
        <button id="auth-tab-signin" onclick="window.app.switchAuthTab('signin')" class="flex-1 py-2 rounded-lg ${initialTab === 'signin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'} transition-all">Sign In</button>
        <button id="auth-tab-signup" onclick="window.app.switchAuthTab('signup')" class="flex-1 py-2 rounded-lg ${initialTab === 'signup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'} transition-all">Create Account</button>
      </div>

      <!-- Sign In Form -->
      <form id="signin-form" onsubmit="window.app.handleSignIn(event)" class="space-y-4 ${initialTab === 'signin' ? '' : 'hidden'}">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Email address</label>
          <input 
            type="email" 
            id="signin-email" 
            required 
            placeholder="alex@example.com" 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-xs font-semibold text-slate-600">Password</label>
            <button type="button" onclick="window.app.switchAuthTab('reset')" class="text-[11px] text-blue-600 hover:underline">Forgot?</button>
          </div>
          <input 
            type="password" 
            id="signin-password" 
            required 
            placeholder="••••••••" 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <button type="submit" class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all">
          Sign In
        </button>
      </form>

      <!-- Sign Up Form -->
      <form id="signup-form" onsubmit="window.app.handleSignUp(event)" class="space-y-4 ${initialTab === 'signup' ? '' : 'hidden'}">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
          <input 
            type="text" 
            id="signup-name" 
            required 
            placeholder="Alex Vance" 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Email address</label>
          <input 
            type="email" 
            id="signup-email" 
            required 
            placeholder="alex@apexstudio.io" 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Create Password</label>
          <input 
            type="password" 
            id="signup-password" 
            required 
            minlength="6"
            placeholder="At least 6 characters" 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <button type="submit" class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all">
          Create Account & Start Invoicing
        </button>
      </form>

      <!-- Password Reset Form -->
      <form id="reset-form" onsubmit="window.app.handlePasswordReset(event)" class="space-y-4 hidden">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Your registered email</label>
          <input 
            type="email" 
            id="reset-email" 
            required 
            placeholder="alex@apexstudio.io" 
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <button type="submit" class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all">
          Send Reset Instructions
        </button>

        <button type="button" onclick="window.app.switchAuthTab('signin')" class="w-full text-center text-xs text-slate-500 hover:underline">
          Back to Sign In
        </button>
      </form>
    </div>
  </div>
  `;
}

function renderUpgradeModal() {
  return `
  <div id="upgrade-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
    <div class="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
      <button onclick="window.app.closeModal()" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <div class="text-center mb-6">
        <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
        </div>
        <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Upgrade to Pro</span>
        <h3 class="text-2xl font-extrabold text-slate-900 mt-1">Unlock Unlimited Invoicing</h3>
        <p class="text-xs text-slate-600 mt-1 max-w-md mx-auto">
          Free users can create up to 5 invoices per month and access 2 templates. Upgrade to Pro for unconstrained billing power.
        </p>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 space-y-3 text-xs">
        <div class="flex items-center gap-2.5 text-slate-800 font-semibold">
          <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <span>Unlimited invoice generation (no monthly 5-invoice cap)</span>
        </div>
        <div class="flex items-center gap-2.5 text-slate-800 font-semibold">
          <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <span>All 4 premium templates (Minimal, Corporate, Creative, Elegant)</span>
        </div>
        <div class="flex items-center gap-2.5 text-slate-800 font-semibold">
          <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <span>Custom branding, company logo upload & wire transfer presets</span>
        </div>
        <div class="flex items-center gap-2.5 text-slate-800 font-semibold">
          <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <span>Priority support & unlimited client directory</span>
        </div>
      </div>

      <div class="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl mb-6">
        <div>
          <div class="text-xs text-slate-400 font-semibold uppercase">Monthly Subscription</div>
          <div class="text-xl font-bold">$15 <span class="text-xs font-normal text-slate-400">/ month</span></div>
        </div>
        <button onclick="window.app.confirmUpgradeToPro()" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all">
          Activate Pro Plan
        </button>
      </div>

      <p class="text-[11px] text-slate-400 text-center">
        Note: Payment gateway architecture ready. Clicking Activate unlocks Pro immediately for testing.
      </p>
    </div>
  </div>
  `;
}

function renderClientModal(clientId = null) {
  const client = clientId ? storage.getClientById(clientId) : null;

  return `
  <div id="client-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
    <div class="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
      <button onclick="window.app.closeModal()" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <h3 class="text-lg font-bold text-slate-900 mb-1">${client ? 'Edit Client' : 'Add New Client'}</h3>
      <p class="text-xs text-slate-500 mb-5">Saved clients can be selected directly when creating an invoice.</p>

      <form onsubmit="window.app.handleSaveClient(event, '${clientId || ''}')" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Company / Organization</label>
          <input 
            type="text" 
            id="modal-client-company" 
            value="${client ? escapeHtml(client.companyName || '') : ''}" 
            placeholder="Acme Cloud Solutions" 
            class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Contact Person Name *</label>
          <input 
            type="text" 
            id="modal-client-name" 
            required
            value="${client ? escapeHtml(client.name || '') : ''}" 
            placeholder="Sarah Jenkins" 
            class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Billing Email</label>
          <input 
            type="email" 
            id="modal-client-email" 
            value="${client ? escapeHtml(client.email || '') : ''}" 
            placeholder="billing@acmecloud.io" 
            class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
          <input 
            type="text" 
            id="modal-client-phone" 
            value="${client ? escapeHtml(client.phone || '') : ''}" 
            placeholder="+1 (212) 555-0199" 
            class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Billing Address</label>
          <textarea 
            id="modal-client-address" 
            rows="2" 
            placeholder="350 5th Avenue, Suite 4200&#10;New York, NY 10118"
            class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >${client ? escapeHtml(client.address || '') : ''}</textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm">
            Save Client
          </button>
        </div>
      </form>
    </div>
  </div>
  `;
}

function renderInvoicePreviewModal(invoice) {
  return `
  <div id="preview-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
    <div class="bg-slate-100 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
      
      <!-- Modal Header Bar -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200 mb-4 shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-slate-900">${invoice.invoiceNumber}</span>
          <span class="text-xs px-2.5 py-0.5 rounded-full uppercase font-bold bg-slate-200 text-slate-700">${invoice.status}</span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="window.app.triggerPrint()" class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            <span>Print</span>
          </button>

          <button onclick="window.app.downloadInvoiceDirect('${invoice.id}')" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>Download PDF</span>
          </button>

          <button onclick="window.app.closeModal()" class="text-slate-400 hover:text-slate-600 p-1.5 ml-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      <!-- Printable A4 Area -->
      <div class="overflow-y-auto flex-1 flex justify-center p-2">
        <div id="invoice-preview-capture" class="a4-document-container w-full bg-white shadow-lg">
          ${renderInvoiceHTML(invoice)}
        </div>
      </div>
    </div>
  </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --- END js/modals.js --- */

/* --- START js/app.js --- */
/**
 * BillCraft - Main Application Controller
 * Handles routing, reactive form bindings, live preview rendering,
 * storage persistence, Supabase sync, and PDF exports.
 */

// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
// [bundled import]
class BillCraftApp {
  constructor() {
    this.currentRoute = 'landing';
    this.activeModal = null;
    this.editingInvoiceId = null;
    this.init();
  }

  init() {
    window.app = this;
    
    // Check URL hash or default
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'invoices', 'clients', 'templates', 'business', 'settings', 'editor'].includes(hash)) {
      this.navigate(hash);
    } else {
      this.navigate('landing');
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const h = window.location.hash.replace('#', '') || 'landing';
      this.renderView(h);
    });
  }

  navigate(route, params = {}) {
    this.currentRoute = route;
    window.location.hash = route;
    this.renderView(route, params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderView(route, params = {}) {
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    switch (route) {
      case 'dashboard':
      case 'invoices':
        appRoot.innerHTML = renderDashboard();
        break;

      case 'editor':
        const inv = params.invoiceId ? storage.getInvoiceById(params.invoiceId) : null;
        appRoot.innerHTML = renderInvoiceEditor(inv);
        break;

      case 'clients':
        appRoot.innerHTML = renderClientsView();
        break;

      case 'business':
        appRoot.innerHTML = renderBusinessProfileView();
        break;

      case 'templates':
        appRoot.innerHTML = renderTemplatesView();
        break;

      case 'settings':
        appRoot.innerHTML = renderSettingsView();
        break;

      case 'landing':
      default:
        appRoot.innerHTML = renderLandingPage();
        break;
    }
  }

  // --- INVOICE ACTIONS ---

  startNewInvoice(templateId = 'minimal') {
    // Check free limit
    if (!storage.canCreateInvoice()) {
      this.openUpgradeModal();
      showToast('You have reached the 5 invoices per month Free limit. Upgrade to Pro for unlimited invoices!', 'error');
      return;
    }

    this.editingInvoiceId = null;
    this.navigate('editor');
    if (templateId && templateId !== 'minimal') {
      setTimeout(() => this.changeTemplate(templateId), 50);
    }
  }

  editInvoice(id) {
    this.editingInvoiceId = id;
    this.navigate('editor', { invoiceId: id });
  }

  updateInvoiceField(field, value) {
    if (!window.currentEditorInvoice) return;
    window.currentEditorInvoice[field] = value;
    this.refreshLivePreview();
  }

  updateInvoiceCalculationField(field, value) {
    if (!window.currentEditorInvoice) return;
    window.currentEditorInvoice[field] = Number(value) || 0;
    window.currentEditorInvoice = calculateInvoice(window.currentEditorInvoice);
    this.refreshLivePreview();
  }

  updateItemField(index, field, value) {
    if (!window.currentEditorInvoice || !window.currentEditorInvoice.items[index]) return;
    
    if (field === 'quantity' || field === 'unitPrice') {
      window.currentEditorInvoice.items[index][field] = Number(value) || 0;
    } else {
      window.currentEditorInvoice.items[index][field] = value;
    }

    window.currentEditorInvoice = calculateInvoice(window.currentEditorInvoice);
    
    // Update the item subtotal element in the form
    const container = document.getElementById('invoice-items-container');
    if (container) {
      container.innerHTML = renderEditorItems(window.currentEditorInvoice.items, window.currentEditorInvoice.currency);
    }
    
    this.refreshLivePreview();
  }

  addInvoiceItem() {
    if (!window.currentEditorInvoice) return;
    window.currentEditorInvoice.items.push({
      id: 'item_' + Date.now(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    });
    window.currentEditorInvoice = calculateInvoice(window.currentEditorInvoice);
    
    const container = document.getElementById('invoice-items-container');
    if (container) {
      container.innerHTML = renderEditorItems(window.currentEditorInvoice.items, window.currentEditorInvoice.currency);
    }
    this.refreshLivePreview();
  }

  removeInvoiceItem(index) {
    if (!window.currentEditorInvoice) return;
    if (window.currentEditorInvoice.items.length <= 1) {
      showToast('An invoice must contain at least one line item.', 'error');
      return;
    }
    window.currentEditorInvoice.items.splice(index, 1);
    window.currentEditorInvoice = calculateInvoice(window.currentEditorInvoice);
    
    const container = document.getElementById('invoice-items-container');
    if (container) {
      container.innerHTML = renderEditorItems(window.currentEditorInvoice.items, window.currentEditorInvoice.currency);
    }
    this.refreshLivePreview();
  }

  handleSelectSavedClient(clientId) {
    if (!clientId) return;
    const client = storage.getClientById(clientId);
    if (!client || !window.currentEditorInvoice) return;

    window.currentEditorInvoice.clientId = client.id;
    window.currentEditorInvoice.clientName = client.name || '';
    window.currentEditorInvoice.clientCompany = client.companyName || '';
    window.currentEditorInvoice.clientEmail = client.email || '';
    window.currentEditorInvoice.clientPhone = client.phone || '';
    window.currentEditorInvoice.clientAddress = client.address || '';

    // Update form input fields
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('inv-clientName', client.name || '');
    setVal('inv-clientCompany', client.companyName || '');
    setVal('inv-clientEmail', client.email || '');
    setVal('inv-clientPhone', client.phone || '');
    setVal('inv-clientAddress', client.address || '');

    this.refreshLivePreview();
    showToast(`Loaded details for "${client.companyName || client.name}"`);
  }

  populateBusinessProfile() {
    const biz = storage.getBusiness();
    if (!biz || !window.currentEditorInvoice) return;

    window.currentEditorInvoice.businessName = biz.name || '';
    window.currentEditorInvoice.businessLogo = biz.logo || '';
    window.currentEditorInvoice.businessEmail = biz.email || '';
    window.currentEditorInvoice.businessPhone = biz.phone || '';
    window.currentEditorInvoice.businessAddress = biz.address || '';
    window.currentEditorInvoice.businessWebsite = biz.website || '';
    window.currentEditorInvoice.bankDetails = biz.bankDetails || '';
    window.currentEditorInvoice.notes = biz.defaultNotes || '';
    window.currentEditorInvoice.terms = biz.defaultTerms || '';

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('inv-businessName', biz.name || '');
    setVal('inv-businessEmail', biz.email || '');
    setVal('inv-businessPhone', biz.phone || '');
    setVal('inv-businessAddress', biz.address || '');
    setVal('inv-businessWebsite', biz.website || '');
    setVal('inv-bankDetails', biz.bankDetails || '');
    setVal('inv-notes', biz.defaultNotes || '');
    setVal('inv-terms', biz.defaultTerms || '');

    this.refreshLivePreview();
    showToast('Business profile details loaded.');
  }

  handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      if (window.currentEditorInvoice) {
        window.currentEditorInvoice.businessLogo = base64;
        this.refreshLivePreview();
        showToast('Logo uploaded successfully.');
      }
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    if (window.currentEditorInvoice) {
      window.currentEditorInvoice.businessLogo = '';
      const input = document.getElementById('inv-logo-upload');
      if (input) input.value = '';
      this.refreshLivePreview();
      showToast('Logo removed.');
    }
  }

  changeTemplate(templateId) {
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;

    // Pro template check
    if (tmpl.tier === 'pro' && !storage.isPro()) {
      this.openUpgradeModal();
      showToast(`The "${tmpl.name}" template is a Pro feature. Upgrade to unlock all templates!`, 'info');
      return;
    }

    if (window.currentEditorInvoice) {
      window.currentEditorInvoice.templateId = templateId;
      
      // Update template button styles
      TEMPLATES.forEach(t => {
        const btn = document.getElementById(`template-btn-${t.id}`);
        if (btn) {
          if (t.id === templateId) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all bg-slate-900 text-white border-slate-900 shadow-sm';
          } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
          }
        }
      });

      this.refreshLivePreview();
      showToast(`Switched to ${tmpl.name} template.`);
    }
  }

  refreshLivePreview() {
    if (!window.currentEditorInvoice) return;
    const captureBox = document.getElementById('invoice-preview-capture');
    if (captureBox) {
      captureBox.innerHTML = renderInvoiceHTML(window.currentEditorInvoice);
    }
  }

  saveCurrentInvoice() {
    if (!window.currentEditorInvoice) return;

    // Validate business name
    if (!window.currentEditorInvoice.businessName.trim()) {
      showToast('Please enter your Business / Freelancer Name.', 'error');
      const el = document.getElementById('inv-businessName');
      if (el) el.focus();
      return;
    }

    // Validate client name/company
    if (!window.currentEditorInvoice.clientName.trim() && !window.currentEditorInvoice.clientCompany.trim()) {
      showToast('Please enter a Client Company or Contact Name.', 'error');
      const el = document.getElementById('inv-clientCompany');
      if (el) el.focus();
      return;
    }

    // Validate invoice number
    if (!window.currentEditorInvoice.invoiceNumber.trim()) {
      showToast('Please enter a valid Invoice Number.', 'error');
      return;
    }

    try {
      const calculated = calculateInvoice(window.currentEditorInvoice);
      const saved = storage.saveInvoice(calculated);
      window.currentEditorInvoice = saved;
      showToast(`Invoice ${saved.invoiceNumber} saved successfully!`);
      this.navigate('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  changeInvoiceStatus(id, newStatus) {
    try {
      storage.updateInvoiceStatus(id, newStatus);
      showToast(`Invoice status updated to ${newStatus.toUpperCase()}`);
      this.filterInvoicesTable();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  deleteInvoicePrompt(id) {
    const inv = storage.getInvoiceById(id);
    if (!inv) return;
    if (confirm(`Are you sure you want to delete invoice "${inv.invoiceNumber}"? This action cannot be undone.`)) {
      storage.deleteInvoice(id);
      showToast(`Invoice ${inv.invoiceNumber} deleted.`);
      this.filterInvoicesTable();
    }
  }

  downloadInvoiceDirect(id) {
    const inv = storage.getInvoiceById(id);
    if (!inv) return;

    // Render in an offscreen container to generate PDF
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm';
    tempContainer.innerHTML = renderInvoiceHTML(inv);
    document.body.appendChild(tempContainer);

    showToast(`Generating vector PDF for ${inv.invoiceNumber}...`, 'info');

    downloadInvoicePDF(inv, tempContainer)
      .then(() => {
        showToast(`Downloaded ${inv.invoiceNumber}.pdf successfully!`);
        document.body.removeChild(tempContainer);
      })
      .catch((err) => {
        console.warn('PDF generation fallback triggered:', err);
        document.body.removeChild(tempContainer);
        // Fallback to print
        window.print();
      });
  }

  triggerDownloadPDF() {
    if (!window.currentEditorInvoice) return;
    const captureBox = document.getElementById('invoice-preview-capture');
    if (!captureBox) return;

    showToast(`Preparing vector PDF download...`, 'info');
    downloadInvoicePDF(window.currentEditorInvoice, captureBox)
      .then(() => {
        showToast('PDF downloaded successfully!');
      })
      .catch((err) => {
        console.warn('Direct PDF export error, opening print fallback:', err);
        window.print();
      });
  }

  triggerPrint() {
    printInvoice();
  }

  filterInvoicesTable() {
    const searchInput = document.getElementById('invoice-search-input');
    const statusFilter = document.getElementById('invoice-status-filter');
    const container = document.getElementById('invoices-table-container');
    if (!container) return;

    const term = (searchInput?.value || '').toLowerCase().trim();
    const status = statusFilter?.value || 'all';

    let filtered = storage.getInvoices();

    if (status !== 'all') {
      filtered = filtered.filter(inv => inv.status === status);
    }

    if (term) {
      filtered = filtered.filter(inv => 
        (inv.invoiceNumber || '').toLowerCase().includes(term) ||
        (inv.clientName || '').toLowerCase().includes(term) ||
        (inv.clientCompany || '').toLowerCase().includes(term) ||
        (inv.businessName || '').toLowerCase().includes(term)
      );
    }

    container.innerHTML = renderInvoicesTable(filtered);
  }

  // --- CLIENT ACTIONS ---

  openClientModal(clientId = null) {
    this.closeModal();
    const modalHtml = renderClientModal(clientId);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  handleSaveClient(event, clientId = '') {
    event.preventDefault();
    const company = document.getElementById('modal-client-company')?.value || '';
    const name = document.getElementById('modal-client-name')?.value || '';
    const email = document.getElementById('modal-client-email')?.value || '';
    const phone = document.getElementById('modal-client-phone')?.value || '';
    const address = document.getElementById('modal-client-address')?.value || '';

    if (!name.trim() && !company.trim()) {
      showToast('Please provide a Client Name or Company Name.', 'error');
      return;
    }

    const clientData = {
      id: clientId || undefined,
      name,
      companyName: company,
      email,
      phone,
      address
    };

    storage.saveClient(clientData);
    this.closeModal();
    showToast(`Client "${company || name}" saved.`);
    
    if (this.currentRoute === 'clients') {
      this.renderView('clients');
    }
  }

  deleteClientPrompt(id) {
    const client = storage.getClientById(id);
    if (!client) return;
    if (confirm(`Delete client "${client.companyName || client.name}"?`)) {
      storage.deleteClient(id);
      showToast('Client deleted.');
      if (this.currentRoute === 'clients') {
        this.renderView('clients');
      }
    }
  }

  createInvoiceForClient(clientId) {
    const client = storage.getClientById(clientId);
    if (!client) return;
    this.startNewInvoice();
    setTimeout(() => {
      this.handleSelectSavedClient(clientId);
    }, 100);
  }

  // --- BUSINESS PROFILE ACTIONS ---

  saveBusinessProfileForm(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('biz-name')?.value || '';
    const defaultCurrency = document.getElementById('biz-currency')?.value || 'USD';
    const email = document.getElementById('biz-email')?.value || '';
    const phone = document.getElementById('biz-phone')?.value || '';
    const address = document.getElementById('biz-address')?.value || '';
    const website = document.getElementById('biz-website')?.value || '';
    const bankDetails = document.getElementById('biz-bankDetails')?.value || '';
    const defaultTerms = document.getElementById('biz-terms')?.value || '';
    const defaultNotes = document.getElementById('biz-notes')?.value || '';

    const currentBiz = storage.getBusiness();

    storage.saveBusiness({
      ...currentBiz,
      name,
      defaultCurrency,
      email,
      phone,
      address,
      website,
      bankDetails,
      defaultTerms,
      defaultNotes
    });

    showToast('Business profile updated successfully!');
  }

  handleBusinessLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      storage.saveBusiness({ logo: base64 });
      
      const preview = document.getElementById('biz-logo-preview');
      if (preview) {
        preview.innerHTML = `<img src="${base64}" alt="Logo" class="max-w-full max-h-full object-contain" />`;
      }
      showToast('Company logo updated.');
    };
    reader.readAsDataURL(file);
  }

  // --- MODALS & AUTH ---

  openAuthModal(tab = 'signin') {
    this.closeModal();
    document.body.insertAdjacentHTML('beforeend', renderAuthModal(tab));
  }

  switchAuthTab(tab) {
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const resetForm = document.getElementById('reset-form');
    const signinTab = document.getElementById('auth-tab-signin');
    const signupTab = document.getElementById('auth-tab-signup');
    const title = document.getElementById('auth-modal-title');

    if (!signinForm || !signupForm || !resetForm) return;

    signinForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    resetForm.classList.add('hidden');

    if (signinTab) signinTab.className = 'flex-1 py-2 rounded-lg text-slate-600 transition-all';
    if (signupTab) signupTab.className = 'flex-1 py-2 rounded-lg text-slate-600 transition-all';

    if (tab === 'signup') {
      signupForm.classList.remove('hidden');
      if (signupTab) signupTab.className = 'flex-1 py-2 rounded-lg bg-white shadow-sm text-slate-900 transition-all';
      if (title) title.innerText = 'Create your BillCraft account';
    } else if (tab === 'reset') {
      resetForm.classList.remove('hidden');
      if (title) title.innerText = 'Reset your password';
    } else {
      signinForm.classList.remove('hidden');
      if (signinTab) signinTab.className = 'flex-1 py-2 rounded-lg bg-white shadow-sm text-slate-900 transition-all';
      if (title) title.innerText = 'Welcome back to BillCraft';
    }
  }

  async handleSignIn(event) {
    event.preventDefault();
    const email = document.getElementById('signin-email')?.value;
    const password = document.getElementById('signin-password')?.value;

    try {
      const res = await supabaseService.signIn(email, password);
      this.closeModal();
      showToast(res.message);
      this.navigate('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async handleSignUp(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name')?.value;
    const email = document.getElementById('signup-email')?.value;
    const password = document.getElementById('signup-password')?.value;

    try {
      const res = await supabaseService.signUp(email, password, name);
      this.closeModal();
      showToast(res.message);
      this.navigate('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async handlePasswordReset(event) {
    event.preventDefault();
    const email = document.getElementById('reset-email')?.value;
    try {
      const res = await supabaseService.resetPassword(email);
      showToast(res.message);
      this.switchAuthTab('signin');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async signOutUser() {
    await supabaseService.signOut();
    showToast('Signed out of BillCraft.');
    this.navigate('landing');
  }

  openUpgradeModal() {
    this.closeModal();
    document.body.insertAdjacentHTML('beforeend', renderUpgradeModal());
  }

  confirmUpgradeToPro() {
    storage.upgradeToPro();
    this.closeModal();
    showToast('Welcome to BillCraft Pro! All templates and unlimited invoices unlocked.');
    this.renderView(this.currentRoute);
  }

  togglePlan(tier) {
    if (tier === 'pro') {
      storage.upgradeToPro();
      showToast('Plan set to PRO (Unlimited invoices, all templates unlocked).');
    } else {
      storage.downgradeToFree();
      showToast('Plan set to FREE (5-invoice cap, 2 templates).');
    }
    this.renderView(this.currentRoute);
  }

  previewInvoiceModal(id) {
    const inv = storage.getInvoiceById(id);
    if (!inv) return;
    this.closeModal();
    document.body.insertAdjacentHTML('beforeend', renderInvoicePreviewModal(inv));
  }

  closeModal() {
    const modals = document.querySelectorAll('.modal-backdrop');
    modals.forEach(m => m.remove());
  }

  // --- SETTINGS / SUPABASE CONFIG ---

  handleSaveSupabaseConfig(event) {
    event.preventDefault();
    const url = document.getElementById('cfg-supabase-url')?.value.trim();
    const key = document.getElementById('cfg-supabase-key')?.value.trim();

    const res = supabaseService.configure(url, key);
    if (res.success) {
      showToast(res.message);
      this.renderView('settings');
    } else {
      showToast(res.message, 'error');
    }
  }

  disconnectSupabase() {
    supabaseService.configure('', '');
    showToast('Disconnected from Supabase. BillCraft is running in Local Persistence mode.');
    this.renderView('settings');
  }

  // --- MOBILE UI HELPERS ---

  toggleMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('hidden');
    }
  }

  switchMobileTab(tab) {
    const formPane = document.getElementById('editor-form-pane');
    const previewPane = document.getElementById('editor-preview-pane');
    const tabForm = document.getElementById('mobile-tab-form');
    const tabPreview = document.getElementById('mobile-tab-preview');

    if (!formPane || !previewPane) return;

    if (tab === 'preview') {
      formPane.classList.add('hidden');
      previewPane.classList.remove('hidden');
      if (tabPreview) tabPreview.className = 'px-3 py-1 rounded-md bg-white shadow-sm text-slate-900';
      if (tabForm) tabForm.className = 'px-3 py-1 rounded-md text-slate-600';
    } else {
      previewPane.classList.add('hidden');
      formPane.classList.remove('hidden');
      if (tabForm) tabForm.className = 'px-3 py-1 rounded-md bg-white shadow-sm text-slate-900';
      if (tabPreview) tabPreview.className = 'px-3 py-1 rounded-md text-slate-600';
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new BillCraftApp();
});

/* --- END js/app.js --- */

})();
