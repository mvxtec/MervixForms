// Widget catalog. Every Jotform-style widget is a `widget` field whose behaviour comes from a
// small set of shared "kinds" (embed, choice, validated text, calculator…). Entries marked
// `soon` need a third-party service or account and are listed in the catalog but not addable yet.
import { DATASETS } from './datasets.js';

// Settings shown in the builder's General tab, per kind. Types: text, textarea, number, bool,
// color, select, lines (one item per line), field (another field's id), columns, roster.
const S = {
  embed: [['url', 'URL', 'text'], ['height', 'Height (px)', 'number']],
  heading: [['text', 'Heading text', 'text'], ['size', 'Size (px)', 'number'], ['align', 'Alignment', 'select', ['left', 'center']]],
  text: [['text', 'Text', 'textarea']],
  highlight: [['text', 'Text', 'textarea'], ['color', 'Highlight colour', 'color']],
  spoiler: [['title', 'Toggle label', 'text'], ['text', 'Hidden text', 'textarea']],
  spacer: [['height', 'Height (px)', 'number']],
  separator: [['style', 'Style', 'select', ['solid', 'dashed', 'dotted', 'double']], ['color', 'Colour', 'color']],
  gallery: [['images', 'Image URLs (one per line)', 'lines'], ['height', 'Height (px)', 'number']],
  compare: [['before', 'Image before (URL)', 'text'], ['after', 'Image after (URL)', 'text'], ['height', 'Height (px)', 'number']],
  qr: [['text', 'QR content (URL or text)', 'text'], ['size', 'Size (px)', 'number']],
  countdown: [['date', 'Count down to (date & time)', 'datetime'], ['text', 'Label', 'text']],
  clock: [['timezone', 'Time zone (blank = respondent)', 'text']],
  quotes: [['items', 'Quotes (one per line, "text — author")', 'lines']],
  button: [['text', 'Button label', 'text'], ['value', 'Phone / URL / text', 'text'], ['message', 'Message (optional)', 'text']],
  calendar: [['text', 'Event title', 'text'], ['start', 'Start', 'datetime'], ['end', 'End', 'datetime'], ['location', 'Location', 'text']],
  ticker: [['text', 'Scrolling text', 'text']],
  choice: [['options', 'Options (one per line)', 'lines'], ['multi', 'Allow multiple selections', 'bool']],
  imageChoice: [['options', 'Option labels (one per line)', 'lines'], ['images', 'Image URLs (same order)', 'lines'], ['multi', 'Allow multiple selections', 'bool']],
  described: [['options', 'Options (one per line)', 'lines'], ['descriptions', 'Descriptions (same order)', 'lines']],
  likert: [['leftLabel', 'Left label', 'text'], ['rightLabel', 'Right label', 'text'], ['points', 'Points', 'number']],
  preset: [],
  validated: [['placeholder', 'Placeholder', 'text']],
  masked: [['mask', 'Mask (# digit, @ letter, * any)', 'text'], ['placeholder', 'Placeholder', 'text']],
  confirm: [['field', 'Field to confirm', 'field']],
  calc: [],
  capture: [['maxSizeMb', 'Max file size (MB)', 'number']],
  drawing: [['background', 'Background image URL (optional)', 'text']],
  location: [['map', 'Show map preview', 'bool']],
  meta: [],
  uniqueId: [['prefix', 'Prefix', 'text'], ['digits', 'Number of digits', 'number']],
  list: [['columns', 'Columns', 'columns'], ['minRows', 'Minimum rows', 'number'], ['maxRows', 'Maximum rows', 'number']],
  multitext: [['labels', 'Field labels (one per line)', 'lines']],
  tags: [['max', 'Maximum tags', 'number']],
  rank: [['options', 'Items to rank (one per line)', 'lines']],
  toggle: [['onLabel', 'On label', 'text'], ['offLabel', 'Off label', 'text']],
  range: [['min', 'Minimum', 'number'], ['max', 'Maximum', 'number'], ['step', 'Step', 'number']],
  slider: [['min', 'Minimum', 'number'], ['max', 'Maximum', 'number'], ['step', 'Step', 'number'], ['leftLabel', 'Left label', 'text'], ['rightLabel', 'Right label', 'text']],
  stepper: [['min', 'Minimum', 'number'], ['max', 'Maximum', 'number'], ['step', 'Step', 'number']],
  charboxes: [['length', 'Number of boxes', 'number'], ['numeric', 'Digits only', 'bool']],
  textcounter: [['maxLength', 'Maximum characters', 'number'], ['rows', 'Rows', 'number']],
  daterange: [['fromLabel', 'Start label', 'text'], ['toLabel', 'End label', 'text']],
  plain: [],
  currencyAmount: [['currency', 'Default currency', 'text']],
  ratingComment: [['stars', 'Stars', 'number']],
  phoneIntl: [['code', 'Default country code', 'text']],
  autocomplete: [['options', 'Suggestions (one per line)', 'lines'], ['placeholder', 'Placeholder', 'text']],
  cascade: [['map', 'Options ("Parent: child, child" per line)', 'lines'], ['parentLabel', 'First dropdown label', 'text'], ['childLabel', 'Second dropdown label', 'text']],
  idpin: [['roster', 'Employee roster', 'roster'], ['mode', 'Verification mode', 'select', ['Employee ID and PIN', 'Employee ID only']], ['maxAttempts', 'Failed attempt limit', 'number']],
  termsScroll: [['terms', 'Terms text', 'textarea'], ['text', 'Checkbox label', 'text']],
};

// Kind → how the value behaves. display kinds collect no data.
export const KINDS = {
  embed: { display: true }, heading: { display: true }, text: { display: true }, highlight: { display: true }, spoiler: { display: true },
  spacer: { display: true }, separator: { display: true }, gallery: { display: true }, compare: { display: true }, qr: { display: true },
  countdown: { display: true }, clock: { display: true }, quotes: { display: true }, button: { display: true }, calendar: { display: true },
  ticker: { display: true },
};

const W = [];
// add(key, label, category, kind, defaults, extra)
const add = (key, label, category, kind, defaults = {}, extra = {}) => W.push({ key, label, category, kind, defaults, ...extra });
const soon = (key, label, category, reason = 'Needs a third-party integration') => W.push({ key, label, category, kind: 'soon', soon: true, reason, defaults: {} });
// Widgets that are really a basic element with preset settings.
const alias = (key, label, category, type, defaults = {}) => W.push({ key, label, category, kind: 'alias', type, defaults });

const C = { pop: 'Popular', choice: 'Choices & selection', text: 'Text & validation', date: 'Date & time', media: 'Media & embeds', display: 'Display & layout', calc: 'Calculators', capture: 'Capture & location', data: 'Lists & data', pick: 'Pickers', meta: 'Tracking & metadata', social: 'Buttons & social' };

