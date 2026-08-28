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

function link(url: string, label: string): string {
  return url ? `<a href="${url}">${label}</a>` : "";
}

// ── Bot onboarding ────────────────────────────────────────────────────────────

export function msgWelcome(lang: Lang = "en"): string {
  return lang === "ar"
    ? `👋 <b>مرحباً بك في بوت Webscale CRM</b>\n\nأرسل <code>/start &lt;رمز&gt;</code> لربط حسابك.\nاحصل على الرمز من <b>الإعدادات → الإشعارات</b>.\n\nاكتب /help لعرض جميع الأوامر.`
    : `👋 <b>Welcome to Webscale CRM Bot</b>\n\nSend <code>/start &lt;token&gt;</code> to connect your account.\nGet your token from <b>Settings → Notifications</b>.\n\nType /help to see all commands.`;
}

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
  "task.assigned": "Task assignments",
  "task.reminder": "Task reminders",
  "task.overdue": "Overdue task alerts",
  "courseRun.nearCapacity": "Course Run capacity alerts",
  "courseRun.capacityReached": "Course Run full alerts",
  "courseRun.reminder": "Course Run reminders",
  "courseRun.today": "Today's Course Runs",
  "courseRun.rescheduled": "Course Run rescheduled",
  "courseRun.locationChanged": "Course Run location changed",
  "courseRun.cancelled": "Course Run cancelled",
  "payment.pending": "Payment pending alerts",
  "payment.recorded": "Payment recorded",
  "payment.confirmed": "Payment confirmed",
  "payment.rejected": "Payment rejected",
  "payment.balanceCleared": "Balance cleared",
  "lead.assigned": "Lead assignments",
  "lead.reassigned": "Lead reassignments",
  "lead.unassignedAlert": "Unassigned leads alert",
  "team.overdueAlert": "Team overdue alert",
  "registration.confirmed": "Registration confirmed",
  "registration.cancelled": "Registration cancelled",
  "registration.runChanged": "Course Run changed",
  "balance.outstanding": "Outstanding balance summary",
  "expense.thresholdExceeded": "High expense alert",
  "attendance.noShow": "No show alerts",
  "daily.digest": "Daily digest",
  "commission.earned": "Commission earned",
  "commission.adjusted": "Commission adjusted",
  "commission.payoutProcessed": "Commission payout",
  "refund.requested": "Refund request notifications",
  "liveSession.reminder": "Live session reminders",
  "liveSession.started": "Live session started alerts",
  "liveSession.studentJoin": "Live class started alerts",
  "liveSession.recordingReady": "Recording ready notifications",
  "liveSession.studentReminder": "Live class reminders for students",
  "liveSession.studentRecordingReady": "Recording ready notifications for students",
};

const PREF_LABELS_AR: Record<string, string> = {
  "liveSession.reminder": "تذكيرات الفصول المباشرة",
  "liveSession.started": "إشعار بدء الجلسة المباشرة",
  "liveSession.studentJoin": "إشعار بدء فصلك المباشر",
  "liveSession.recordingReady": "إشعار جاهزية التسجيل",
  "liveSession.studentReminder": "تذكيرات الفصل المباشر للطلاب",
  "liveSession.studentRecordingReady": "إشعار جاهزية التسجيل للطلاب",
  "task.assigned": "تعيينات المهام",
  "task.reminder": "تذكيرات المهام",
  "task.overdue": "تنبيهات المهام المتأخرة",
  "courseRun.nearCapacity": "تنبيهات اقتراب اكتمال الدورات",
  "courseRun.capacityReached": "تنبيهات اكتمال الدورات",
  "courseRun.reminder": "تذكيرات الدورات الجارية",
  "courseRun.today": "دوراتك اليوم",
  "courseRun.rescheduled": "إعادة جدولة الدورة",
  "courseRun.locationChanged": "تغيير موقع الدورة",
  "courseRun.cancelled": "إلغاء الدورة",
  "payment.pending": "تنبيهات المدفوعات المعلقة",
  "payment.recorded": "تسجيل الدفعة",
  "payment.confirmed": "تأكيد الدفعة",
  "payment.rejected": "رفض الدفعة",
  "payment.balanceCleared": "تسوية الرصيد",
  "lead.assigned": "تعيينات العملاء المحتملين",
  "lead.reassigned": "إعادة تعيين العملاء",
  "lead.unassignedAlert": "تنبيه عملاء بدون مسؤول",
  "team.overdueAlert": "تنبيه متابعات الفريق المتأخرة",
  "registration.confirmed": "تسجيل مؤكد",
  "registration.cancelled": "إلغاء تسجيل",
  "registration.runChanged": "تغيير الدورة الجارية",
  "balance.outstanding": "ملخص الأرصدة المستحقة",
  "expense.thresholdExceeded": "تنبيه مصروف مرتفع",
  "attendance.noShow": "تنبيهات الغياب",
  "daily.digest": "الملخص اليومي",
  "commission.earned": "إشعار احتساب العمولة",
  "commission.adjusted": "إشعار تعديل العمولة",
  "commission.payoutProcessed": "إشعار تسديد المستحقات",
  "refund.requested": "طلبات الاسترجاع",
};

