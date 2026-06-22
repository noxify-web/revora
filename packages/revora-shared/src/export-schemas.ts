import { z } from "zod";

import {
  CUSTOM_EXPORT_FIELD_KEYS,
  DEFAULT_CUSTOM_EXPORT_FIELDS,
} from "./export-fields";
import { EXPORT_FILE_TYPES, EXPORT_FORMAT_IDS } from "./export-formats";

export const exportQuerySchema = z.object({
  format: z.enum(EXPORT_FORMAT_IDS),
  fileType: z.enum(EXPORT_FILE_TYPES).optional(),
  fields: z.string().optional(),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;

const customExportFieldSchema = z.enum(CUSTOM_EXPORT_FIELD_KEYS);

export function parseCustomExportFields(
  fieldsParam: string | undefined | null
): (typeof CUSTOM_EXPORT_FIELD_KEYS)[number][] | null {
  if (fieldsParam == null) {
    return DEFAULT_CUSTOM_EXPORT_FIELDS;
  }

  const requested = fieldsParam
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);

  const parsed = z.array(customExportFieldSchema).safeParse(requested);
  if (!parsed.success || parsed.data.length === 0) {
    return null;
  }

  return parsed.data;
}