// ── Popular (Jotform's first screen) ──
add('idPin', 'ID & PIN Verifier', C.pop, 'idpin', { label: 'Employee verification', roster: [{ id: 'E001', pin: '', name: 'Alex Smith' }], mode: 'Employee ID and PIN', maxAttempts: 5 }, { isNew: true });
soon('inventoryDropdown', 'Inventory Dropdown', C.pop, 'Needs stock tracking (planned)');
alias('formCalculation', 'Form Calculation', C.pop, 'calculation');
add('configurableList', 'Configurable List', C.pop, 'list', { label: 'Configurable list', columns: [{ label: 'Short Text', type: 'text' }, { label: 'Dropdown', type: 'dropdown', options: ['Option 1', 'Option 2'] }, { label: 'Calendar', type: 'date' }, { label: 'Time', type: 'time' }], minRows: 1, maxRows: 10 });
add('multipleTextFields', 'Multiple Text Fields', C.pop, 'multitext', { label: 'Multiple text fields', labels: ['First field', 'Second field', 'Third field'] });
alias('termsConditions', 'Terms & Conditions', C.pop, 'terms');
add('takePhoto', 'Take Photo', C.pop, 'capture', { label: 'Take a photo', capture: 'photo', maxSizeMb: 10 });
alias('signatureWidget', 'Signature', C.pop, 'signature');
add('checklist', 'Checklist', C.pop, 'choice', { label: 'Checklist', options: ['Item 1', 'Item 2', 'Item 3'], multi: true, style: 'cards' });
add('dynamicTextbox', 'Dynamic Textbox', C.pop, 'list', { label: 'Dynamic textbox', columns: [{ label: 'Entry', type: 'text' }], minRows: 1, maxRows: 20 });
add('addOptions', 'Add Options', C.pop, 'choice', { label: 'Choose or add an option', options: ['Option 1', 'Option 2'], allowAdd: true, dropdown: true });
add('dataGrid', 'Data Grid', C.pop, 'list', { label: 'Data grid', columns: [{ label: 'Name', type: 'text' }, { label: 'Quantity', type: 'number' }, { label: 'Notes', type: 'text' }], minRows: 1, maxRows: 20 });
add('pdfEmbedder', 'PDF Embedder', C.pop, 'embed', { label: 'PDF', provider: 'pdf', url: '', height: 600 });
add('dynamicDropdowns', 'Dynamic Dropdowns', C.pop, 'cascade', { label: 'Location', map: ['India: Mumbai, Pune, Delhi', 'United States: New York, Chicago'], parentLabel: 'Country', childLabel: 'City' });
soon('inventory', 'Inventory', C.pop, 'Needs stock tracking (planned)');
add('multipleSelection', 'Multiple Selection', C.pop, 'choice', { label: 'Multiple selection', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, dropdown: true });
alias('matrixDynamique', 'Matrix Dynamique', C.pop, 'matrix');
add('imageSlider', 'Image Slider', C.pop, 'gallery', { label: 'Image slider', images: [], height: 320, slide: true });
add('uniqueId', 'Unique ID', C.pop, 'uniqueId', { label: 'Unique ID', prefix: 'ID-', digits: 5, source: 'uniqueid' });
add('spreadsheet', 'Spreadsheet', C.pop, 'list', { label: 'Spreadsheet', columns: [{ label: 'A', type: 'text' }, { label: 'B', type: 'text' }, { label: 'C', type: 'text' }], minRows: 3, maxRows: 50 });
alias('datePickerWidget', 'Date Picker', C.pop, 'date');
add('fieldMultiplier', 'Field Multiplier', C.pop, 'list', { label: 'Field multiplier', columns: [{ label: 'Value', type: 'text' }], minRows: 1, maxRows: 10 });
soon('spreadsheetToForm', 'Spreadsheet to Form', C.data, 'Needs a spreadsheet import service');
add('youtube', 'YouTube', C.media, 'embed', { label: 'YouTube video', provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', height: 360 });
add('fitText', 'Fit Text', C.display, 'heading', { label: 'Fit text', text: 'Big, bold headline', size: 40, align: 'center' });
soon('formTabs', 'Form Tabs', C.display, 'Planned: tabbed sections');
add('imageUploadPreview', 'Image Upload Preview', C.capture, 'capture', { label: 'Upload an image', capture: 'image', maxSizeMb: 10 });
add('dateTimeSingle', 'DateTime Single', C.date, 'plain', { label: 'Date and time', input: 'datetime-local' });
add('dateReservation', 'Date Reservation', C.date, 'daterange', { label: 'Reservation dates', fromLabel: 'Check-in', toLabel: 'Check-out' });
alias('smoothSignature', 'Smooth Signature', C.capture, 'signature');
add('iframeEmbed', 'Iframe Embed', C.media, 'embed', { label: 'Embedded page', provider: 'iframe', url: '', height: 400 });
add('imageChoices', 'Image Choices', C.choice, 'imageChoice', { label: 'Pick one', options: ['Option 1', 'Option 2', 'Option 3'], images: [], multi: false });

// ── Choices & selection ──
add('checkboxInDropdown', 'Checkbox in Dropdown', C.choice, 'choice', { label: 'Select options', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, dropdown: true });
soon('progressBar', 'Progress Bar', C.display, 'Use Settings → Show progress bar');
soon('smsConfirmation', 'SMS Confirmation', C.text, 'Needs an SMS provider');
add('buttonCheckboxes', 'Button Checkboxes', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'buttons' });
soon('multiSelectGrid', 'MultiSelect Grid', C.choice, 'Planned: checkbox matrix');
soon('reviewBeforeSubmit', 'Review Before Submit', C.display, 'Planned: review step');
add('imagePicker', 'Image Picker', C.choice, 'imageChoice', { label: 'Pick an image', options: ['Option 1', 'Option 2', 'Option 3'], images: [], multi: false });
add('addressMapLocator', 'Address Map Locator', C.capture, 'location', { label: 'Your location', map: true });
add('shortScrollableTerms', 'Short Scrollable Terms', C.text, 'termsScroll', { label: 'Terms', terms: 'Write your terms here…', text: 'I have read and agree to the terms.' });
add('geolocation', 'Geolocation', C.capture, 'location', { label: 'Location', map: false });
add('dropdownPaging', 'Dropdown with Paging', C.choice, 'choice', { label: 'Search and select', options: ['Option 1', 'Option 2', 'Option 3'], dropdown: true, searchable: true });
add('orderableList', 'Orderable List', C.choice, 'rank', { label: 'Put these in order', options: ['First item', 'Second item', 'Third item'] });
add('autocomplete', 'Autocomplete', C.text, 'autocomplete', { label: 'Start typing', options: ['Apple', 'Banana', 'Cherry'], placeholder: '' });
alias('numericSlider', 'Numeric Slider', C.choice, 'slider');
soon('weeklyAppointmentPlanner', 'Weekly Appointment Planner', C.date, 'Use the Appointment element');
add('qrCode', 'QR Code', C.display, 'qr', { label: 'QR code', text: 'https://example.com', size: 180 });
add('getFormPageUrl', 'Get Form Page URL', C.meta, 'meta', { label: 'Form page URL', source: 'url' });
soon('docusign', 'Docusign', C.capture, 'Needs a DocuSign account');
add('visualMultiSelect', 'Visual Multi Select', C.choice, 'imageChoice', { label: 'Pick any', options: ['Option 1', 'Option 2', 'Option 3'], images: [], multi: true });
add('instagram', 'Instagram', C.social, 'button', { label: 'Follow on Instagram', text: 'Follow us on Instagram', value: 'https://instagram.com/', network: 'link' });
add('formSeparators', 'Form Separators', C.display, 'separator', { label: 'Separator', style: 'dashed', color: '#d6d3d1' });
alias('timePickerWidget', 'Time Picker', C.date, 'time');
add('gpsLocation', 'GPS Location', C.capture, 'location', { label: 'GPS location', map: true });
add('infiniteList', 'Infinite List', C.data, 'list', { label: 'List', columns: [{ label: 'Item', type: 'text' }], minRows: 1, maxRows: 100 });
add('fancyCheckboxes', 'Fancy Checkboxes', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'fancy' });
soon('uploadcare', 'File Uploader by Uploadcare', C.capture, 'Needs an Uploadcare account');
soon('ticketPurchases', 'Ticket Purchases', C.choice, 'Use the Product List element');
add('showMapLocation', 'Show Map Location', C.media, 'embed', { label: 'Map', provider: 'map', url: 'Pune, India', height: 320 });
add('lineCheckbox', 'Line Checkbox', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'line' });
soon('filledFields', 'Filled Fields', C.meta, 'Planned');
add('emailCorrectnessCheck', 'Email Correctness Check', C.text, 'validated', { label: 'Email', validator: 'email', placeholder: 'you@example.com' });
add('flatCheckbox', 'Flat Checkbox', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'flat' });
soon('slidersCalculated', 'Sliders with Calculated Result', C.calc, 'Use Slider + Form Calculation');
add('facebookFollow', 'Facebook Follow Box', C.social, 'button', { label: 'Follow on Facebook', text: 'Follow us on Facebook', value: 'https://facebook.com/', network: 'link' });
soon('groupedValuesDropdown', 'Grouped Values Dropdown', C.choice, 'Planned');
add('textareaAutosize', 'TextArea Autosize', C.text, 'textcounter', { label: 'Your answer', maxLength: '', rows: 3, autosize: true });
alias('birthDatePicker', 'Birth Date Picker', C.date, 'date', { label: 'Date of birth' });
alias('initials', 'Initials', C.capture, 'signature', { label: 'Initials' });
add('imageCheckboxes', 'Image Checkboxes', C.choice, 'imageChoice', { label: 'Pick any', options: ['Option 1', 'Option 2', 'Option 3'], images: [], multi: true });
soon('adobeSign', 'Adobe Sign', C.capture, 'Needs an Adobe Sign account');
add('voiceRecorder', 'Voice Recorder', C.capture, 'capture', { label: 'Record a voice note', capture: 'audio', maxSizeMb: 20 });
soon('qrCodeReader', 'QR Code Reader', C.capture, 'Planned: camera scanning');
soon('submissionsCounter', 'Submissions Counter', C.meta, 'Planned');
soon('autocompletedAddress', 'Autocompleted Address', C.pick, 'Needs a maps API key');
add('emailValidator', 'E-mail Validator', C.text, 'validated', { label: 'Email', validator: 'email', placeholder: 'you@example.com' });
alias('narrativeFields', 'Narrative Fields', C.text, 'fillblank');
soon('calculator', 'Calculator', C.calc, 'Planned');
add('buttonRadios', 'Button Radios', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'buttons' });
add('userContributedDropdown', 'User Contributed Dropdown', C.choice, 'choice', { label: 'Choose or add', options: ['Option 1', 'Option 2'], allowAdd: true, dropdown: true });
alias('sliderWidget', 'Slider', C.choice, 'slider');
soon('giftRegistry', 'Gift Registry', C.data, 'Needs stock tracking (planned)');
add('animatedHeading', 'Animated Heading', C.display, 'heading', { label: 'Animated heading', text: 'Welcome!', size: 32, align: 'left', animated: true });
soon('googleAnalytics', 'Google Analytics', C.meta, 'Planned: form-level tracking setting');
add('timer', 'Timer', C.display, 'clock', { label: 'Timer', mode: 'stopwatch' });
add('datesDifference', 'Dates Difference', C.calc, 'calc', { label: 'Days between', calc: 'datediff', a: '', b: '' });
add('fieldConfirmation', 'Field Confirmation', C.text, 'confirm', { label: 'Confirm value', validator: 'confirm', field: '' });
add('socialFollow', 'Social Follow', C.social, 'button', { label: 'Follow us', text: 'Follow us', value: 'https://', network: 'link' });
add('imageGallery', 'Image Gallery', C.display, 'gallery', { label: 'Image gallery', images: [], height: 160 });
add('geoStamp', 'Geo Stamp', C.capture, 'location', { label: 'Location stamp', map: false, auto: true });
add('randomValueGenerator', 'Random Value Generator', C.meta, 'meta', { label: 'Random value', source: 'random' });
add('squareCheckbox', 'Square Checkbox', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'square' });
add('countdown', 'Countdown', C.display, 'countdown', { label: 'Countdown', date: '', text: 'Registration closes in' });
alias('miniDatePicker', 'Mini Date Picker', C.date, 'date');
soon('quantityGiftRegistry', 'Quantity Gift Registry', C.data, 'Needs stock tracking (planned)');
soon('labelless', 'Labelless', C.display, 'Planned');
add('whatsappButton', 'WhatsApp Button', C.social, 'button', { label: 'WhatsApp', text: 'Chat on WhatsApp', value: '+91 98765 43210', message: 'Hi!', network: 'whatsapp' });
add('getVisitorLocation', 'Get Visitor Location', C.capture, 'location', { label: 'Visitor location', map: false, auto: true });
add('locationCoordinates', 'Location Coordinates', C.capture, 'location', { label: 'Coordinates', map: false });
add('countryPicker', 'Country Picker', C.pick, 'preset', { label: 'Country', dataset: 'countries' });
add('imageRadioButtons', 'Image Radio Buttons', C.choice, 'imageChoice', { label: 'Pick one', options: ['Option 1', 'Option 2'], images: [], multi: false });
add('calendly', 'Calendly', C.media, 'embed', { label: 'Book a time', provider: 'iframe', url: 'https://calendly.com/', height: 650 });
add('codeEditor', 'Code Editor', C.text, 'textcounter', { label: 'Code', rows: 8, mono: true, maxLength: '' });
soon('barcodeScanner', 'Barcode Scanner', C.capture, 'Planned: camera scanning');
add('drawOnImage', 'Draw on Image', C.capture, 'drawing', { label: 'Draw on the image', background: '' });
add('checkInCheckOut', 'Check In Check Out', C.date, 'daterange', { label: 'Stay', fromLabel: 'Check-in', toLabel: 'Check-out' });
soon('timeTracker', 'Time Tracker', C.date, 'Planned');
add('socialShare', 'Social Share', C.social, 'button', { label: 'Share', text: 'Share this form', value: '', network: 'share' });
soon('dynamicQrCode', 'Dynamic QR Code', C.display, 'Planned');
alias('largeDatePicker', 'Large Date Picker', C.date, 'date');
add('asmSelect', 'asmSelect', C.choice, 'choice', { label: 'Select options', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, dropdown: true });
alias('localizedCalendar', 'Localized Calendar', C.date, 'date');
soon('matrixCalculator', 'Matrix Calculator', C.calc, 'Planned');
add('fixedFormat', 'Fixed Format', C.text, 'masked', { label: 'Code', validator: 'mask', mask: '@@-####', placeholder: 'AB-1234' });
add('maskedInput', 'Masked Input', C.text, 'masked', { label: 'Masked input', validator: 'mask', mask: '(###) ###-####', placeholder: '' });
add('bootstrapSwitch', 'Bootstrap Switch Field', C.choice, 'toggle', { label: 'Toggle', onLabel: 'Yes', offLabel: 'No' });
add('phonePicker', 'Phone Picker', C.text, 'phoneIntl', { label: 'Phone number', code: '+91' });
add('soundcloud', 'SoundCloud', C.media, 'embed', { label: 'SoundCloud', provider: 'soundcloud', url: '', height: 166 });
add('datePickerYearMonth', 'DatePicker Year Month', C.date, 'plain', { label: 'Month', input: 'month' });
add('userContributedCheckbox', 'User Contributed Checkbox', C.choice, 'choice', { label: 'Choose or add', options: ['Option 1', 'Option 2'], multi: true, allowAdd: true });
add('textHighlight', 'Text Highlight', C.display, 'highlight', { label: 'Highlight', text: 'Important information goes here.', color: '#fef08a' });
soon('passageTest', 'Passage Test', C.display, 'Planned');
add('drawingBoard', 'Drawing Board', C.capture, 'drawing', { label: 'Draw here', background: '' });
alias('hiddenBox', 'Hidden Box', C.meta, 'hidden');
add('minimalCheckbox', 'Minimal Checkbox', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'minimal' });
add('lineRadioButtons', 'Line Radio Buttons', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'line' });
add('getReferrer', 'Get Referrer', C.meta, 'meta', { label: 'Referrer', source: 'referrer' });
soon('geoComplete', 'GeoComplete', C.pick, 'Needs a maps API key');
add('vimeo', 'Vimeo', C.media, 'embed', { label: 'Vimeo video', provider: 'vimeo', url: '', height: 360 });
soon('xverifyEmail', 'XVerify Email', C.text, 'Needs an XVerify account');
add('fancyRangeSlider', 'Fancy Range Slider', C.choice, 'range', { label: 'Range', min: 0, max: 100, step: 1 });
add('spacer', 'Spacer', C.display, 'spacer', { label: 'Spacer', height: 32 });
add('squareRadioButtons', 'Square Radio Buttons', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'square' });
soon('unfilledFields', 'Unfilled Fields', C.meta, 'Planned');
add('internationalTelephonePicker', 'International Telephone Picker', C.text, 'phoneIntl', { label: 'Phone number', code: '+91' });
add('annotatePicture', 'Annotate Picture', C.capture, 'drawing', { label: 'Annotate the picture', background: '' });
add('dayCountdown', 'Day Countdown', C.display, 'countdown', { label: 'Days left', date: '', text: 'Days to go' });
add('toggledContent', 'Toggled Content', C.display, 'spoiler', { label: 'More info', title: 'Show details', text: 'Hidden content.' });
soon('grading', 'Grading', C.calc, 'Planned');
soon('facebookPixel', 'Facebook Pixel', C.meta, 'Planned: form-level tracking setting');
add('rangeSlider', 'Range Slider', C.choice, 'range', { label: 'Range', min: 0, max: 100, step: 1 });
soon('substring', 'Substring', C.calc, 'Planned');
add('selectCountry', 'Select Country', C.pick, 'preset', { label: 'Country', dataset: 'countries' });
add('basicSeparator', 'Basic Separator', C.display, 'separator', { label: 'Separator', style: 'solid', color: '#e7e5e4' });
add('globalCountdown', 'Global Countdown', C.display, 'countdown', { label: 'Countdown', date: '', text: 'Starts in' });
alias('mathCaptcha', 'Math Captcha', C.text, 'captcha');
add('coolCaption', 'Cool Caption', C.display, 'heading', { label: 'Caption', text: 'A cool caption', size: 24, align: 'left' });
add('percentage', 'Percentage', C.calc, 'calc', { label: 'Percentage', calc: 'percentage', a: '', b: '' });
soon('squireEditor', 'Squire Editor', C.text, 'Planned: rich text editor');
alias('sliderTimePicker', 'Slider Time Picker', C.date, 'time');
soon('gpsDirections', 'GPS Directions', C.capture, 'Needs a maps API key');
alias('ios7Date', 'iOS7 Date', C.date, 'date');
add('androidTextImage', 'Android Text & Image', C.display, 'text', { label: 'Text', text: 'Text block' });
soon('addToHomeScreen', 'Add to Home Screen', C.social, 'Use Apps to publish a home-screen app');
add('selectAll', 'Select All', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, selectAll: true });
soon('allStatesCities', 'All States and Cities', C.pick, 'Needs a cities dataset');
add('ticker', 'Ticker', C.display, 'ticker', { label: 'Ticker', text: 'Breaking news: registrations are open!' });
add('fancyTimer', 'Fancy Timer', C.display, 'clock', { label: 'Timer', mode: 'stopwatch' });
add('colorPicker', 'Color Picker', C.choice, 'plain', { label: 'Pick a colour', input: 'color' });
soon('photozou', 'Photozou', C.media);
add('polarisCheckbox', 'Polaris Checkbox', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'cards' });
add('languagePicker', 'Language Picker', C.pick, 'preset', { label: 'Language', dataset: 'languages' });
soon('drivingDistance', 'Driving Distance', C.calc, 'Needs a maps API key');
add('futuricoCheckbox', 'Futurico Checkbox', C.choice, 'choice', { label: 'Choose any', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, style: 'fancy' });
add('spoilerText', 'Spoiler Text', C.display, 'spoiler', { label: 'Spoiler', title: 'Reveal', text: 'Hidden text.' });
soon('kinomap', 'Kinomap', C.media);
add('getUserAgent', 'Get User Agent', C.meta, 'meta', { label: 'Browser', source: 'useragent' });
soon('drawingCaptcha', 'Drawing Captcha', C.text, 'Use Captcha');
alias('androidDate', 'Android Date', C.date, 'date');
add('autoScrollingText', 'AutoScrolling Text', C.display, 'ticker', { label: 'Scrolling text', text: 'Scrolling announcement' });
add('rangeWidget', 'Range', C.choice, 'range', { label: 'Range', min: 0, max: 100, step: 1 });
add('testimonials', 'Testimonials', C.display, 'quotes', { label: 'Testimonials', items: ['Great experience! — Asha', 'Very easy to use. — Rahul'] });
soon('topaz', 'Topaz', C.capture, 'Needs a signature pad device');
add('gaugeInput', 'Gauge Input', C.choice, 'slider', { label: 'Gauge', min: 0, max: 100, step: 1, leftLabel: 'Low', rightLabel: 'High' });
soon('numerals', 'Numerals', C.text, 'Planned');
soon('textResizer', 'Text Resizer', C.display, 'Planned');
add('bmiCalculator', 'BMI Calculator', C.calc, 'calc', { label: 'BMI', calc: 'bmi', a: '', b: '' });
add('usStatePicker', 'US State Picker', C.pick, 'preset', { label: 'State', dataset: 'usStates' });
soon('lobAddress', 'Lob Address Verification', C.pick, 'Needs a Lob account');
add('userContributedRadio', 'User Contributed Radio Buttons', C.choice, 'choice', { label: 'Choose or add', options: ['Option 1', 'Option 2'], allowAdd: true });
soon('cincopa', 'Cincopa', C.media); soon('deepUploader', 'DeepUploader', C.capture); soon('breadcrumbs', 'Breadcrumbs', C.display); soon('facebookComments', 'Facebook Comments', C.social);
add('rankingWidget', 'Ranking Widget', C.choice, 'rank', { label: 'Rank these', options: ['Item A', 'Item B', 'Item C'] });
add('minimalRadioButtons', 'Minimal Radio Buttons', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'minimal' });
add('comparisonSlider', 'Comparison Slider', C.media, 'compare', { label: 'Before and after', before: '', after: '', height: 300 });
add('autoComplete2', 'Auto complete', C.text, 'autocomplete', { label: 'Start typing', options: ['Option 1', 'Option 2'], placeholder: '' });
soon('autoJs', 'AutoJS', C.display);
add('flatRadioButtons', 'Flat Radio Buttons', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'flat' });
alias('largeTimePicker', 'Large Time Picker', C.date, 'time');
add('likeDislike', 'Like and Dislike', C.choice, 'choice', { label: 'Did you like it?', options: ['👍 Like', '👎 Dislike'], style: 'buttons' });
soon('ckeditor', 'CKEditor', C.text, 'Planned: rich text editor');
add('knob', 'Knob', C.choice, 'slider', { label: 'Value', min: 0, max: 100, step: 1, leftLabel: '', rightLabel: '' });
add('bigHeaderCity', 'Big Header (City)', C.display, 'heading', { label: 'Header', text: 'Big header', size: 44, align: 'center' });
add('scrollToTop', 'Scroll to Top', C.display, 'button', { label: 'Scroll to top', text: 'Back to top ↑', network: 'top' });
soon('statCounter', 'StatCounter', C.meta);
add('openStreetMap', 'Open Street Map', C.media, 'embed', { label: 'Map', provider: 'map', url: 'Pune, India', height: 320 });
add('spotify', 'Spotify', C.media, 'embed', { label: 'Spotify', provider: 'spotify', url: '', height: 152 });
soon('postalCodeSearch', 'Postal Code Search', C.pick, 'Needs a postal-code API');
add('fancyRadios', 'Fancy Radios', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'fancy' });
add('countryCode', 'Country Code', C.text, 'phoneIntl', { label: 'Phone number', code: '+91' });
add('loomVideoEmbed', 'Loom Video Embed', C.media, 'embed', { label: 'Loom video', provider: 'loom', url: '', height: 360 });
add('simpleColorPicker', 'Simple Color Picker', C.choice, 'plain', { label: 'Pick a colour', input: 'color' });
add('currencyPicker', 'Currency Picker', C.pick, 'preset', { label: 'Currency', dataset: 'currencies' });
soon('giphy', 'Giphy', C.media); soon('noScript', 'NoScript', C.display);
add('xTwitter', 'X (Formerly Twitter)', C.social, 'button', { label: 'Follow on X', text: 'Follow us on X', value: 'https://x.com/', network: 'link' });
soon('fancy', 'Fancy', C.display);
add('fancyLargeInput', 'Fancy Large Input', C.text, 'validated', { label: 'Your answer', validator: 'none', placeholder: '', large: true });
soon('twentyThree', 'TwentyThree (Formerly 23 Video)', C.media); soon('zipAutoSuggest', 'Zip Code Auto-Suggest', C.pick, 'Needs a postal-code API'); soon('transloadit', 'Transloadit', C.capture); soon('tinymce', 'TinyMCE', C.text, 'Planned: rich text editor'); soon('smarty', 'Smarty (Formerly SmartyStreets)', C.pick);
add('tagInput', 'Tag Input', C.text, 'tags', { label: 'Tags', max: 10 });
add('polarisRadioButtons', 'Polaris Radio Buttons', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'cards' });
soon('pastebin', 'Pastebin', C.media);
add('characterCounter', 'Character Counter', C.text, 'textcounter', { label: 'Your answer', maxLength: 280, rows: 4 });
add('digitalClock', 'Digital Clock', C.display, 'clock', { label: 'Clock', timezone: '' });
add('distanceConverter', 'Distance Converter', C.calc, 'calc', { label: 'Distance in miles', calc: 'kmToMiles', a: '' });
soon('ziggeoPlayer', 'Ziggeo Video Player', C.media); soon('androidList', 'Android List', C.display); soon('arcText', 'Arc Text', C.display);
add('advancedColorPicker', 'Advanced Color Picker', C.choice, 'plain', { label: 'Pick a colour', input: 'color' });
add('findCountry', 'Find a Country', C.pick, 'preset', { label: 'Country', dataset: 'countries' });
soon('rollDice', 'Roll Dice', C.display); soon('readingTime', 'Reading Time', C.display); soon('accessibilityEnhancer', 'Accessibility Enhancer', C.display); soon('jsfiddle', 'jsFiddle', C.media); soon('ziggeoRecorder', 'Ziggeo Video Recorder', C.capture); soon('diagramsNet', 'Diagrams.net (Formerly Draw.io)', C.media);
alias('ios7Time', 'iOS7 Time', C.date, 'time');
soon('convertedSelector', 'Converted Selector', C.choice);
add('bigHeaderChubby', 'Big Header (Chubby)', C.display, 'heading', { label: 'Header', text: 'Big header', size: 44, align: 'left' });
add('dualListBox', 'Dual ListBox', C.choice, 'choice', { label: 'Select items', options: ['Item 1', 'Item 2', 'Item 3'], multi: true, dropdown: true });
soon('w3counter', 'W3Counter', C.meta);
add('quotes', 'Quotes', C.display, 'quotes', { label: 'Quote', items: ['The best way to predict the future is to create it. — Peter Drucker'] });
soon('shuffle', 'Shuffle', C.display); soon('animoto', 'Animoto', C.media); soon('keypad', 'Keypad', C.text);
add('timezonePicker', 'Timezone Picker', C.pick, 'preset', { label: 'Time zone', dataset: 'timezones' });
soon('chartbeat', 'ChartBeat', C.meta); soon('loomRecorder', 'Loom Video Recorder', C.capture, 'Needs a Loom account');
add('bodyWeightConverter', 'Body Weight Converter', C.calc, 'calc', { label: 'Weight in pounds', calc: 'kgToLb', a: '' });
soon('bases', 'Bases', C.calc); soon('airportPicker', 'Airport Picker', C.pick, 'Needs an airports dataset'); soon('mathGraphs', 'Math Graphs', C.display); soon('currencyConverter', 'Currency Converter', C.calc, 'Needs live exchange rates'); soon('checkDomain', 'Check Domain Name IP', C.text); soon('clearout', 'Clearout Email Validation', C.text, 'Needs a Clearout account');
soon('imageUploadNotes', 'Image Upload with Notes', C.capture, 'Planned'); soon('sketchfab', 'Sketchfab', C.media); soon('calorieIntake', 'Calorie Intake Calculator', C.calc, 'Planned');
add('worldTime', 'World Time', C.display, 'clock', { label: 'World time', timezone: 'Asia/Kolkata' });
add('futuricoRadioButtons', 'Futurico Radio Buttons', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'], style: 'fancy' });
alias('androidTime', 'Android Time', C.date, 'time');
soon('messengerButton', 'Messenger Button', C.social); soon('googleFontsPicker', 'Google Fonts Picker', C.pick);
add('heightConverter', 'Height Converter', C.calc, 'calc', { label: 'Height in feet', calc: 'cmToFt', a: '' });
add('temperatureConverter', 'Temperature Converter', C.calc, 'calc', { label: 'Temperature in °F', calc: 'cToF', a: '' });
soon('reusableDropdown', 'Reusable Dropdown', C.choice); soon('flickr', 'Flickr', C.media); soon('ticTacToe', 'Tic Tac Toe', C.display); soon('wordpressTv', 'WordPress tv', C.media); soon('mathjax', 'MathJax', C.display); soon('skypeCall', 'Skype Call Button', C.social);
add('farbtasticColorPicker', 'Farbtastic Color Picker', C.choice, 'plain', { label: 'Pick a colour', input: 'color' });
soon('rssReader', 'Rss Reader', C.media); soon('citiesItaly', 'Cities of Italy', C.pick, 'Needs a cities dataset'); soon('remainingReadingTime', 'Remaining Reading Time', C.display);
add('indiaStates', 'India States', C.pick, 'preset', { label: 'State / UT', dataset: 'indiaStates' });
soon('fontPicker', 'Font Picker', C.pick); soon('donationThermometer', 'Donation Thermometer', C.display, 'Planned'); soon('viddler', 'Viddler', C.media);
add('bigHeaderComics', 'Big Header (Comics)', C.display, 'heading', { label: 'Header', text: 'Big header', size: 44, align: 'center' });
add('vimeoLivestream', 'Vimeo Livestream', C.media, 'embed', { label: 'Livestream', provider: 'vimeo', url: '', height: 360 });
soon('circular', 'Circular', C.display);
add('knobCanvas', 'Knob Canvas', C.choice, 'slider', { label: 'Value', min: 0, max: 100, step: 1, leftLabel: '', rightLabel: '' });
add('spoiler', 'Spoiler', C.display, 'spoiler', { label: 'Spoiler', title: 'Show', text: 'Hidden text.' });
add('brazilStates', 'Brazil States', C.pick, 'preset', { label: 'Estado', dataset: 'brazilStates' });
soon('circuitlab', 'Circuitlab', C.media); soon('pinterest', 'Pinterest', C.social);
add('bigHeaderSports', 'Big Header (Sports)', C.display, 'heading', { label: 'Header', text: 'Big header', size: 44, align: 'center' });
soon('fiverrLogoMaker', 'Fiverr Logo Maker', C.media); soon('youku', 'Youku', C.media); soon('mixcloud', 'MixCloud', C.media);
add('dailymotion', 'Dailymotion', C.media, 'embed', { label: 'Dailymotion video', provider: 'dailymotion', url: '', height: 360 });
soon('addressSearchPreview', 'Address Search & Preview', C.pick, 'Needs a maps API key'); soon('yandexMetrica', 'Yandex Metrica', C.meta); soon('scribd', 'Scribd', C.media); soon('fontSizePicker', 'Font Size Picker', C.pick);
add('usTimezonePicker', 'US Timezone Picker', C.pick, 'preset', { label: 'Time zone', dataset: 'usTimezones' });
soon('citiesRussia', 'Cities of Russia', C.pick, 'Needs a cities dataset'); soon('disqus', 'Disqus', C.social); soon('domainWhois', 'Simple Domain Whois Checker', C.text); soon('liquidVolume', 'Liquid Volume', C.calc);
add('dateRangePicker', 'Date Range Picker', C.date, 'daterange', { label: 'Date range', fromLabel: 'From', toLabel: 'To' });
add('canadianProvinces', 'Canadian Provinces Picker', C.pick, 'preset', { label: 'Province', dataset: 'canadaProvinces' });
soon('citiesTurkey', 'Cities of Turkey', C.pick, 'Needs a cities dataset'); soon('usCountyFinder', 'US County Finder', C.pick); soon('zuko', 'Zuko Form Analytics', C.meta); soon('citiesIndonesia', 'Cities of Indonesia', C.pick, 'Needs a cities dataset'); soon('d7Verification', 'D7 Verification', C.text, 'Needs an SMS provider'); soon('deviantart', 'DeviantArt', C.media); soon('ocrAutofill', 'OCR Autofill', C.capture, 'Needs an OCR service');
add('philippinesProvinces', 'Provinces of Philippines', C.pick, 'preset', { label: 'Province', dataset: 'philippinesProvinces' });
add('australiaStates', 'States and Territories of Australia', C.pick, 'preset', { label: 'State / Territory', dataset: 'australiaStates' });
soon('quadernoTax', 'Quaderno Tax Rates', C.calc); soon('ukCityPicker', 'UK City Picker', C.pick, 'Needs a cities dataset'); soon('citiesMexico', 'Cities of Mexico', C.pick, 'Needs a cities dataset'); soon('speechToText', 'Speech to Text', C.capture, 'Needs a speech service');
add('germanyStates', 'States of Germany', C.pick, 'preset', { label: 'Bundesland', dataset: 'germanyStates' });
soon('angles', 'Angles', C.display); soon('anglePicker', 'Angle Picker', C.choice); soon('citiesSpain', 'Cities of Spain', C.pick, 'Needs a cities dataset'); soon('provincesFrance', 'Provinces of France', C.pick); soon('provincesThailand', 'Provinces of Thailand', C.pick); soon('aiScanBusinessCards', 'AI Scan Business Cards', C.capture, 'Needs an AI vision service'); soon('voiceform', 'Voice Recording & AI Follow-Ups by Voiceform', C.capture); soon('autoPageTimer', 'Auto Page Timer', C.display); soon('imageScanner', 'Image Scanner', C.capture); soon('citiesChina', 'Cities of China', C.pick); soon('citiesNetherlands', 'Cities of Netherlands', C.pick);
add('hdTakePhoto', 'HD Take Photo', C.capture, 'capture', { label: 'Take a photo', capture: 'photo', maxSizeMb: 20 });
soon('citiesPortugal', 'Cities of Portugal', C.pick); soon('videoCompletionGate', 'Video Completion Gate', C.media); soon('matchItems', 'Match Items', C.choice);
add('audioPlayer', 'Audio Player', C.media, 'embed', { label: 'Audio', provider: 'audio', url: '', height: 60 });
add('topChoiceRanking', 'Top Choice Ranking', C.choice, 'rank', { label: 'Rank your top choices', options: ['Choice A', 'Choice B', 'Choice C'] });
soon('locationVerification', 'Location Verification', C.capture); soon('calculationChart', 'Calculation Chart', C.calc); soon('remoteDataDropdown', 'Remote Data Dropdown', C.choice, 'Needs an external data source');
add('currencyAmountInput', 'Currency Amount Input', C.text, 'currencyAmount', { label: 'Amount', currency: 'INR' });
soon('photoWatermark', 'Photo Watermark', C.capture);
add('searchableMultipleSelection', 'Searchable Multiple Selection', C.choice, 'choice', { label: 'Search and select', options: ['Option 1', 'Option 2', 'Option 3'], multi: true, dropdown: true, searchable: true });
soon('routePlannerMap', 'Route Planner Map', C.capture, 'Needs a maps API key');
add('addToCalendar', 'Add to Calendar', C.social, 'calendar', { label: 'Add to calendar', text: 'My event', start: '', end: '', location: '' });
add('bipolarLikert', 'Bipolar Likert Scale', C.choice, 'likert', { label: 'Rate', leftLabel: 'Disagree', rightLabel: 'Agree', points: 7 });
soon('aiScanEventBadges', 'AI Scan Event Badges', C.capture, 'Needs an AI vision service'); soon('nearestLocation', 'Nearest Location Finder', C.capture); soon('mostFrequentAnswer', 'Most Frequent Answer', C.calc);
add('toggleOptions', 'Toggle Options', C.choice, 'choice', { label: 'Choose one', options: ['Option 1', 'Option 2'], style: 'buttons' });
soon('instantQuizFeedback', 'Instant Quiz Feedback', C.calc, 'Planned'); soon('calculatedScoreMeter', 'Calculated Score Meter', C.calc, 'Planned');
add('sendSmsButton', 'Send SMS Button', C.social, 'button', { label: 'Send SMS', text: 'Send us an SMS', value: '+91 98765 43210', message: 'Hi!', network: 'sms' });
add('singleChoiceDescriptions', 'Single Choice with Descriptions', C.choice, 'described', { label: 'Choose a plan', options: ['Basic', 'Pro'], descriptions: ['For individuals', 'For teams'] });
soon('barcodeGenerator', 'Barcode Generator', C.display); soon('documentChecklistUpload', 'Document Checklist Upload', C.capture, 'Planned'); soon('productCarousel', 'Product Carousel', C.display);
add('googleSheetsEmbed', 'Google Sheets Embed', C.media, 'embed', { label: 'Spreadsheet', provider: 'iframe', url: '', height: 400 });
add('starRatingComment', 'Star Rating Comment', C.choice, 'ratingComment', { label: 'Rate and comment', stars: 5 });
add('shortVideoRecorder', 'Short Video Recorder', C.capture, 'capture', { label: 'Record a short video', capture: 'video', maxSizeMb: 50 });
add('ibanValidator', 'IBAN Validator', C.text, 'validated', { label: 'IBAN', validator: 'iban', placeholder: 'GB82 WEST 1234 5698 7654 32' });
soon('multiBarcodeScanner', 'Multi Barcode Scanner', C.capture, 'Planned: camera scanning');
add('currentTimeStamp', 'Current Time Stamp', C.meta, 'meta', { label: 'Time stamp', source: 'timestamp' });
add('confidenceSlider', 'Confidence Slider', C.choice, 'slider', { label: 'How confident are you?', min: 0, max: 100, step: 5, leftLabel: 'Not at all', rightLabel: 'Very' });
soon('googleDriveFiles', 'File list for Google Drive', C.capture, 'Needs Google Drive'); soon('addToContacts', 'Add to Contacts Button', C.social);
add('ageCalculator', 'Age Calculator', C.calc, 'calc', { label: 'Age', calc: 'age', a: '' });
add('addDaysCalculator', 'Add Days Calculator', C.calc, 'calc', { label: 'Resulting date', calc: 'adddays', a: '', b: '' });
add('phoneCallButton', 'Phone Call Button', C.social, 'button', { label: 'Call us', text: 'Call us', value: '+91 98765 43210', network: 'call' });
soon('lineChat', 'LINE Chat Button', C.social);
add('canvaEmbed', 'Canva Embed', C.media, 'embed', { label: 'Canva design', provider: 'iframe', url: '', height: 400 });
add('characterBoxes', 'Character Boxes', C.text, 'charboxes', { label: 'Code', length: 6, numeric: true });
add('cpfValidator', 'CPF Validator', C.text, 'validated', { label: 'CPF', validator: 'cpf', placeholder: '000.000.000-00' });
soon('imageRanking', 'Image Ranking', C.choice); soon('bodyParts', 'Body Parts Selector', C.choice); soon('mapArea', 'Map Area Selector', C.choice);
add('clickTallyCounter', 'Click Tally Counter', C.choice, 'stepper', { label: 'Count', min: 0, max: '', step: 1 });
soon('dynamicImagePreview', 'Dynamic Image Preview', C.display);
add('copyTextButton', 'Copy Text Button', C.social, 'button', { label: 'Copy', text: 'Copy code', value: 'WELCOME10', network: 'copy' });
soon('imageAreaSelector', 'Image Area Selector', C.choice);
add('digitStepper', 'Digit Stepper', C.choice, 'stepper', { label: 'Quantity', min: 0, max: 10, step: 1 });
soon('digitalMagazine', 'Digital Magazine', C.media);
add('tiktokEmbed', 'TikTok Embed', C.media, 'embed', { label: 'TikTok video', provider: 'tiktok', url: '', height: 740 });
add('textCountCalculator', 'Text Count Calculator', C.calc, 'calc', { label: 'Word count', calc: 'words', a: '' });
soon('telnyx', 'Telnyx Phone Validator', C.text, 'Needs a Telnyx account'); soon('zerobounce', 'ZeroBounce Email Verification', C.text, 'Needs a ZeroBounce account');
add('clipboardImage', 'Clipboard Image', C.capture, 'capture', { label: 'Paste an image', capture: 'clipboard', maxSizeMb: 10 });
soon('textSplitter', 'Text Splitter', C.calc); soon('voteAllocation', 'Vote Allocation', C.choice); soon('bracketTournaments', 'Bracket Tournaments', C.display); soon('serviceAreaChecker', 'Service Area Checker', C.capture); soon('weather', 'Weather', C.display, 'Needs a weather API');
add('loanEmiCalculator', 'Loan EMI Calculator', C.calc, 'calc', { label: 'Monthly EMI', calc: 'emi', a: '', b: '', c: '' });
soon('textToSpeech', 'Text to Speech', C.display); soon('listenRecord', 'Listen & Record', C.capture); soon('slotWithSites', 'Slot With Sites', C.date);
add('simpleLoanCalculator', 'Simple Loan Calculator', C.calc, 'calc', { label: 'Total payable', calc: 'simpleloan', a: '', b: '', c: '' });
soon('streetViewSearch', 'Street View Address Search', C.pick, 'Needs a maps API key'); soon('fundraisingMeter', 'Fundraising Progress Meter', C.display, 'Planned');
add('linkedinValidator', 'Linkedin Profile URL Validator', C.text, 'validated', { label: 'LinkedIn profile', validator: 'linkedin', placeholder: 'https://www.linkedin.com/in/…' });
soon('imageEditor', 'Image Editor', C.capture);
add('amountToWords', 'Amount to Words Converter', C.calc, 'calc', { label: 'Amount in words', calc: 'words_inr', a: '' });
add('facebookVideoEmbed', 'Facebook Video Embed', C.media, 'embed', { label: 'Facebook video', provider: 'facebook', url: '', height: 360 });
soon('postcodes4u', 'Postcodes4u Address Lookup', C.pick); soon('vinAutofill', 'VIN Autofill', C.text); soon('raffleTickets', 'Raffle Ticket Allocator', C.data); soon('typingSpeedTest', 'Typing Speed Test', C.display);
add('usZipValidator', 'US ZIP Code Validator', C.text, 'validated', { label: 'ZIP code', validator: 'zipus', placeholder: '12345' });
soon('spellChecker', 'Spell Checker', C.text); soon('digitPicker', 'Digit Picker', C.choice);
add('ssnValidator', 'SSN Validator', C.text, 'validated', { label: 'SSN', validator: 'ssn', placeholder: '123-45-6789' });
soon('airportDistance', 'Airport Distance', C.calc);
add('canadianSin', 'Canadian SIN Validator', C.text, 'validated', { label: 'SIN', validator: 'sin', placeholder: '046 454 286' });
add('codiceFiscale', 'Italian Codice Fiscale Validator', C.text, 'validated', { label: 'Codice fiscale', validator: 'codicefiscale', placeholder: 'RSSMRA85T10A562S' });
soon('randomContentPicker', 'Random Content Picker', C.display); soon('enneagramTest', 'Enneagram Test', C.calc); soon('odontogram', 'Odontogram Selector', C.choice);
add('chileanRut', 'Chilean RUT Validator', C.text, 'validated', { label: 'RUT', validator: 'rut', placeholder: '12.345.678-5' });
soon('rxnorm', 'RxNorm Medication Lookup', C.pick); soon('canadaPost', 'Canada Post AddressComplete', C.pick);
add('brazilianCep', 'Brazilian CEP Validator', C.text, 'validated', { label: 'CEP', validator: 'cep', placeholder: '01310-100' });
soon('flipCard', 'Flip Card', C.display);
add('israeliId', 'Israeli ID Validator', C.text, 'validated', { label: 'Teudat Zehut', validator: 'israeli', placeholder: '000000018' });
soon('imageMemoryGame', 'Image Memory Game', C.display);
add('australiaBsb', 'Australia BSB Number Checker', C.text, 'validated', { label: 'BSB number', validator: 'bsb', placeholder: '062-000' });
soon('solarLunar', 'Solar Lunar Date Converter', C.date);
add('frenchSiren', 'French SIREN Validator', C.text, 'validated', { label: 'SIREN', validator: 'siren', placeholder: '732 829 320' });
soon('cloudflareTurnstile', 'Cloudflare Turnstile', C.text, 'Needs Turnstile keys (planned)');
add('squareFootage', 'Square Footage Calculator', C.calc, 'calc', { label: 'Area', calc: 'area', a: '', b: '' });
add('spanishTaxId', 'Spanish Tax ID Validator', C.text, 'validated', { label: 'NIF / NIE', validator: 'nif', placeholder: '12345678Z' });
add('germanTaxId', 'German Tax ID Validator', C.text, 'validated', { label: 'Steuer-ID', validator: 'germantax', placeholder: '86095742719' });
soon('mathSymbolPalette', 'Math Symbol Palette', C.text);
add('isbnLookup', 'ISBN Book Lookup', C.text, 'validated', { label: 'ISBN', validator: 'isbn', placeholder: '978-3-16-148410-0' });
soon('franceRegionMap', 'France Region Map Picker', C.pick); soon('aiImageGenerator', 'AI Image Generator', C.display, 'Needs an AI image service'); soon('connectionStatus', 'Connection Status Warning', C.display); soon('japanPostal', 'Japan Postal Code Autofill', C.pick); soon('indiaPanchayat', 'India Panchayat Dropdown', C.pick, 'Needs a panchayat dataset'); soon('dutchPostcode', 'Dutch Postcode Address Lookup', C.pick);
// India-first extras (not in Jotform).
add('panValidator', 'PAN Validator (India)', C.text, 'validated', { label: 'PAN', validator: 'pan', placeholder: 'ABCDE1234F' }, { isNew: true });
add('gstinValidator', 'GSTIN Validator (India)', C.text, 'validated', { label: 'GSTIN', validator: 'gstin', placeholder: '27AAPFU0939F1ZV' }, { isNew: true });
add('aadhaarValidator', 'Aadhaar Number Validator (India)', C.text, 'validated', { label: 'Aadhaar number', validator: 'aadhaar', placeholder: '1234 5678 9012' }, { isNew: true });
add('pincodeValidator', 'PIN Code Validator (India)', C.text, 'validated', { label: 'PIN code', validator: 'pincode', placeholder: '411001' }, { isNew: true });

export const WIDGETS = W;
export const WIDGET_BY_KEY = Object.fromEntries(W.map((w) => [w.key, w]));
export const WIDGET_CATEGORIES = Object.values(C);
export const widgetSettings = (w) => S[w?.kind] || [];
export const isDisplayWidget = (f) => !!KINDS[WIDGET_BY_KEY[f.widget]?.kind]?.display;
export const widgetKind = (f) => WIDGET_BY_KEY[f.widget]?.kind;

// ── Validators ──
const digits = (v) => String(v).replace(/\D/g, '');
const luhn = (s) => [...s].reverse().reduce((sum, d, i) => { let n = Number(d); if (i % 2) { n *= 2; if (n > 9) n -= 9; } return sum + n; }, 0) % 10 === 0;
const VERHOEFF_D = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]];
const VERHOEFF_P = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]];
const verhoeff = (s) => [...s].reverse().reduce((c, d, i) => VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(d)]], 0) === 0;

