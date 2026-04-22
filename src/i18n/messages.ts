export type Locale = "sq" | "en";

type Dict = Record<string, string>;

const sq: Dict = {
  // Brand
  "brand.name": "Muslimi Digital",
  "brand.tagline": "Platforma SaaS që menaxhon, automatizon dhe rrit biznesin tënd.",

  // Common
  "common.signin": "Hyr",
  "common.signup": "Regjistrohu",
  "common.signout": "Dil",
  "common.email": "Email",
  "common.password": "Fjalëkalimi",
  "common.fullname": "Emri i plotë",
  "common.workspace": "Hapësira e punës",
  "common.continue": "Vazhdo",
  "common.cancel": "Anulo",
  "common.save": "Ruaj",
  "common.delete": "Fshi",
  "common.edit": "Modifiko",
  "common.create": "Krijo",
  "common.search": "Kërko...",
  "common.loading": "Duke u ngarkuar...",
  "common.empty": "Asnjë rezultat",
  "common.back": "Kthehu",
  "common.send": "Dërgo",

  // Landing
  "landing.cta.start": "Fillo falas",
  "landing.cta.demo": "Shiko demon",
  "landing.hero.title": "Platforma All-in-One për bizneset moderne",
  "landing.hero.subtitle": "CRM, Unified Inbox, Marketing Automation, Helpdesk dhe AI — të gjitha në një vend.",
  "landing.feature.crm.title": "CRM i avancuar",
  "landing.feature.crm.desc": "Menaxho leads, pipeline-e dhe deals me kanban të fuqishëm.",
  "landing.feature.inbox.title": "Unified Inbox",
  "landing.feature.inbox.desc": "WhatsApp, Telegram, Email, SMS — të gjitha në një inbox.",
  "landing.feature.automation.title": "Automation me AI",
  "landing.feature.automation.desc": "Krijo workflow-e që punojnë për ty 24/7.",
  "landing.feature.helpdesk.title": "Helpdesk + SLA",
  "landing.feature.helpdesk.desc": "Sistem tiketash profesional me ndjekje SLA.",
  "landing.feature.multi.title": "Multi-tenant",
  "landing.feature.multi.desc": "Disa biznese, disa ekipe, një platformë.",
  "landing.feature.analytics.title": "Analytics në kohë reale",
  "landing.feature.analytics.desc": "Vendime të bazuara në të dhëna, jo në hamendje.",

  // Auth
  "auth.signin.title": "Mirë se vjen përsëri",
  "auth.signin.subtitle": "Hyr për të vazhduar në hapësirën tënde",
  "auth.signup.title": "Krijo një llogari",
  "auth.signup.subtitle": "Fillo falas — pa kartë krediti",
  "auth.haveAccount": "Ke llogari?",
  "auth.noAccount": "Nuk ke llogari?",
  "auth.error.invalid": "Email ose fjalëkalim i pasaktë",
  "auth.error.exists": "Kjo email është e regjistruar tashmë",

  // Sidebar
  "nav.dashboard": "Paneli",
  "nav.inbox": "Inbox",
  "nav.crm": "CRM",
  "nav.contacts": "Kontaktet",
  "nav.pipeline": "Pipeline",
  "nav.campaigns": "Fushatat",
  "nav.helpdesk": "Helpdesk",
  "nav.automation": "Automation",
  "nav.analytics": "Analitika",
  "nav.settings": "Cilësimet",

  // Dashboard
  "dash.title": "Paneli kryesor",
  "dash.welcome": "Mirë se erdhe",
  "dash.kpi.contacts": "Kontakte",
  "dash.kpi.deals": "Deals aktivë",
  "dash.kpi.conversations": "Biseda të hapura",
  "dash.kpi.tickets": "Tikete të hapur",

  // Inbox
  "inbox.title": "Unified Inbox",
  "inbox.empty.title": "Asnjë bisedë ende",
  "inbox.empty.desc": "Lidh kanalin tënd të parë për të filluar.",
  "inbox.placeholder": "Shkruaj një mesazh...",
  "inbox.select": "Zgjidh një bisedë për të parë mesazhet",

  // CRM
  "crm.contacts.title": "Kontaktet",
  "crm.contacts.new": "Kontakt i ri",
  "crm.contacts.empty": "Asnjë kontakt ende. Krijo të parin!",
  "crm.pipeline.title": "Pipeline-i i shitjeve",
  "crm.pipeline.newDeal": "Deal i ri",

  // Empty states
  "empty.comingSoon": "Së shpejti",
  "empty.module": "Ky modul është gati në fazën tjetër.",
};

