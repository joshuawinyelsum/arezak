export type MoneyAccount = {
  id: string;
  name: string;
  available_balance: { amount_pesewas: number };
};

export type GhanaRail = "MTN_MOMO" | "TELECEL_CASH" | "AIRTELTIGO_MONEY";

export const GHANA_RAILS: { value: GhanaRail; label: string }[] = [
  { value: "MTN_MOMO", label: "MTN MoMo" },
  { value: "TELECEL_CASH", label: "Telecel Cash" },
  { value: "AIRTELTIGO_MONEY", label: "AT Money (AirtelTigo)" },
];

export function ghanaRailLabel(rail: GhanaRail | null | undefined): string {
  return GHANA_RAILS.find((candidate) => candidate.value === rail)?.label ?? "Mobile money";
}
