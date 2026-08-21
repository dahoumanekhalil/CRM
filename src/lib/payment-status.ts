export type PaymentDotStatus = "full" | "partial" | "none";

type RegistrationWithPayments = {
  agreedPrice: unknown; // Decimal | null — serialized from server
  payments: Array<{ amount: unknown }>; // completed payments only
};

export function calcPaymentStatus(
  registrations: RegistrationWithPayments[] | null | undefined
): PaymentDotStatus {
  if (!registrations?.length) return "none";

  let totalAgreed = 0;
  let totalPaid = 0;

  for (const reg of registrations) {
    if (reg.agreedPrice != null) totalAgreed += Number(reg.agreedPrice);
    for (const p of reg.payments) totalPaid += Number(p.amount);
  }

  if (totalPaid <= 0) return "none";
  if (totalAgreed > 0 && totalPaid >= totalAgreed) return "full";
  return "partial";
}