export function maskMatches(mask, v) {
  if (String(v).length !== mask.length) return false;
  return [...mask].every((m, i) => {
    const c = String(v)[i];
    if (m === '#') return /\d/.test(c);
    if (m === '@') return /[A-Za-z]/.test(c);
    if (m === '*') return /[A-Za-z0-9]/.test(c);
    return c === m;
  });
}

const CHECKS = {
  none: () => true,
  email: (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v),
  iban: (v) => {
    const s = v.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    const n = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
    let r = 0; for (const ch of n) r = (r * 10 + Number(ch)) % 97;
    return r === 1;
  },
  ssn: (v) => /^(?!000|666|9\d\d)\d{3}-?(?!00)\d{2}-?(?!0000)\d{4}$/.test(v.trim()),
  zipus: (v) => /^\d{5}(-\d{4})?$/.test(v.trim()),
  cep: (v) => /^\d{5}-?\d{3}$/.test(v.trim()),
  bsb: (v) => /^\d{3}-?\d{3}$/.test(v.trim()),
  pincode: (v) => /^[1-9]\d{5}$/.test(v.trim()),
  linkedin: (v) => /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub|company)\/[\w\-%.]+\/?$/i.test(v.trim()),
  sin: (v) => { const d = digits(v); return d.length === 9 && luhn(d); },
  siren: (v) => { const d = digits(v); return d.length === 9 && luhn(d); },
  aadhaar: (v) => { const d = digits(v); return d.length === 12 && /^[2-9]/.test(d) && verhoeff(d); },
  pan: (v) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.trim().toUpperCase()),
  gstin: (v) => {
    const s = v.trim().toUpperCase();
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s)) return false;
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sum = 0;
    for (let i = 0; i < 14; i++) { const p = chars.indexOf(s[i]) * (i % 2 ? 2 : 1); sum += Math.floor(p / 36) + (p % 36); }
    return chars[(36 - (sum % 36)) % 36] === s[14];
  },
  cpf: (v) => {
    const d = digits(v);
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const check = (len) => { let s = 0; for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i); const r = (s * 10) % 11; return (r === 10 ? 0 : r) === Number(d[len]); };
    return check(9) && check(10);
  },
  rut: (v) => {
    const s = v.replace(/[.\s-]/g, '').toUpperCase();
    if (!/^\d{7,8}[\dK]$/.test(s)) return false;
    let sum = 0, m = 2;
    for (let i = s.length - 2; i >= 0; i--) { sum += Number(s[i]) * m; m = m === 7 ? 2 : m + 1; }
    const dv = 11 - (sum % 11);
    return (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv)) === s[s.length - 1];
  },
  israeli: (v) => {
    const d = digits(v).padStart(9, '0');
    if (d.length !== 9) return false;
    return [...d].reduce((s, c, i) => { let n = Number(c) * ((i % 2) + 1); if (n > 9) n -= 9; return s + n; }, 0) % 10 === 0;
  },
  isbn: (v) => {
    const s = v.replace(/[\s-]/g, '').toUpperCase();
    if (/^\d{9}[\dX]$/.test(s)) return [...s].reduce((a, c, i) => a + (c === 'X' ? 10 : Number(c)) * (10 - i), 0) % 11 === 0;
    if (/^\d{13}$/.test(s)) return [...s].reduce((a, c, i) => a + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0;
    return false;
  },
  nif: (v) => {
    const s = v.trim().toUpperCase().replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2');
    if (!/^\d{8}[A-Z]$/.test(s)) return false;
    return 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(s.slice(0, 8)) % 23] === s[8];
  },
  germantax: (v) => {
    const d = digits(v);
    if (d.length !== 11 || d[0] === '0') return false;
    let p = 10;
    for (let i = 0; i < 10; i++) { let s = (Number(d[i]) + p) % 10; if (s === 0) s = 10; p = (s * 2) % 11; }
    return (11 - p) % 10 === Number(d[10]);
  },
  codicefiscale: (v) => /^[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]$/i.test(v.trim()),
};

