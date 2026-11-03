// One icon set for the whole app (Phosphor, regular weight). Components ask for icons by name;
// fields, widgets, workflow steps and integrations map to names through the helpers below.
import {
  ArrowArcLeft, ArrowArcRight, ArrowLeft, ArrowSquareOut, ArrowsDownUp, ArrowsLeftRight, At, Bank, Barcode, Bell, Calculator, CalendarBlank,
  CalendarCheck, CaretDown, CaretRight, CaretUp, ChartBar, ChatCircleText, ChatsCircle, Check, CheckCircle, CheckSquare, Clock, CloudArrowUp,
  Code, Copy, CreditCard, CurrencyInr, Database, DotsSixVertical, DotsThree, Envelope, EnvelopeSimple, Eye, EyeSlash, FileArrowDown, FilePdf,
  FileText, Fingerprint, Flag, FlowArrow, Folder, FolderSimple, Funnel, GearSix, Globe, GitBranch, GridFour, Hash, Heart, HourglassMedium,
  IdentificationCard, Image, Info, Key, Lightning, Link, ListBullets, ListChecks, Lock, MagnifyingGlass, MapPin, Minus, NumberCircleOne, Palette,
  Paragraph, PaperPlaneTilt, PencilSimple, Phone, Play, Plus, PlusMinus, Pause, QrCode, Question, RadioButton, Repeat, Robot, Rows, Scales,
  ShieldCheck, SignOut, Signature, SlidersHorizontal, Sparkle, SquaresFour, Star, Stop, Storefront, Table, Tag, TextAa, TextAlignLeft,
  TextHOne, TextT, Timer, Trash, TreeStructure, User, UserCircle, Users, Warning, WebhooksLogo, X, SlackLogo, MicrosoftTeamsLogo, DiscordLogo,
  WhatsappLogo, GoogleLogo, StripeLogo, PaypalLogo, DropboxLogo, GoogleDriveLogo, NotionLogo, GithubLogo, FigmaLogo,
  MicrosoftExcelLogo, MicrosoftOutlookLogo, LinkedinLogo, FacebookLogo, InstagramLogo, YoutubeLogo, TwitterLogo, AppleLogo, AndroidLogo,
  ShoppingCart, Receipt, Ticket, Megaphone, Kanban, HeartStraight, Camera, Microphone, VideoCamera, Gauge, Smiley, Sliders,
  MapTrifold, Translate, Browsers, Archive, Tray, ListDashes, Command, House, Buildings, Student, FirstAid, Briefcase, Cube, Plugs,
} from '@phosphor-icons/react';

const MAP = {
  // App chrome
  forms: FileText, inbox: Tray, sign: Signature, apps: SquaresFour, account: UserCircle, plus: Plus, search: MagnifyingGlass, back: ArrowLeft,
  undo: ArrowArcLeft, redo: ArrowArcRight, eye: Eye, eyeOff: EyeSlash, external: ArrowSquareOut, sparkles: Sparkle, copy: Copy, trash: Trash,
  up: CaretUp, down: CaretDown, right: CaretRight, logic: GitBranch, star: Star, folder: FolderSimple, check: Check, lock: Lock, logout: SignOut,
  workflow: FlowArrow, store: Storefront, settings: GearSix, archive: Archive, tag: Tag, users: Users, user: User, close: X, more: DotsThree,
  drag: DotsSixVertical, filter: Funnel, sort: ArrowsDownUp, bell: Bell, mail: EnvelopeSimple, chart: ChartBar, table: Table, pdf: FilePdf,
  download: FileArrowDown, link: Link, code: Code, globe: Globe, key: Key, bolt: Lightning, info: Info, warning: Warning, help: Question,
  edit: PencilSimple, palette: Palette, translate: Translate, robot: Robot, plug: Plugs, home: House, task: ListChecks, success: CheckCircle,
  card: CreditCard, rupee: CurrencyInr, send: PaperPlaneTilt, play: Play, pause: Pause, stop: Stop, command: Command, browsers: Browsers,
  kanban: Kanban, widget: Cube, menu: ListDashes, shield: ShieldCheck, chat: ChatCircleText,

  // Form fields
  heading: TextHOne, paragraph: Paragraph, image: Image, divider: Minus, pagebreak: Rows, section: CaretRight, text: TextT, textarea: TextAlignLeft,
  email: At, phone: Phone, url: Link, number: Hash, fullname: User, address: MapPin, date: CalendarBlank, time: Clock, dropdown: CaretDown,
  radio: RadioButton, checkbox: CheckSquare, file: CloudArrowUp, rating: Star, scale: Gauge, slider: SlidersHorizontal, matrix: Table,
  yesno: ArrowsLeftRight, signature: Signature, appointment: CalendarCheck, calculation: Calculator, hidden: EyeSlash, terms: ShieldCheck,
  captcha: Fingerprint, fillblank: TextAa, spinner: PlusMinus, products: ShoppingCart, donation: HeartStraight, subscription: Repeat,

  // Workflow steps
  approval: CheckCircle, teamApproval: Users, approveSign: Signature, signDocument: Signature, sendPdf: FilePdf, webhook: WebhooksLogo,
  scheduledEmail: Timer, trackingEmail: EnvelopeSimple, flowReport: ChartBar, qrCode: QrCode, getData: Database, createEntry: Database,
  updateEntry: Database, paymentForm: CreditCard, requestPayment: Receipt, verifyPayment: CreditCard, paymentAssistant: Robot, ifElse: GitBranch,
  branch: TreeStructure, setStatus: Flag, forEach: Repeat, split: GitBranch, wait: HourglassMedium, end: Stop, automateTask: Robot,
  idGenerator: Barcode, updateValue: PencilSimple, customPrompt: ChatsCircle, summarize: ListBullets, calculate: Calculator, sentiment: Smiley,
  categorize: Tag, extractFromFile: FileText, sms: ChatCircleText, whatsapp: WhatsappLogo, slack: SlackLogo, push: Bell, teams: MicrosoftTeamsLogo,

  // Brands (integrations); anything else falls back to its category icon
  discord: DiscordLogo, google: GoogleLogo, sheets: Table, stripe: StripeLogo, paypal: PaypalLogo, dropbox: DropboxLogo, googleDrive: GoogleDriveLogo,
  notion: NotionLogo, github: GithubLogo, figma: FigmaLogo, excel: MicrosoftExcelLogo, outlook: MicrosoftOutlookLogo,
  linkedin: LinkedinLogo, facebook: FacebookLogo, instagram: InstagramLogo, youtube: YoutubeLogo, twitter: TwitterLogo, apple: AppleLogo,
  android: AndroidLogo, webhooks: WebhooksLogo, whatsappBusiness: WhatsappLogo, gmail: Envelope,
  // Misc used by widget categories and templates
  camera: Camera, mic: Microphone, video: VideoCamera, map: MapTrifold, bank: Bank, id: IdentificationCard, ticket: Ticket, megaphone: Megaphone,
  building: Buildings, student: Student, health: FirstAid, briefcase: Briefcase, grid: GridFour, one: NumberCircleOne, scales: Scales, heart: Heart,
  sliders: Sliders, folderFull: Folder, list: ListBullets,
};

