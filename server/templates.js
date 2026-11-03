// Starter templates. Field ids are stable strings so logic rules can reference them.
const theme = (primary, background = '#f3f3fe') => ({ primary, background, text: '#2c3345', fieldBg: '#ffffff', font: 'Inter', width: 720, logo: '', css: '' });

export const BASE_SETTINGS = {
  thankYou: { message: 'Thank you! Your submission has been received.', redirect: '' },
  notify: { enabled: true, to: '', subject: 'New submission: {form_title}' },
  autoresponder: { enabled: false, emailField: '', subject: 'We received your submission', body: 'Hi,\n\nThanks for filling out {form_title}. Here is a copy of your answers:\n\n{all_fields}' },
  closeDate: '', maxSubmissions: '', closedMessage: 'This form is no longer accepting submissions.',
  password: '', saveAndContinue: true, oneSubmissionPerUser: false,
  approvals: { enabled: false, approvers: '', steps: 1 },
  webhooks: [],
  payment: { provider: 'test', currency: 'USD' },
  language: 'en', showProgress: true,
};

export const blankForm = (title = 'Untitled Form') => ({
  title, layout: 'classic',
  fields: [{ id: 'title', type: 'heading', label: title, subheading: 'Please fill out the form below.' }],
  logic: [], theme: theme('#0a1551'), settings: structuredClone(BASE_SETTINGS),
});

const T = (id, name, category, description, def) => ({ id, name, category, description, definition: { ...blankForm(name), ...def, title: name } });