const MESSAGES = {
  email: 'Enter a valid e-mail address.', iban: 'Enter a valid IBAN.', ssn: 'Enter a valid SSN (123-45-6789).', zipus: 'Enter a valid ZIP code.',
  cep: 'Enter a valid CEP (00000-000).', bsb: 'Enter a valid BSB (000-000).', pincode: 'Enter a valid 6-digit PIN code.', linkedin: 'Enter a LinkedIn profile URL.',
  sin: 'Enter a valid SIN.', siren: 'Enter a valid SIREN number.', aadhaar: 'Enter a valid 12-digit Aadhaar number.', pan: 'Enter a valid PAN (ABCDE1234F).',
  gstin: 'Enter a valid GSTIN.', cpf: 'Enter a valid CPF.', rut: 'Enter a valid RUT.', israeli: 'Enter a valid ID number.', isbn: 'Enter a valid ISBN.',
  nif: 'Enter a valid NIF / NIE.', germantax: 'Enter a valid Steuer-ID.', codicefiscale: 'Enter a valid codice fiscale.',
};

// ── Calculators (run in shared/logic.js, so the server recomputes them) ──
const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const three = (n) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ''}` : two(n));
// Indian numbering: crore, lakh, thousand.
export function inrWords(value) {
  const n = Math.floor(Math.abs(Number(value)));
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'Zero Rupees';
  const parts = [];
  const crore = Math.floor(n / 1e7), lakh = Math.floor((n % 1e7) / 1e5), thousand = Math.floor((n % 1e5) / 1e3), rest = n % 1e3;
  if (crore) parts.push(`${crore >= 1000 ? inrWords(crore).replace(' Rupees', '') : three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  const paise = Math.round((Math.abs(Number(value)) - n) * 100);
  return `${parts.join(' ')} Rupees${paise ? ` and ${two(paise)} Paise` : ''}`;
}

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export function computeWidget(f, values) {
  const a = values[f.a], b = values[f.b], c = values[f.c];
  switch (f.calc) {
    case 'age': {
      if (!a) return '';
      const d = new Date(a), now = new Date();
      if (Number.isNaN(+d)) return '';
      let y = now.getFullYear() - d.getFullYear();
      if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) y--;
      return y;
    }
    case 'datediff': return a && b ? days(a, b) : '';
    case 'adddays': {
      if (!a || num(b) == null) return '';
      const d = new Date(a); d.setDate(d.getDate() + num(b));
      return Number.isNaN(+d) ? '' : d.toISOString().slice(0, 10);
    }
    case 'bmi': return num(a) && num(b) ? Math.round((num(a) / (num(b) / 100) ** 2) * 10) / 10 : '';
    case 'emi': {
      const p = num(a), r = num(b) / 1200, m = num(c);
      if (!p || num(b) == null || !m) return '';
      return Math.round((r ? (p * r * (1 + r) ** m) / ((1 + r) ** m - 1) : p / m) * 100) / 100;
    }
    case 'simpleloan': return num(a) != null && num(b) != null && num(c) != null ? Math.round(num(a) * (1 + (num(b) / 100) * num(c)) * 100) / 100 : '';
    case 'area': return num(a) != null && num(b) != null ? Math.round(num(a) * num(b) * 100) / 100 : '';
    case 'percentage': return num(a) != null && num(b) ? Math.round((num(a) / num(b)) * 10000) / 100 : '';
    case 'kmToMiles': return num(a) != null ? Math.round(num(a) * 0.621371 * 100) / 100 : '';
    case 'kgToLb': return num(a) != null ? Math.round(num(a) * 2.20462 * 100) / 100 : '';
    case 'cmToFt': return num(a) != null ? Math.round((num(a) / 30.48) * 100) / 100 : '';
    case 'cToF': return num(a) != null ? Math.round((num(a) * 9 / 5 + 32) * 10) / 10 : '';
    case 'words': return a ? String(a).trim().split(/\s+/).filter(Boolean).length : 0;
    case 'words_inr': return num(a) != null ? inrWords(num(a)) : '';
    default: return '';
  }
}

