import "server-only";

// All Telegram API calls go through this module.
// Bot token is server-only — never referenced in client components or NEXT_PUBLIC_* vars.

const API_BASE = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return `https://api.telegram.org/bot${token}`;
};

export interface SendMessageOptions {
  parseMode?: "HTML" | "MarkdownV2";
  disableWebPagePreview?: boolean;
  replyToMessageId?: number;
}

export interface SendMessageResult {
  ok: boolean;
  errorCode: number | null;
}

// Sends a message to a Telegram chat. Never throws — logs errors and returns a result.
export async function sendMessage(
  chatId: string | number,
  text: string,
  options: SendMessageOptions = {}
): Promise<SendMessageResult> {
  try {
    const res = await fetch(`${API_BASE()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? "HTML",
        disable_web_page_preview: options.disableWebPagePreview ?? true,
        ...(options.replyToMessageId != null
          ? { reply_to_message_id: options.replyToMessageId }
          : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "(unreadable)");
      console.error(
        `[telegram/client] sendMessage failed status=${res.status} chatId=${chatId}:`,
        detail
      );
      return { ok: false, errorCode: res.status };
    }

    return { ok: true, errorCode: null };
  } catch (err) {
    console.error(`[telegram/client] sendMessage threw for chatId=${chatId}:`, err);
    return { ok: false, errorCode: null };
  }
}