export function msgNotificationPrefs(
  prefs: Record<string, boolean>,
  lang: Lang = "en"
): string {
  const labels = lang === "ar" ? PREF_LABELS_AR : PREF_LABELS_EN;
  const lines = Object.entries(labels).map(([type, label]) => {
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

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function msgTaskAssigned(
  title: string,
  due: string | undefined,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const dueLine = due
    ? lang === "ar" ? `\n⏰ الموعد النهائي: ${due}` : `\n⏰ Due: ${due}`
    : "";
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح المهمة" : "Open Task")}` : "";
  return lang === "ar"
    ? `📋 <b>تم تكليفك بمهمة جديدة</b>\n\n${escHtml(title)}${dueLine}${linkLine}`
    : `📋 <b>New task assigned to you</b>\n\n${escHtml(title)}${dueLine}${linkLine}`;
}

// C5a — Task reminder (30 min before due)
export function msgC5aTaskReminder(
  taskTitle: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح المهام" : "Open Tasks")}` : "";
  return lang === "ar"
    ? `🔔 <b>تذكير بمهمة</b>\n\nمهمتك مستحقة خلال 30 دقيقة.\n${escHtml(taskTitle)}${linkLine}`
    : `🔔 <b>Reminder</b>\n\nYour task is due in 30 minutes.\n${escHtml(taskTitle)}${linkLine}`;
}

// C5b — Overdue tasks count (daily)
export function msgC5bOverdueTasks(
  count: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح CRM" : "Open CRM")}` : "";
  return lang === "ar"
    ? `⚠️ <b>مهام متأخرة</b>\n\nلديك ${count} مهمة متأخرة.${linkLine}`
    : `⚠️ <b>Overdue Tasks</b>\n\nYou have ${count} overdue task${count !== 1 ? "s" : ""}.${linkLine}`;
}

// ── Course Runs (الدورات الجارية) ────────────────────────────────────────────

// C5c — Course Run reminder (1 hour before start)
export function msgCourseRunReminder(
  courseName: string,
  dateRange: string,
  location: string,
  registrationCount: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدورة" : "View Course Run")}` : "";
  return lang === "ar"
    ? `📚 <b>تذكير بالدورة الجارية</b>\n\n${escHtml(courseName)}\n${escHtml(dateRange)}\n📍 ${escHtml(location)}\n👥 ${registrationCount} طالب مسجل${linkLine}`
    : `📚 <b>Course Run Reminder</b>\n\n${escHtml(courseName)}\n${escHtml(dateRange)}\n📍 ${escHtml(location)}\n👥 ${registrationCount} registered student${registrationCount !== 1 ? "s" : ""}${linkLine}`;
}

// Course Run today — grouped per trainer
export function msgCourseRunToday(
  count: number,
  sessions: Array<{ courseName: string; location: string; registered: number }>,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الجدول" : "Open Schedule")}` : "";
  if (count === 1 && sessions[0]) {
    const s = sessions[0];
    return lang === "ar"
      ? `🔔 <b>لديك دورة جارية اليوم</b>\n\n${escHtml(s.courseName)}\n📍 ${escHtml(s.location)}\n👥 ${s.registered} طالب${linkLine}`
      : `🔔 <b>Course Run Today</b>\n\n${escHtml(s.courseName)}\n📍 ${escHtml(s.location)}\n👥 ${s.registered} student${s.registered !== 1 ? "s" : ""}${linkLine}`;
  }
  const lines = sessions
    .slice(0, 5)
    .map((s) => `• ${escHtml(s.courseName)} — ${s.registered} ${lang === "ar" ? "طالب" : "students"}`)
    .join("\n");
  return lang === "ar"
    ? `🔔 <b>لديك ${count} دورات جارية اليوم</b>\n\n${lines}${linkLine}`
    : `🔔 <b>You have ${count} Course Runs today</b>\n\n${lines}${linkLine}`;
}

// Course Run near capacity
export function msgCourseRunNearCapacity(
  courseName: string,
  filled: number,
  capacity: number,
  pct: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const remaining = capacity - filled;
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدورة" : "Open Course Run")}` : "";
  return lang === "ar"
    ? `📊 <b>الدورة تقترب من الاكتمال</b>\n\n${escHtml(courseName)}\n\n${filled} / ${capacity} مقعد مشغول — ${pct}%\n\n${remaining} مقعد متبقٍ${linkLine}`
    : `📊 <b>Course Run Near Capacity</b>\n\n${escHtml(courseName)}\n\n${filled} / ${capacity} seats filled\n${pct}%\n\n${remaining} seat${remaining !== 1 ? "s" : ""} remaining${linkLine}`;
}

// Course Run full (capacity reached)
export function msgCourseRunCapacityReached(
  courseName: string,
  capacity: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدورة" : "Open Course Run")}` : "";
  return lang === "ar"
    ? `🔴 <b>الدورة اكتملت</b>\n\n${escHtml(courseName)}\n\n${capacity} / ${capacity} مقعد مشغول.\n\nلا توجد مقاعد متاحة.${linkLine}`
    : `🔴 <b>Course Run Full</b>\n\n${escHtml(courseName)}\n\n${capacity} / ${capacity} seats filled.\n\nNo seats remaining.${linkLine}`;
}

// Course Run rescheduled (CRITICAL)
export function msgCourseRunRescheduled(
  courseName: string,
  oldDate: string,
  newDate: string,
  affectedCount: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدورة" : "Open Course Run")}` : "";
  return lang === "ar"
    ? `🚨 <b>تم إعادة جدولة الدورة</b>\n\n${escHtml(courseName)}\n\nالموعد القديم: ${escHtml(oldDate)}\nالموعد الجديد: ${escHtml(newDate)}\n\nالتسجيلات المتأثرة: ${affectedCount}${linkLine}`
    : `🚨 <b>Course Run Rescheduled</b>\n\n${escHtml(courseName)}\n\nOld: ${escHtml(oldDate)}\nNew: ${escHtml(newDate)}\n\nAffected registrations: ${affectedCount}${linkLine}`;
}

// Course Run location changed
export function msgCourseRunLocationChanged(
  courseName: string,
  date: string,
  oldLocation: string,
  newLocation: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدورة" : "Open Course Run")}` : "";
  return lang === "ar"
    ? `📍 <b>تغيّر موقع الدورة</b>\n\n${escHtml(courseName)}\n${escHtml(date)}\n\nالموقع السابق: ${escHtml(oldLocation)}\nالموقع الجديد: ${escHtml(newLocation)}${linkLine}`
    : `📍 <b>Course Location Changed</b>\n\n${escHtml(courseName)}\n${escHtml(date)}\n\nPrevious: ${escHtml(oldLocation)}\nNew: ${escHtml(newLocation)}${linkLine}`;
}

// Course Run cancelled (CRITICAL)
export function msgCourseRunCancelled(
  courseName: string,
  date: string,
  affectedCount: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدورة" : "Open Course Run")}` : "";
  return lang === "ar"
    ? `🚨 <b>تم إلغاء الدورة</b>\n\n${escHtml(courseName)}\n${escHtml(date)}\n\nالتسجيلات المتأثرة: ${affectedCount}\n\nيرجى التواصل مع الطلاب المتأثرين.${linkLine}`
    : `🚨 <b>Course Run Cancelled</b>\n\n${escHtml(courseName)}\n${escHtml(date)}\n\nAffected registrations: ${affectedCount}\n\nPlease contact affected customers.${linkLine}`;
}

// ── Payments ──────────────────────────────────────────────────────────────────

// C5d — Payment pending (>24h still pending)
export function msgC5dPaymentPending(
  studentName: string,
  amount: string,
  currency: string,
  method: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدفعة" : "Open Payment")}` : "";
  return lang === "ar"
    ? `💳 <b>تذكير بدفعة معلقة</b>\n\nدفعة ${escHtml(studentName)} لا تزال معلقة.\nالمبلغ: ${escHtml(amount)} ${escHtml(currency)}\nالطريقة: ${escHtml(method)}${linkLine}`
    : `💳 <b>Payment Awaiting Confirmation</b>\n\n${escHtml(studentName)}\n\nAmount: ${escHtml(amount)} ${escHtml(currency)}\nMethod: ${escHtml(method)}\n\nThis payment is still awaiting confirmation.${linkLine}`;
}

// Payment recorded — to Sales owner and Manager
export function msgPaymentRecorded(
  studentName: string,
  amount: string,
  currency: string,
  courseName: string,
  sessionDate: string,
  salesRepName: string,
  method: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدفعة" : "Open Payment")}` : "";
  return lang === "ar"
    ? `💳 <b>دفعة جديدة</b>\n\nتم تسجيل دفعة جديدة:\n\nالعميل: ${escHtml(studentName)}\nالقيمة: ${escHtml(amount)} ${escHtml(currency)}\nالدورة: ${escHtml(courseName)}\nالدورات الجارية: ${escHtml(sessionDate)}\nمسؤول المبيعات: ${escHtml(salesRepName)}\nطريقة الدفع: ${escHtml(method)}${linkLine}`
    : `💳 <b>New Payment</b>\n\nA new payment has been recorded.\n\nCustomer: ${escHtml(studentName)}\nAmount: ${escHtml(amount)} ${escHtml(currency)}\nCourse: ${escHtml(courseName)}\nCourse Run: ${escHtml(sessionDate)}\nSales Representative: ${escHtml(salesRepName)}\nMethod: ${escHtml(method)}${linkLine}`;
}

// Payment confirmed
export function msgPaymentConfirmed(
  studentName: string,
  amount: string,
  currency: string,
  method: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدفعة" : "Open Payment")}` : "";
  return lang === "ar"
    ? `✅ <b>تم تأكيد الدفعة</b>\n\n${escHtml(studentName)}\n\n${escHtml(amount)} ${escHtml(currency)}\nالطريقة: ${escHtml(method)}${linkLine}`
    : `✅ <b>Payment Confirmed</b>\n\n${escHtml(studentName)}\n\n${escHtml(amount)} ${escHtml(currency)}\nMethod: ${escHtml(method)}${linkLine}`;
}

// Payment rejected
export function msgPaymentRejected(
  studentName: string,
  amount: string,
  currency: string,
  reason: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الدفعة" : "Open Payment")}` : "";
  return lang === "ar"
    ? `❌ <b>تم رفض الدفعة</b>\n\n${escHtml(studentName)}\n\n${escHtml(amount)} ${escHtml(currency)}\n\nالسبب: ${escHtml(reason)}${linkLine}`
    : `❌ <b>Payment Rejected</b>\n\n${escHtml(studentName)}\n\n${escHtml(amount)} ${escHtml(currency)}\n\nReason: ${escHtml(reason)}${linkLine}`;
}

// Balance cleared (totalPaid >= agreedPrice)
export function msgPaymentBalanceCleared(
  studentName: string,
  courseName: string,
  totalPaid: string,
  currency: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح التسجيل" : "Open Registration")}` : "";
  return lang === "ar"
    ? `✅ <b>تمت تسوية الرصيد</b>\n\n${escHtml(studentName)}\n${escHtml(courseName)}\n\nإجمالي المدفوع: ${escHtml(totalPaid)} ${escHtml(currency)}\nالرصيد: 0 ${escHtml(currency)}${linkLine}`
    : `✅ <b>Payment Completed</b>\n\n${escHtml(studentName)}\n${escHtml(courseName)}\n\nFull amount paid: ${escHtml(totalPaid)} ${escHtml(currency)}\nBalance: 0 ${escHtml(currency)}${linkLine}`;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

// C5e — New lead assigned to you (single)
export function msgC5eLeadAssigned(
  leadName: string,
  courseName: string | null,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const courseLinear = courseName ? `\n${escHtml(courseName)}` : "";
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح العميل" : "Open Lead")}` : "";
  return lang === "ar"
    ? `👤 <b>عميل محتمل جديد</b>\n\nتم تعيين ${escHtml(leadName)} لك.${courseLinear}${linkLine}`
    : `👤 <b>New Lead</b>\n\n${escHtml(leadName)} has been assigned to you.${courseLinear}${linkLine}`;
}

// C5e-bulk — Multiple leads assigned
export function msgC5eLeadAssignedBulk(
  count: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح عملائي" : "Open My Leads")}` : "";
  return lang === "ar"
    ? `📥 <b>عملاء محتملون جدد</b>\n\nتم تعيين <b>${count}</b> عملاء محتملين جدد لك.${linkLine}`
    : `📥 <b>New Leads Assigned</b>\n\nYou received <b>${count}</b> new lead${count !== 1 ? "s" : ""} to follow up.${linkLine}`;
}

// Lead reassigned to you
export function msgLeadReassigned(
  leadName: string,
  fromRepName: string,
  courseName: string | null,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const courseLinear = courseName ? `\n${escHtml(courseName)}` : "";
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح العميل" : "Open Lead")}` : "";
  return lang === "ar"
    ? `🔄 <b>تم تحويل عميل محتمل إليك</b>\n\n${escHtml(leadName)}\n\nتم نقل هذا العميل إليك من ${escHtml(fromRepName)}.${courseLinear}${linkLine}`
    : `🔄 <b>Lead Assigned to You</b>\n\n${escHtml(leadName)}\n\nThis lead was transferred to you from ${escHtml(fromRepName)}.${courseLinear}${linkLine}`;
}

// Unassigned leads alert — for managers
export function msgLeadUnassignedAlert(
  count: number,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح عمليات المبيعات" : "Open Sales Operations")}` : "";
  return lang === "ar"
    ? `🔔 <b>عملاء بانتظار التعيين</b>\n\n${count} عميل محتمل نشط بدون مسؤول مبيعات.${linkLine}`
    : `🔔 <b>Leads Waiting for Assignment</b>\n\n${count} active lead${count !== 1 ? "s" : ""} have no Sales Representative.${linkLine}`;
}

// Team overdue leads alert — for managers
export function msgTeamOverdueAlert(
  reps: Array<{ name: string; count: number }>,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const lines = reps.map((r) => `${escHtml(r.name)} — ${r.count} ${lang === "ar" ? "متأخر" : "overdue"}`).join("\n");
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح عمليات المبيعات" : "Open Sales Operations")}` : "";
  return lang === "ar"
    ? `⚠️ <b>تنبيه متابعات الفريق</b>\n\n${lines}${linkLine}`
    : `⚠️ <b>Sales Follow-up Alert</b>\n\n${lines}${linkLine}`;
}

// ── Registrations ─────────────────────────────────────────────────────────────

// Registration confirmed — for Sales Manager/Admin
export function msgRegistrationConfirmed(
  studentName: string,
  courseName: string,
  sessionDate: string,
  salesRepName: string,
  paymentStatus: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح التسجيل" : "Open Registration")}` : "";
  return lang === "ar"
    ? `🎓 <b>تسجيل جديد مؤكد</b>\n\nتم تأكيد تسجيل عميل جديد:\n\n${escHtml(studentName)}\n\nالدورة: ${escHtml(courseName)}\nالدورات الجارية: ${escHtml(sessionDate)}\nمسؤول المبيعات: ${escHtml(salesRepName)}\nحالة الدفع: ${escHtml(paymentStatus)}${linkLine}`
    : `🎓 <b>New Confirmed Registration</b>\n\n${escHtml(studentName)}\n\nCourse: ${escHtml(courseName)}\nCourse Run: ${escHtml(sessionDate)}\nSales Representative: ${escHtml(salesRepName)}\nPayment: ${escHtml(paymentStatus)}${linkLine}`;
}

// Registration cancelled
export function msgRegistrationCancelled(
  studentName: string,
  courseName: string,
  sessionDate: string,
  amountPaid: string,
  currency: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح التسجيل" : "Open Registration")}` : "";
  const hasPaid = amountPaid !== "0";
  const financeLine = hasPaid
    ? lang === "ar"
      ? `\n\nالمبلغ المدفوع: ${escHtml(amountPaid)} ${escHtml(currency)}\n\nقد تكون متابعة مالية مطلوبة.`
      : `\n\nPaid: ${escHtml(amountPaid)} ${escHtml(currency)}\n\nA financial follow-up may be required.`
    : "";
  return lang === "ar"
    ? `❌ <b>تم إلغاء التسجيل</b>\n\n${escHtml(studentName)}\n\n${escHtml(courseName)}\n${escHtml(sessionDate)}${financeLine}${linkLine}`
    : `❌ <b>Registration Cancelled</b>\n\n${escHtml(studentName)}\n\n${escHtml(courseName)}\n${escHtml(sessionDate)}${financeLine}${linkLine}`;
}

// Registration course run changed
export function msgRegistrationRunChanged(
  studentName: string,
  courseName: string,
  oldDate: string,
  newDate: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح التسجيل" : "Open Registration")}` : "";
  return lang === "ar"
    ? `📅 <b>تغيّرت الدورة الجارية</b>\n\n${escHtml(studentName)}\n${escHtml(courseName)}\n\nالسابق: ${escHtml(oldDate)}\nالجديد: ${escHtml(newDate)}${linkLine}`
    : `📅 <b>Course Run Changed</b>\n\n${escHtml(studentName)}\n${escHtml(courseName)}\n\nPrevious: ${escHtml(oldDate)}\nNew: ${escHtml(newDate)}${linkLine}`;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export function msgAttendanceNoShow(
  studentName: string,
  courseName: string,
  sessionDate: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الحضور" : "Open Attendance")}` : "";
  return lang === "ar"
    ? `⚠️ <b>غياب</b>\n\n${escHtml(studentName)}\n\n${escHtml(courseName)}\n${escHtml(sessionDate)}${linkLine}`
    : `⚠️ <b>No Show</b>\n\n${escHtml(studentName)}\n\n${escHtml(courseName)}\n${escHtml(sessionDate)}${linkLine}`;
}

// ── Finance ───────────────────────────────────────────────────────────────────

// Outstanding balance — manager/finance view (company-wide summary)
export function msgBalanceOutstandingManager(
  pendingCount: number,
  byCurrency: Array<{ currency: string; total: number }>,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const totals = byCurrency
    .map((r) => `${r.total.toLocaleString()} ${r.currency}`)
    .join(", ");
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الأرصدة المستحقة" : "Open Outstanding Balances")}` : "";
  return lang === "ar"
    ? `💰 <b>الأرصدة المستحقة</b>\n\n${pendingCount} تسجيل لا يزال لديهم أرصدة متبقية.\n\nإجمالي المستحق: ${escHtml(totals)}${linkLine}`
    : `💰 <b>Outstanding Balances</b>\n\n${pendingCount} registration${pendingCount !== 1 ? "s" : ""} have remaining balances.\n\nTotal outstanding: ${escHtml(totals)}${linkLine}`;
}

// Outstanding balance — Sales Rep view (only their own customers)
export function msgBalanceOutstandingSales(
  studentName: string,
  remaining: string,
  currency: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح التسجيل" : "Open Registration")}` : "";
  return lang === "ar"
    ? `💰 <b>متابعة مالية</b>\n\n${escHtml(studentName)}\n\nالمبلغ المتبقي: ${escHtml(remaining)} ${escHtml(currency)}${linkLine}`
    : `💰 <b>Payment Follow-up</b>\n\n${escHtml(studentName)}\n\nRemaining: ${escHtml(remaining)} ${escHtml(currency)}${linkLine}`;
}

// Expense threshold exceeded
export function msgExpenseThresholdExceeded(
  title: string,
  category: string,
  amount: string,
  currency: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح المصروف" : "Open Expense")}` : "";
  return lang === "ar"
    ? `⚠️ <b>مصروف مرتفع</b>\n\n${escHtml(title)}\n\nالفئة: ${escHtml(category)}\nالمبلغ: ${escHtml(amount)} ${escHtml(currency)}${linkLine}`
    : `⚠️ <b>High Expense</b>\n\n${escHtml(title)}\n\nCategory: ${escHtml(category)}\nAmount: ${escHtml(amount)} ${escHtml(currency)}${linkLine}`;
}

// ── Daily Digest (role-aware) ─────────────────────────────────────────────────

export interface DailyDigestStats {
  newLeads: number;
  registrations: number;
  revenue: string;
  pendingPayments: number;
  upcomingSessions: number;
  overdueTasks: number;
  // Extended fields for role-aware digest
  unassignedLeads?: number;
  outstandingAmount?: string;
  // Sales Rep fields
  myNewLeads?: number;
  myFollowUpsToday?: number;
  myOverdueLeads?: number;
  myConfirmedRegistrations?: number;
  myOutstandingCustomers?: number;
  // Trainer fields
  mySessionCount?: number;
  myStudentsExpected?: number;
  // Finance fields
  paymentsReceived?: string;
  pendingConfirmation?: number;
  totalOutstanding?: string;
  expenses?: string;
}

// C5f — Daily digest for Admin/Manager
export function msgC5fDailyDigest(
  date: string,
  stats: DailyDigestStats,
  lang: Lang = "en",
  deepLinkUrl?: string
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح لوحة التحكم" : "Open Dashboard")}` : "";
  if (lang === "ar") {
    return (
      `📊 <b>ملخص اليوم — ${escHtml(date)}</b>\n\n` +
      `عملاء جدد: ${stats.newLeads}\n` +
      (stats.unassignedLeads !== undefined ? `غير معيّنين: ${stats.unassignedLeads}\n` : "") +
      `تسجيلات مؤكدة: ${stats.registrations}\n` +
      `المدفوعات المستلمة: ${escHtml(stats.revenue)}\n` +
      (stats.outstandingAmount !== undefined ? `المستحق: ${escHtml(stats.outstandingAmount)}\n` : "") +
      `دورات قادمة: ${stats.upcomingSessions}\n` +
      `متابعات متأخرة: ${stats.overdueTasks}` +
      linkLine
    );
  }
  return (
    `📊 <b>Today's Summary — ${escHtml(date)}</b>\n\n` +
    `New Leads: ${stats.newLeads}\n` +
    (stats.unassignedLeads !== undefined ? `Unassigned: ${stats.unassignedLeads}\n` : "") +
    `Confirmed Registrations: ${stats.registrations}\n` +
    `Payments Received: ${escHtml(stats.revenue)}\n` +
    (stats.outstandingAmount !== undefined ? `Outstanding: ${escHtml(stats.outstandingAmount)}\n` : "") +
    `Upcoming Course Runs: ${stats.upcomingSessions}\n` +
    `Overdue Leads: ${stats.overdueTasks}` +
    linkLine
  );
}

// Daily digest for Sales Representative (own data only)
export function msgDailyDigestSales(
  date: string,
  stats: DailyDigestStats,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح عملائي" : "Open My Leads")}` : "";
  if (lang === "ar") {
    return (
      `📊 <b>ملخصك اليومي</b>\n\n` +
      `عملاء جدد معيّنون: ${stats.myNewLeads ?? 0}\n` +
      `متابعات اليوم: ${stats.myFollowUpsToday ?? 0}\n` +
      `متأخرون: ${stats.myOverdueLeads ?? 0}\n` +
      `تسجيلات مؤكدة: ${stats.myConfirmedRegistrations ?? 0}\n` +
      `عملاء برصيد متبقٍ: ${stats.myOutstandingCustomers ?? 0}` +
      linkLine
    );
  }
  return (
    `📊 <b>Your Daily Summary</b>\n\n` +
    `New Leads Assigned: ${stats.myNewLeads ?? 0}\n` +
    `Follow-ups Today: ${stats.myFollowUpsToday ?? 0}\n` +
    `Overdue: ${stats.myOverdueLeads ?? 0}\n` +
    `Confirmed Registrations: ${stats.myConfirmedRegistrations ?? 0}\n` +
    `Outstanding Customers: ${stats.myOutstandingCustomers ?? 0}` +
    linkLine
  );
}

// Daily digest for Trainer
export function msgDailyDigestTrainer(
  date: string,
  stats: DailyDigestStats,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح الجدول" : "Open Schedule")}` : "";
  if (lang === "ar") {
    return (
      `📚 <b>جدولك اليوم</b>\n\n` +
      `الدورات الجارية: ${stats.mySessionCount ?? 0}\n` +
      `الطلاب المتوقعون: ${stats.myStudentsExpected ?? 0}` +
      linkLine
    );
  }
  return (
    `📚 <b>Today's Schedule</b>\n\n` +
    `Course Runs: ${stats.mySessionCount ?? 0}\n` +
    `Students Expected: ${stats.myStudentsExpected ?? 0}` +
    linkLine
  );
}

// Daily digest for Finance
export function msgDailyDigestFinance(
  date: string,
  stats: DailyDigestStats,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح المالية" : "Open Finance")}` : "";
  if (lang === "ar") {
    return (
      `💰 <b>ملخص مالي</b>\n\n` +
      `المدفوعات المستلمة: ${escHtml(stats.paymentsReceived ?? "0")}\n` +
      `بانتظار التأكيد: ${stats.pendingConfirmation ?? 0}\n` +
      `إجمالي المستحق: ${escHtml(stats.totalOutstanding ?? "0")}\n` +
      `المصاريف: ${escHtml(stats.expenses ?? "0")}` +
      linkLine
    );
  }
  return (
    `💰 <b>Finance Summary</b>\n\n` +
    `Payments Received: ${escHtml(stats.paymentsReceived ?? "0")}\n` +
    `Pending Confirmation: ${stats.pendingConfirmation ?? 0}\n` +
    `Outstanding: ${escHtml(stats.totalOutstanding ?? "0")}\n` +
    `Expenses: ${escHtml(stats.expenses ?? "0")}` +
    linkLine
  );
}

// ── Commissions ───────────────────────────────────────────────────────────────

export function msgCommissionEarned(
  courseName: string,
  studentName: string,
  amount: string,
  currency: string,
  outstanding: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح عمولاتي" : "My Commissions")}` : "";
  return lang === "ar"
    ? `🎉 <b>تم احتساب عمولة جديدة</b>\n\nالدورة: ${escHtml(courseName)}\nالطالب: ${escHtml(studentName)}\nالعمولة: ${escHtml(amount)} ${escHtml(currency)}\n\nمستحقاتك الحالية:\n<b>${escHtml(outstanding)} ${escHtml(currency)}</b>${linkLine}`
    : `🎉 <b>Commission Earned</b>\n\nCourse: ${escHtml(courseName)}\nStudent: ${escHtml(studentName)}\nCommission: ${escHtml(amount)} ${escHtml(currency)}\n\nCurrent Outstanding:\n<b>${escHtml(outstanding)} ${escHtml(currency)}</b>${linkLine}`;
}

export function msgCommissionAdjusted(
  courseName: string,
  reason: string,
  adjustment: string,
  currency: string,
  outstanding: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح عمولاتي" : "My Commissions")}` : "";
  return lang === "ar"
    ? `⚠️ <b>تم تعديل إحدى عمولاتك</b>\n\nالدورة: ${escHtml(courseName)}\nالسبب: ${escHtml(reason)}\nالتعديل: <b>-${escHtml(adjustment)} ${escHtml(currency)}</b>\n\nمستحقاتك الحالية:\n<b>${escHtml(outstanding)} ${escHtml(currency)}</b>${linkLine}`
    : `⚠️ <b>Commission Adjusted</b>\n\nCourse: ${escHtml(courseName)}\nReason: ${escHtml(reason)}\nAdjustment: <b>-${escHtml(adjustment)} ${escHtml(currency)}</b>\n\nCurrent Outstanding:\n<b>${escHtml(outstanding)} ${escHtml(currency)}</b>${linkLine}`;
}

export function msgCommissionPayoutProcessed(
  amount: string,
  currency: string,
  remaining: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح عمولاتي" : "My Commissions")}` : "";
  return lang === "ar"
    ? `✅ <b>تم تسديد مستحقاتك</b>\n\nالمبلغ المدفوع: <b>${escHtml(amount)} ${escHtml(currency)}</b>\nالمتبقي: ${escHtml(remaining)} ${escHtml(currency)}${linkLine}`
    : `✅ <b>Commission Payout Processed</b>\n\nAmount Paid: <b>${escHtml(amount)} ${escHtml(currency)}</b>\nRemaining: ${escHtml(remaining)} ${escHtml(currency)}${linkLine}`;
}

export function msgRefundRequested(
  studentName: string,
  courseName: string,
  amount: string,
  currency: string,
  reason: string,
  deepLinkUrl: string,
  lang: Lang = "en"
): string {
  const linkLine = deepLinkUrl ? `\n${link(deepLinkUrl, lang === "ar" ? "فتح طلب الاسترجاع" : "Review Refund")}` : "";
  return lang === "ar"
    ? `💰 <b>طلب استرجاع جديد</b>\n\nالطالب: ${escHtml(studentName)}\nالدورة: ${escHtml(courseName)}\nالمبلغ: ${escHtml(amount)} ${escHtml(currency)}\nالسبب: ${escHtml(reason)}${linkLine}`
    : `💰 <b>Refund Request</b>\n\nStudent: ${escHtml(studentName)}\nCourse: ${escHtml(courseName)}\nAmount: ${escHtml(amount)} ${escHtml(currency)}\nReason: ${escHtml(reason)}${linkLine}`;
}

// ── Live Classroom notifications ──────────────────────────────────────────────

export function msgLiveSessionReminder(
  courseName: string,
  minutesBefore: number,
  sessionUrl: string,
  lang: Lang = "en",
): string {
  const name = escHtml(courseName);
  const mins = minutesBefore.toString();
  return lang === "ar"
    ? `🔴 <b>تذكير: جلسة مباشرة خلال ${mins} دقيقة</b>\n\n📚 ${name}\n\nاستعد للجلسة — ستبدأ قريباً.\n\n${link(sessionUrl, "عرض الجلسة →")}`
    : `🔴 <b>Live session starting in ${mins} min</b>\n\n📚 ${name}\n\nGet ready — your session is about to begin.\n\n${link(sessionUrl, "View session →")}`;
}

export function msgLiveSessionStarted(
  courseName: string,
  sessionUrl: string,
  lang: Lang = "en",
): string {
  const name = escHtml(courseName);
  return lang === "ar"
    ? `🔴 <b>الجلسة المباشرة بدأت الآن</b>\n\n📚 ${name}\n\nانضم الآن إلى الفصل الافتراضي.\n\n${link(sessionUrl, "الدخول إلى الفصل →")}`
    : `🔴 <b>Live session is now live</b>\n\n📚 ${name}\n\nJoin now — the classroom is open.\n\n${link(sessionUrl, "Enter classroom →")}`;
}

export function msgLiveSessionStudentJoin(
  courseName: string,
  joinUrl: string,
  lang: Lang = "en",
): string {
  const name = escHtml(courseName);
  return lang === "ar"
    ? `🔴 <b>فصلك المباشر بدأ الآن</b>\n\n📚 ${name}\n\nانضم الآن — المحاضر جاهز لك.\n\n${link(joinUrl, "انضم إلى الفصل →")}`
    : `🔴 <b>Your live class has started</b>\n\n📚 ${name}\n\nThe trainer is ready — join now.\n\n${link(joinUrl, "Join classroom →")}`;
}

export function msgLiveSessionRecordingReady(
  courseName: string,
  replayUrl: string,
  lang: Lang = "en",
): string {
  const name = escHtml(courseName);
  return lang === "ar"
    ? `🎬 <b>التسجيل جاهز</b>\n\n📚 ${name}\n\nتسجيل الجلسة المباشرة أصبح متاحاً للمراجعة.\n\n${link(replayUrl, "مشاهدة التسجيل →")}`
    : `🎬 <b>Recording is ready</b>\n\n📚 ${name}\n\nThe live session recording is now available to review.\n\n${link(replayUrl, "Watch recording →")}`;
}

// 31.2 — Student reminder (30-min / 10-min before live session).
export function msgLiveSessionStudentReminder(
  courseName: string,
  joinUrl: string,
  minutesBefore: number,
  lang: Lang = "en",
): string {
  const name = escHtml(courseName);
  return lang === "ar"
    ? `⏰ <b>فصلك المباشر يبدأ خلال ${minutesBefore} دقيقة</b>\n\n📚 ${name}\n\nاستعد للانضمام إلى الفصل الافتراضي.\n\n${link(joinUrl, "انضم إلى الفصل →")}`
    : `⏰ <b>Your live class starts in ${minutesBefore} minutes</b>\n\n📚 ${name}\n\nGet ready to join the virtual classroom.\n\n${link(joinUrl, "Join classroom →")}`;
}

// 31.3 — Student recording-ready notification.
export function msgLiveSessionStudentRecordingReady(
  courseName: string,
  replayUrl: string,
  lang: Lang = "en",
): string {
  const name = escHtml(courseName);
  return lang === "ar"
    ? `🎬 <b>تسجيل فصلك المباشر جاهز</b>\n\n📚 ${name}\n\nأصبح التسجيل متاحاً للمراجعة الآن.\n\n${link(replayUrl, "مشاهدة التسجيل →")}`
    : `🎬 <b>Your class recording is ready</b>\n\n📚 ${name}\n\nThe recording from your live session is now available to watch.\n\n${link(replayUrl, "Watch recording →")}`;
}

// ── Backward compat aliases ───────────────────────────────────────────────────
// Keep old C5c name for any callers that haven't been updated yet.
export const msgC5cSessionReminder = msgCourseRunReminder;