// Which source fields each calculator reads, for the settings panel.
export const CALC_INPUTS = {
  age: [['a', 'Date of birth field']], datediff: [['a', 'Start date field'], ['b', 'End date field']], adddays: [['a', 'Date field'], ['b', 'Days field']],
  bmi: [['a', 'Weight (kg) field'], ['b', 'Height (cm) field']], emi: [['a', 'Loan amount field'], ['b', 'Annual interest % field'], ['c', 'Tenure (months) field']],
  simpleloan: [['a', 'Principal field'], ['b', 'Annual interest % field'], ['c', 'Years field']], area: [['a', 'Length field'], ['b', 'Width field']],
  percentage: [['a', 'Value field'], ['b', 'Total field']], kmToMiles: [['a', 'Kilometres field']], kgToLb: [['a', 'Kilograms field']], cmToFt: [['a', 'Centimetres field']],
  cToF: [['a', '°C field']], words: [['a', 'Text field']], words_inr: [['a', 'Amount field']],
};

export function datasetOptions(f) {
  return DATASETS[f.dataset]?.() || [];
}

// Server-and-client validation for widget values. Returns an error string or null.
export function validateWidget(f, v, values) {
  const kind = widgetKind(f);
  if (kind === 'validated' || kind === 'masked') {
    if (f.validator === 'mask') return maskMatches(f.mask || '', String(v)) ? null : `Use the format ${f.mask}.`;
    const ok = CHECKS[f.validator || 'none'];
    return !ok || ok(String(v)) ? null : MESSAGES[f.validator] || 'Invalid value.';
  }
  if (kind === 'confirm') return f.field && String(values[f.field] ?? '') !== String(v) ? 'The values do not match.' : null;
  if (kind === 'preset') return datasetOptions(f).includes(v) ? null : 'Choose a value from the list.';
  if (kind === 'list') {
    const rows = Array.isArray(v) ? v : [];
    if (f.minRows && rows.length < Number(f.minRows)) return `Add at least ${f.minRows} row${Number(f.minRows) === 1 ? '' : 's'}.`;
    if (f.maxRows && rows.length > Number(f.maxRows)) return `At most ${f.maxRows} rows.`;
  }
  if (kind === 'tags' && f.max && Array.isArray(v) && v.length > Number(f.max)) return `At most ${f.max} tags.`;
  if (kind === 'charboxes' && f.length && String(v).length !== Number(f.length)) return `Enter all ${f.length} characters.`;
  if (kind === 'stepper' || kind === 'slider') {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Enter a number.';
    if (f.min !== '' && f.min != null && n < Number(f.min)) return `Minimum is ${f.min}.`;
    if (f.max !== '' && f.max != null && n > Number(f.max)) return `Maximum is ${f.max}.`;
  }
  if (kind === 'range' && v && Number(v.from) > Number(v.to)) return 'The start must be below the end.';
  if (kind === 'daterange' && v?.from && v?.to && v.from > v.to) return 'The end date must be after the start date.';
  if (kind === 'textcounter' && f.maxLength && String(v).length > Number(f.maxLength)) return `Maximum ${f.maxLength} characters.`;
  if (kind === 'termsScroll' && !v) return 'You must accept to continue.';
  return null;
}