export default function Icon({ name, size = 16, fill, weight, ...rest }) {
  const C = MAP[name] || Cube;
  // `fill="currentColor"` (used for active stars) switches to Phosphor's filled weight.
  return <C size={size} weight={weight || (fill && fill !== 'none' ? 'fill' : 'regular')} aria-hidden="true" {...rest} />;
}

export const hasIcon = (name) => !!MAP[name];

const WIDGET_CATEGORY_ICON = {
  Popular: 'star', 'Choices & selection': 'checkbox', 'Text & validation': 'text', 'Date & time': 'date', 'Media & embeds': 'image',
  'Display & layout': 'grid', Calculators: 'calculation', 'Capture & location': 'camera', 'Lists & data': 'list', Pickers: 'sliders',
  'Tracking & metadata': 'chart', 'Buttons & social': 'link',
};
// Widgets: a specific icon when the key or kind names one, otherwise the category's.
export function widgetIcon(w) {
  const k = `${w.key} ${w.kind || ''} ${w.label}`.toLowerCase();
  const rules = [
    [/aadhaar|pan\b|gstin|passport|kyc|\bid\b|verification/, 'id'], [/iban|ifsc|bank|upi|swift/, 'bank'], [/map|location|geo|address/, 'map'],
    [/camera|photo|selfie|webcam/, 'camera'], [/audio|voice|record|mic/, 'mic'], [/video|youtube|vimeo/, 'video'], [/qr|barcode/, 'qrCode'],
    [/sign/, 'signature'], [/date|calendar|day/, 'date'], [/time|clock|countdown|timer/, 'time'], [/email|mail/, 'email'], [/phone|mobile|whatsapp|sms/, 'phone'],
    [/rating|star|nps|emoji|feedback/, 'rating'], [/slider|range/, 'slider'], [/color|colour/, 'palette'], [/price|currency|rupee|amount|inr/, 'rupee'],
    [/calc|formula|age|bmi|loan|emi/, 'calculation'], [/file|upload|attach/, 'file'], [/table|grid|matrix|list/, 'table'], [/image|gallery|logo/, 'image'],
    [/link|url|button/, 'link'], [/text|heading|paragraph|quote/, 'text'], [/translate|language/, 'translate'], [/tag|chip/, 'tag'],
    [/check|consent|terms|agree/, 'checkbox'], [/dropdown|select|picker|choice/, 'dropdown'], [/unique|token|code/, 'code'], [/donat/, 'donation'],
  ];
  return rules.find(([re]) => re.test(k))?.[1] || WIDGET_CATEGORY_ICON[w.category] || 'widget';
}

const INTEGRATION_CATEGORY_ICON = {
  'Automation platforms': 'bolt', Communication: 'chat', 'Spreadsheets & data': 'table', Payments: 'card', 'CRM & sales': 'users',
  'E-mail marketing': 'mail', 'Storage & files': 'folder', 'Productivity & projects': 'kanban', 'Calendar & meetings': 'date', Support: 'help',
  Healthcare: 'health', Other: 'plug',
};
export const integrationIcon = (x) => (hasIcon(x.key) && !['sheets', 'tables', 'boards', 'sms'].includes(x.key) ? x.key : INTEGRATION_CATEGORY_ICON[x.category] || 'plug');
