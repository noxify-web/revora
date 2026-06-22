function toDate(reviewTime: number | null): Date | null {
  if (!reviewTime) {
    return null;
  }
  return new Date(reviewTime * 1000);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatJudgeMeDate(reviewTime: number | null): string {
  const date = toDate(reviewTime);
  if (!date) {
    return "";
  }
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

export function formatIsoDate(reviewTime: number | null): string {
  const date = toDate(reviewTime);
  if (!date) {
    return "";
  }
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatStampedDate(reviewTime: number | null): string {
  const date = toDate(reviewTime);
  if (!date) {
    return "";
  }
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function formatOkendoDate(reviewTime: number | null): string {
  return formatStampedDate(reviewTime);
}
