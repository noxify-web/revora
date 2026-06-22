export const EXPORT_FORMAT_IDS = [
  "judge_me",
  "loox",
  "yotpo",
  "stamped",
  "okendo",
  "custom",
] as const;

export type ExportFormatId = (typeof EXPORT_FORMAT_IDS)[number];

export const EXPORT_FILE_TYPES = ["csv", "xlsx"] as const;

export type ExportFileType = (typeof EXPORT_FILE_TYPES)[number];

export interface ExportFormatDefinition {
  description: string;
  fileType: ExportFileType;
  id: ExportFormatId;
  label: string;
}

export const EXPORT_FORMATS: ExportFormatDefinition[] = [
  {
    id: "judge_me",
    label: "Judge.me",
    description: "CSV ready for Judge.me → Settings → Import reviews",
    fileType: "csv",
  },
  {
    id: "loox",
    label: "Loox",
    description: "CSV ready for Loox → Import reviews → Custom file",
    fileType: "csv",
  },
  {
    id: "yotpo",
    label: "Yotpo",
    description: "CSV ready for Yotpo → Settings → Import reviews",
    fileType: "csv",
  },
  {
    id: "stamped",
    label: "Stamped.io",
    description: "CSV ready for Stamped → Settings → Importer → Custom",
    fileType: "csv",
  },
  {
    id: "okendo",
    label: "Okendo",
    description: "CSV ready for Okendo → Settings → Import/Export",
    fileType: "csv",
  },
  {
    id: "custom",
    label: "Custom spreadsheet",
    description: "Choose Revora fields and download CSV or Excel",
    fileType: "csv",
  },
];

export function getExportFormat(
  formatId: ExportFormatId
): ExportFormatDefinition {
  const format = EXPORT_FORMATS.find((item) => item.id === formatId);
  if (!format) {
    throw new Error(`Unknown export format: ${formatId}`);
  }
  return format;
}
