import { utils, write } from "xlsx";

export function buildXlsx(headers: string[], rows: string[][]): Uint8Array {
  const worksheet = utils.aoa_to_sheet([headers, ...rows]);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Reviews");
  const output = write(workbook, { bookType: "xlsx", type: "array" });
  return new Uint8Array(output as ArrayBuffer);
}
