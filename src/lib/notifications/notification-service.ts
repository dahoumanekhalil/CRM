import "server-only";
import type { NotificationIntent, NotificationProvider } from "./types";
import { InAppProvider } from "./providers/in-app";
import { TelegramProvider } from "./providers/telegram";

// Register providers here. Adding a new channel requires 0 changes outside this file.
const providers: NotificationProvider[] = [InAppProvider, TelegramProvider];

export const NotificationService = {
  // Fire-and-forget: kicks off delivery across all providers without blocking the caller.
  // A failure in any provider is caught and logged — it never propagates to business logic.
  send(intent: NotificationIntent): void {
    void Promise.allSettled(
      providers.map((p) =>
        p.send(intent).catch((err) => {
          console.error(
            `[NotificationService] provider="${p.name}" type="${intent.type}" failed:`,
            err
          );
        })
      )
    );
  },
};