// Human-readable widget value for tables, e-mails, CSV and PDFs.
export function formatWidget(f, v) {
  const kind = widgetKind(f);
  if (Array.isArray(v)) {
    if (kind === 'list') return v.map((row) => (Array.isArray(row) ? row.join(' | ') : Object.values(row || {}).join(' | '))).join('; ');
    if (kind === 'capture') return v.map((x) => x?.name).filter(Boolean).join(', ');
    return v.join(', ');
  }
  if (v && typeof v === 'object') {
    if (kind === 'location') return v.lat != null ? `${Number(v.lat).toFixed(5)}, ${Number(v.lng).toFixed(5)}` : '';
    if (kind === 'range') return `${v.from} – ${v.to}`;
    if (kind === 'daterange') return `${v.from || ''} → ${v.to || ''}`;
    if (kind === 'currencyAmount') return `${v.currency || ''} ${v.amount ?? ''}`.trim();
    if (kind === 'ratingComment') return `${v.rating || '-'} / ${f.stars || 5}${v.comment ? ` — ${v.comment}` : ''}`;
    if (kind === 'cascade') return [v.parent, v.child].filter(Boolean).join(' › ');
    if (kind === 'idpin') return v.verified ? `${v.id}${v.name ? ` (${v.name})` : ''} ✓` : String(v.id || '');
    if (kind === 'multitext') return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join('; ');
    return JSON.stringify(v);
  }
  if (kind === 'drawing') return '[drawing]';
  if (kind === 'toggle') return v ? (f.onLabel || 'Yes') : (f.offLabel || 'No');
  if (kind === 'termsScroll') return v ? 'Accepted' : '';
  return String(v);
}
