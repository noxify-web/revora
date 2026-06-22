function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function encodeCsvUtf8(csv: string): Uint8Array {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const body = new TextEncoder().encode(csv);
  const output = new Uint8Array(bom.length + body.length);
  output.set(bom, 0);
  output.set(body, bom.length);
  return output;
}