export const TEMPLATES = [
  T('contact', 'Contact Us', 'Contact', 'Simple contact form with name, email and message.', {
    theme: theme('#0075e3'),
    fields: [
      { id: 'h', type: 'heading', label: 'Contact Us', subheading: 'We usually reply within one business day.' },
      { id: 'name', type: 'fullname', label: 'Name', required: true },
      { id: 'email', type: 'email', label: 'E-mail', required: true, placeholder: 'example@example.com' },
      { id: 'topic', type: 'dropdown', label: 'Topic', options: ['Sales', 'Support', 'Partnership', 'Other'], placeholder: 'Please Select' },
      { id: 'other_topic', type: 'text', label: 'Describe your topic', required: true },
      { id: 'msg', type: 'textarea', label: 'Message', required: true, rows: 5 },
    ],
    logic: [{ id: 'r1', match: 'all', conditions: [{ field: 'topic', op: 'equals', value: 'Other' }], actions: [{ type: 'show', target: 'other_topic' }] }],
  }),
  T('registration', 'Event Registration', 'Registration', 'Collect attendee details and ticket payments.', {
    theme: theme('#7c3aed', '#f5f3ff'),
    fields: [
      { id: 'h', type: 'heading', label: 'Event Registration', subheading: 'Annual Conference 2026' },
      { id: 'name', type: 'fullname', label: 'Attendee Name', required: true },
      { id: 'email', type: 'email', label: 'E-mail', required: true },
      { id: 'phone', type: 'phone', label: 'Phone' },
      { id: 'tickets', type: 'products', label: 'Tickets', currency: 'USD', quantity: true, singleChoice: false, required: true,
        products: [{ id: 'ga', name: 'General Admission', price: 49, description: 'Access to all talks' }, { id: 'vip', name: 'VIP Pass', price: 149, description: 'Front row + dinner' }] },
      { id: 'diet', type: 'radio', label: 'Dietary preference', options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free'] },
      { id: 'terms', type: 'terms', label: 'Terms', text: 'I agree to the event code of conduct.', required: true },
    ],
  }),
  T('feedback', 'Customer Feedback Survey', 'Survey', 'Ratings, scales and a satisfaction matrix.', {
    layout: 'card', theme: theme('#ff6100', '#fff7ed'),
    fields: [
      { id: 'h', type: 'heading', label: 'How did we do?', subheading: 'This takes about one minute.' },
      { id: 'stars', type: 'rating', label: 'Overall rating', stars: 5, required: true },
      { id: 'nps', type: 'scale', label: 'How likely are you to recommend us?', from: 0, to: 10, lowLabel: 'Not likely', highLabel: 'Very likely' },
      { id: 'matrix', type: 'matrix', label: 'Rate the following', rows: ['Service Quality', 'Speed', 'Price'], columns: ['Poor', 'Fair', 'Good', 'Excellent'] },
      { id: 'why', type: 'textarea', label: 'What could we improve?' },
    ],
    logic: [{ id: 'r1', match: 'all', conditions: [{ field: 'stars', op: 'lt', value: '3' }], actions: [{ type: 'require', target: 'why' }, { type: 'thankyou', value: 'Sorry we let you down — a manager will reach out.' }] }],
  }),
  T('order', 'Order Form', 'Payment', 'Product order with quantity, shipping and calculated total.', {
    theme: theme('#18bd5b', '#f0fdf4'),
    fields: [
      { id: 'h', type: 'heading', label: 'Order Form', subheading: '' },
      { id: 'name', type: 'fullname', label: 'Name', required: true },
      { id: 'email', type: 'email', label: 'E-mail', required: true },
      { id: 'items', type: 'products', label: 'Products', currency: 'USD', quantity: true, required: true,
        products: [{ id: 'tee', name: 'T-Shirt', price: 25, description: '100% cotton' }, { id: 'mug', name: 'Mug', price: 12, description: 'Ceramic, 350ml' }, { id: 'cap', name: 'Cap', price: 18, description: '' }] },
      { id: 'ship', type: 'address', label: 'Shipping Address', required: true },
      { id: 'notes', type: 'textarea', label: 'Order notes' },
    ],
  }),
  T('job', 'Job Application', 'Application', 'Multi-page application with resume upload, signature and approvals.', {
    theme: theme('#0a1551'),
    fields: [
      { id: 'h', type: 'heading', label: 'Job Application', subheading: 'Join our team' },
      { id: 'name', type: 'fullname', label: 'Full Name', required: true },
      { id: 'email', type: 'email', label: 'E-mail', required: true },
      { id: 'position', type: 'dropdown', label: 'Position', options: ['Engineer', 'Designer', 'Sales', 'Support'], required: true },
      { id: 'pb1', type: 'pagebreak', label: 'Page Break' },
      { id: 'years', type: 'number', label: 'Years of experience', min: 0, max: 60 },
      { id: 'resume', type: 'file', label: 'Resume', accept: '.pdf,.doc,.docx', required: true, maxSizeMb: 10 },
      { id: 'start', type: 'date', label: 'Earliest start date', disablePast: true },
      { id: 'pb2', type: 'pagebreak', label: 'Page Break' },
      { id: 'sig', type: 'signature', label: 'Signature', required: true },
    ],
    settings: { ...structuredClone(BASE_SETTINGS), approvals: { enabled: true, approvers: '', steps: 1 } },
  }),
  T('appointment', 'Appointment Booking', 'Booking', 'Let clients book a time slot.', {
    theme: theme('#0891b2', '#ecfeff'),
    fields: [
      { id: 'h', type: 'heading', label: 'Book an Appointment', subheading: '' },
      { id: 'name', type: 'fullname', label: 'Name', required: true },
      { id: 'email', type: 'email', label: 'E-mail', required: true },
      { id: 'slot', type: 'appointment', label: 'Pick a time', slots: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'], disablePast: true, oneBookingPerSlot: true, required: true },
      { id: 'reason', type: 'textarea', label: 'Reason for visit' },
    ],
  }),
  T('quote', 'Price Quote Calculator', 'Calculator', 'Calculated fields with conditional discounts.', {
    theme: theme('#d97706', '#fffbeb'),
    fields: [
      { id: 'h', type: 'heading', label: 'Get a Quote', subheading: '' },
      { id: 'hours', type: 'number', label: 'Hours needed', min: 1, required: true },
      { id: 'rate', type: 'dropdown', label: 'Service level', options: ['50', '80', '120'], placeholder: 'Hourly rate' },
      { id: 'rush', type: 'yesno', label: 'Rush delivery (+25%)?' },
      { id: 'mult', type: 'hidden', label: 'Multiplier', defaultValue: '1' },
      { id: 'total', type: 'calculation', label: 'Estimated total', formula: 'round({hours} * {rate} * {mult}, 2)', prefix: '$', decimals: 2 },
      { id: 'email', type: 'email', label: 'Send quote to', required: true },
    ],
    logic: [{ id: 'r1', match: 'all', conditions: [{ field: 'rush', op: 'equals', value: 'Yes' }], actions: [{ type: 'setValue', target: 'mult', value: '1.25' }] }],
  }),
];
