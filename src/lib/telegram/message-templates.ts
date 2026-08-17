// All Telegram message text lives here — never inline in business logic.
// Supports English (LTR) and Arabic (RTL) per DESIGN.md §24.
// Use HTML parse mode. Escape user-supplied content with escHtml().

export type Lang = "ar" | "en";

export function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Bot onboarding ────────────────────────────────────────────────────────────

export function msgWelcome(lang: Lang = "en"): string {
  return lang === "ar"
    ? `👋 <b>مرحباً بك في بوت Webscale CRM</b>\n\nأرسل <code>/start &lt;رمز&gt;</code> لربط حسابك.\nاحصل على الرمز من <b>الإعدادات → الإشعارات</b>.\n\nاكتب /help لعرض جميع الأوامر.`
    : `👋 <b>Welcome to Webscale CRM Bot</b>\n\nSend <code>/start &lt;token&gt;</code> to connect your account.\nGet your token from <b>Settings → Notifications</b>.\n\nType /help to see all commands.`;
}

// ── Bot commands ──────────────────────────────────────────────────────────────

export function msgHelp(lang: Lang = "en"): string {
  return lang === "ar"
    ? `📋 <b>أوامر Webscale Bot</b>\n\n` +
      `/start &lt;رمز&gt;      ربط حسابك بـ CRM\n` +
      `/link &lt;رمز&gt;       ربط بديل بنفس الطريقة\n` +
      `/help              عرض هذه القائمة\n` +
      `/status            عرض حالة الاتصال\n` +
      `/notifications     عرض تفضيلات الإشعارات`
    : `📋 <b>Webscale Bot Commands</b>\n\n` +
      `/start &lt;token&gt;     Connect your CRM account\n` +
      `/link &lt;token&gt;      Alternative linking command\n` +
      `/help              Show this help\n` +
      `/status            View your connection status\n` +
      `/notifications     View your notification settings`;
}

export function msgStatusConnected(name: string | null, lang: Lang = "en"): string {
  const nameTag = name ? `\n<b>${escHtml(name)}</b>` : "";
  return lang === "ar"
    ? `✅ <b>متصل</b>${nameTag}\n\nحسابك مرتبط بـ Webscale CRM.\nستصلك الإشعارات هنا.`
    : `✅ <b>Connected</b>${nameTag}\n\nYour account is linked to Webscale CRM.\nNotifications will be delivered here.`;
}

export function msgStatusNotConnected(lang: Lang = "en"): string {
  return lang === "ar"
    ? `○ <b>غير متصل</b>\n\nحسابك غير مرتبط بعد.\nاحصل على رمز الربط من <b>الإعدادات → الإشعارات</b>.`
    : `○ <b>Not connected</b>\n\nYour account is not linked yet.\nGet a link token from <b>Settings → Notifications</b>.`;
}

const PREF_LABELS_EN: Record<string, string> = {
  "task.reminder": "Task reminders",
  "task.overdue": "Overdue task alerts",
  "task.assigned": "Task assignments",
  "session.reminder": "Session reminders",
  "session.nearCapacity": "Session capacity alerts",
  "payment.pending": "Payment alerts",
  "lead.assigned": "Lead assignments",
  "daily.digest": "Daily digest",
  "course.update": "Course updates",
};

const PREF_LABELS_AR: Record<string, string> = {
  "task.reminder": "تذكيرات المهام",
  "task.overdue": "تنبيهات المهام المتأخرة",
  "task.assigned": "تعيينات المهام",
  "session.reminder": "تذكيرات الجلسات",
  "session.nearCapacity": "تنبيهات سعة الجلسات",
  "payment.pending": "تنبيهات المدفوعات",
  "lead.assigned": "تعيينات العملاء",
  "daily.digest": "الملخص اليومي",
  "course.update": "تحديثات الدورات",
};

export function msgNotificationPrefs(
  prefs: Record<string, boolean>,
  lang: Lang = "en"
): string {
  const labels = lang === "ar" ? PREF_LABELS_AR : PREF_LABELS_EN;
  const lines = Object.entries(labels).map(([type, label]) => {
    // Default true when no preference row exists (matches ensureDefaultPreferences behaviour)
    const enabled = prefs[type] !== false;
    return `${enabled ? "✅" : "❌"} ${label}`;
  });
  return lang === "ar"
    ? `🔔 <b>تفضيلات الإشعارات</b>\n\n${lines.join("\n")}\n\n<i>لتغيير التفضيلات:\nالإعدادات → الإشعارات</i>`
    : `🔔 <b>Notification Settings</b>\n\n${lines.join("\n")}\n\n<i>To change: Settings → Notifications</i>`;
}

// ── Account linking ───────────────────────────────────────────────────────────

