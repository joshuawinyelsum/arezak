export function parsePesewas(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [cedis, pesewas = ""] = normalized.split(".");
  const amount = Number(cedis) * 100 + Number(pesewas.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function formatGhs(pesewas: number): string {
  return `GH₵${(pesewas / 100).toFixed(2)}`;
}

export function normalizeGhanaPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  const match = /^(?:\+233|233|0)(\d{9})$/.exec(compact);
  return match ? `+233${match[1]}` : null;
}