const en: Dict = {
  "brand.name": "Muslimi Digital",
  "brand.tagline": "The SaaS platform that runs, automates and grows your business.",

  "common.signin": "Sign in",
  "common.signup": "Sign up",
  "common.signout": "Sign out",
  "common.email": "Email",
  "common.password": "Password",
  "common.fullname": "Full name",
  "common.workspace": "Workspace",
  "common.continue": "Continue",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.create": "Create",
  "common.search": "Search...",
  "common.loading": "Loading...",
  "common.empty": "No results",
  "common.back": "Back",
  "common.send": "Send",

  "landing.cta.start": "Start free",
  "landing.cta.demo": "Watch demo",
  "landing.hero.title": "The all-in-one platform for modern businesses",
  "landing.hero.subtitle": "CRM, Unified Inbox, Marketing Automation, Helpdesk and AI — in one place.",
  "landing.feature.crm.title": "Advanced CRM",
  "landing.feature.crm.desc": "Manage leads, pipelines and deals with a powerful kanban.",
  "landing.feature.inbox.title": "Unified Inbox",
  "landing.feature.inbox.desc": "WhatsApp, Telegram, Email, SMS — all in one inbox.",
  "landing.feature.automation.title": "AI Automation",
  "landing.feature.automation.desc": "Build workflows that work for you 24/7.",
  "landing.feature.helpdesk.title": "Helpdesk + SLA",
  "landing.feature.helpdesk.desc": "Professional ticketing with SLA tracking.",
  "landing.feature.multi.title": "Multi-tenant",
  "landing.feature.multi.desc": "Multiple businesses, multiple teams, one platform.",
  "landing.feature.analytics.title": "Real-time analytics",
  "landing.feature.analytics.desc": "Data-driven decisions, not guesses.",

  "auth.signin.title": "Welcome back",
  "auth.signin.subtitle": "Sign in to continue to your workspace",
  "auth.signup.title": "Create an account",
  "auth.signup.subtitle": "Start free — no credit card required",
  "auth.haveAccount": "Have an account?",
  "auth.noAccount": "Don't have an account?",
  "auth.error.invalid": "Invalid email or password",
  "auth.error.exists": "This email is already registered",

  "nav.dashboard": "Dashboard",
  "nav.inbox": "Inbox",
  "nav.crm": "CRM",
  "nav.contacts": "Contacts",
  "nav.pipeline": "Pipeline",
  "nav.campaigns": "Campaigns",
  "nav.helpdesk": "Helpdesk",
  "nav.automation": "Automation",
  "nav.analytics": "Analytics",
  "nav.settings": "Settings",

  "dash.title": "Dashboard",
  "dash.welcome": "Welcome",
  "dash.kpi.contacts": "Contacts",
  "dash.kpi.deals": "Active deals",
  "dash.kpi.conversations": "Open conversations",
  "dash.kpi.tickets": "Open tickets",

  "inbox.title": "Unified Inbox",
  "inbox.empty.title": "No conversations yet",
  "inbox.empty.desc": "Connect your first channel to get started.",
  "inbox.placeholder": "Type a message...",
  "inbox.select": "Select a conversation to view messages",

  "crm.contacts.title": "Contacts",
  "crm.contacts.new": "New contact",
  "crm.contacts.empty": "No contacts yet. Create your first one!",
  "crm.pipeline.title": "Sales pipeline",
  "crm.pipeline.newDeal": "New deal",

  "empty.comingSoon": "Coming soon",
  "empty.module": "This module ships in the next phase.",
};

export const messages: Record<Locale, Dict> = { sq, en };