export function msgLinkSuccess(lang: Lang = "en"): string {
  return lang === "ar"
    ? `✅ <b>تم ربط الحساب بنجاح!</b>\n\nستصلك الإشعارات هنا من الآن فصاعداً.`
    : `✅ <b>Account linked successfully!</b>\n\nYou will now receive notifications here.`;
}

export function msgLinkExpired(lang: Lang = "en"): string {
  return lang === "ar"
    ? `❌ انتهت صلاحية هذا الرمز.\nيرجى إنشاء رمز جديد من <b>الإعدادات → الإشعارات</b>.`
    : `❌ This token has expired.\nGenerate a new one from <b>Settings → Notifications</b>.`;
}

export function msgLinkUsed(lang: Lang = "en"): string {
  return lang === "ar"
    ? `❌ تم استخدام هذا الرمز مسبقاً.\nيرجى إنشاء رمز جديد.`
    : `❌ This token has already been used.\nPlease generate a new one.`;
}

export function msgLinkInvalid(lang: Lang = "en"): string {
  return lang === "ar"
    ? `❌ رمز غير صالح. يرجى التحقق والمحاولة مرة أخرى.`
    : `❌ Invalid token. Please check and try again.`;
}

export function msgLinkAlreadyConnected(lang: Lang = "en"): string {
  return lang === "ar"
    ? `ℹ️ حسابك مرتبط بالفعل. استخدم <b>الإعدادات → الإشعارات</b> لإدارة التفضيلات.`
    : `ℹ️ Your account is already connected. Use <b>Settings → Notifications</b> to manage preferences.`;
}

// ── Task notifications ────────────────────────────────────────────────────────

export function msgTaskAssigned(
  title: string,
  due: string | undefined,
  lang: Lang = "en"
): string {
  const dueLine = due
    ? lang === "ar"
      ? `\n⏰ الموعد النهائي: ${due}`
      : `\n⏰ Due: ${due}`
    : "";
  return lang === "ar"
    ? `📋 <b>تم تكليفك بمهمة جديدة</b>\n\n${escHtml(title)}${dueLine}`
    : `📋 <b>New task assigned to you</b>\n\n${escHtml(title)}${dueLine}`;
}

export function msgTaskReminder(
  title: string,
  due: string,
  lang: Lang = "en"
): string {
  return lang === "ar"
    ? `⏰ <b>تذكير بمهمة</b>\n\n${escHtml(title)}\nتستحق خلال 30 دقيقة: ${due}`
    : `⏰ <b>Task reminder</b>\n\n${escHtml(title)}\nDue in 30 minutes: ${due}`;
}

export function msgTaskOverdue(title: string, lang: Lang = "en"): string {
  return lang === "ar"
    ? `🚨 <b>مهمة متأخرة</b>\n\n${escHtml(title)}\nتجاوزت هذه المهمة موعدها النهائي.`
    : `🚨 <b>Overdue task</b>\n\n${escHtml(title)}\nThis task is past its due date.`;
}

// ── Session notifications ─────────────────────────────────────────────────────

export function msgSessionReminder(
  courseName: string,
  time: string,
  location: string,
  lang: Lang = "en"
): string {
  return lang === "ar"
    ? `📅 <b>تذكير بجلسة</b>\n\n${escHtml(courseName)}\n🕐 تبدأ خلال ساعة: ${time}\n📍 ${escHtml(location)}`
    : `📅 <b>Session reminder</b>\n\n${escHtml(courseName)}\n🕐 Starts in 1 hour: ${time}\n📍 ${escHtml(location)}`;
}

export function msgSessionNearCapacity(
  sessionName: string,
  pct: number,
  filled: number,
  total: number,
  lang: Lang = "en"
): string {
  return lang === "ar"
    ? `📊 <b>الجلسة تقترب من الاكتمال</b>\n\n${escHtml(sessionName)}\nالسعة: ${filled}/${total} (${pct}%)`
    : `📊 <b>Session near capacity</b>\n\n${escHtml(sessionName)}\n${filled}/${total} seats filled (${pct}%)`;
}

// ── Payment notifications ─────────────────────────────────────────────────────

export function msgPaymentPending(
  amount: string,
  currency: string,
  lang: Lang = "en"
): string {
  return lang === "ar"
    ? `💰 <b>دفعة تحتاج إلى تأكيد</b>\n\nالمبلغ: ${escHtml(amount)} ${escHtml(currency)}`
    : `💰 <b>Payment needs confirmation</b>\n\nAmount: ${escHtml(amount)} ${escHtml(currency)}`;
}

// ── Lead notifications ────────────────────────────────────────────────────────

export function msgLeadAssigned(name: string, lang: Lang = "en"): string {
  return lang === "ar"
    ? `👤 <b>تم تعيين عميل محتمل جديد لك</b>\n\n${escHtml(name)}`
    : `👤 <b>New lead assigned to you</b>\n\n${escHtml(name)}`;
}

// ── C5 notification types ─────────────────────────────────────────────────────

