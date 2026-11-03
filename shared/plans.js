// Plan limits modelled on Jotform's published pricing tiers. Infinity = unlimited.
export const PLANS = {
  starter: {
    name: 'Starter', price: 0,
    forms: 5, submissionsPerMonth: 100, viewsPerMonth: 10000, uploadBytes: 100 * 1024 ** 2,
    totalSubmissions: 500, paymentsPerMonth: 10, signaturesPerMonth: 10, fieldsPerForm: 100,
    branding: true, hipaa: false, customDomain: false, multiUser: false,
  },
  bronze: {
    name: 'Bronze', price: 39,
    forms: 25, submissionsPerMonth: 1000, viewsPerMonth: 100000, uploadBytes: 1024 ** 3,
    totalSubmissions: 10000, paymentsPerMonth: 100, signaturesPerMonth: 100, fieldsPerForm: 250,
    branding: false, hipaa: false, customDomain: false, multiUser: false,
  },
  silver: {
    name: 'Silver', price: 49,
    forms: 50, submissionsPerMonth: 2500, viewsPerMonth: 1000000, uploadBytes: 10 * 1024 ** 3,
    totalSubmissions: 25000, paymentsPerMonth: 250, signaturesPerMonth: 250, fieldsPerForm: 500,
    branding: false, hipaa: false, customDomain: false, multiUser: false,
  },
  gold: {
    name: 'Gold', price: 129,
    forms: 100, submissionsPerMonth: 10000, viewsPerMonth: 10000000, uploadBytes: 100 * 1024 ** 3,
    totalSubmissions: 100000, paymentsPerMonth: 1000, signaturesPerMonth: 1000, fieldsPerForm: 1000,
    branding: false, hipaa: true, customDomain: true, multiUser: false,
  },
  enterprise: {
    name: 'Enterprise', price: null,
    forms: Infinity, submissionsPerMonth: Infinity, viewsPerMonth: Infinity, uploadBytes: Infinity,
    totalSubmissions: Infinity, paymentsPerMonth: Infinity, signaturesPerMonth: Infinity, fieldsPerForm: Infinity,
    branding: false, hipaa: true, customDomain: true, multiUser: true,
  },
};

export const planOf = (key) => PLANS[key] || PLANS.starter;

// JSON can't carry Infinity; the API sends null for unlimited.
export const serializePlan = (p) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v === Infinity ? null : v]));