// C5a — Task reminder (30 min before due)
export function msgC5aTaskReminder(
  taskTitle: string,
  deepLink: string,
  lang: Lang = "en"
): string {
  const link = deepLink ? `\n<a href="${deepLink}">Open Tasks</a>` : "";
  return lang === "ar"
    ? `🔔 <b>تذكير بمهمة</b>\n\nمهمتك مستحقة خلال 30 دقيقة.\n${escHtml(taskTitle)}${link}`
    : `🔔 <b>Reminder</b>\n\nYour task is due in 30 minutes.\n${escHtml(taskTitle)}${link}`;
}

// C5b — Overdue tasks count (daily at 09:00)
export function msgC5bOverdueTasks(
  count: number,
  deepLink: string,
  lang: Lang = "en"
): string {
  const link = deepLink ? `\n<a href="${deepLink}">Open CRM</a>` : "";
  return lang === "ar"
    ? `⚠️ <b>مهام متأخرة</b>\n\nلديك ${count} مهمة${count > 1 ? "" : ""} متأخرة.${link}`
    : `⚠️ <b>Overdue Tasks</b>\n\nYou have ${count} overdue task${count !== 1 ? "s" : ""}.${link}`;
}

// C5c — Session reminder (1 hour before start)
export function msgC5cSessionReminder(
  courseName: string,
  dateRange: string,
  location: string,
  registrationCount: number,
  deepLink: string,
  lang: Lang = "en"
): string {
  const link = deepLink ? `\n<a href="${deepLink}">View Session</a>` : "";
  return lang === "ar"
    ? `📚 <b>تذكير بجلسة</b>\n\n${escHtml(courseName)}\n${escHtml(dateRange)}\n📍 ${escHtml(location)}\n👥 ${registrationCount} طالب مسجل${link}`
    : `📚 <b>Session Reminder</b>\n\n${escHtml(courseName)}\n${escHtml(dateRange)}\n📍 ${escHtml(location)}\n👥 ${registrationCount} registered student${registrationCount !== 1 ? "s" : ""}${link}`;
}

// C5d — Payment pending reminder (>24h still pending)
export function msgC5dPaymentPending(
  studentName: string,
  amount: string,
  currency: string,
  deepLink: string,
  lang: Lang = "en"
): string {
  const link = deepLink ? `\n<a href="${deepLink}">View in CRM</a>` : "";
  return lang === "ar"
    ? `💳 <b>تذكير بدفعة معلقة</b>\n\nدفعة ${escHtml(studentName)} لا تزال معلقة.\nالمبلغ: ${escHtml(amount)} ${escHtml(currency)}${link}`
    : `💳 <b>Payment Reminder</b>\n\n${escHtml(studentName)}'s payment is still pending.\nAmount: ${escHtml(amount)} ${escHtml(currency)}${link}`;
}

// C5e — New lead assigned to you
export function msgC5eLeadAssigned(
  leadName: string,
  courseName: string | null,
  deepLink: string,
  lang: Lang = "en"
): string {
  const courseLinear = courseName ? `\n${escHtml(courseName)}` : "";
  const link = deepLink ? `\n<a href="${deepLink}">Open Lead</a>` : "";
  return lang === "ar"
    ? `👤 <b>عميل محتمل جديد</b>\n\nتم تعيين ${escHtml(leadName)} لك.${courseLinear}${link}`
    : `👤 <b>New Lead</b>\n\n${escHtml(leadName)} has been assigned to you.${courseLinear}${link}`;
}

// C5f — Daily digest
export interface DailyDigestStats {
  newLeads: number;
  registrations: number;
  revenue: string;
  pendingPayments: number;
  upcomingSessions: number;
  overdueTasks: number;
}

export function msgC5fDailyDigest(
  date: string,
  stats: DailyDigestStats,
  lang: Lang = "en"
): string {
  if (lang === "ar") {
    return (
      `📊 <b>ملخص اليوم — ${escHtml(date)}</b>\n\n` +
      `عملاء جدد: ${stats.newLeads}\n` +
      `تسجيلات: ${stats.registrations}\n` +
      `الإيرادات: ${escHtml(stats.revenue)}\n` +
      `مدفوعات معلقة: ${stats.pendingPayments}\n` +
      `جلسات قادمة: ${stats.upcomingSessions}\n` +
      `مهام متأخرة: ${stats.overdueTasks}`
    );
  }
  return (
    `📊 <b>Today's Summary — ${escHtml(date)}</b>\n\n` +
    `New Leads: ${stats.newLeads}\n` +
    `Registrations: ${stats.registrations}\n` +
    `Revenue: ${escHtml(stats.revenue)}\n` +
    `Pending Payments: ${stats.pendingPayments}\n` +
    `Upcoming Sessions: ${stats.upcomingSessions}\n` +
    `Overdue Tasks: ${stats.overdueTasks}`
  );
}
