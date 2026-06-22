import { exportQuerySchema, parseCustomExportFields } from "@revora/shared";
import { headers } from "next/headers";

import { attachmentResponse } from "@/lib/export/file-response";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { ExportError, exportProductReviews } from "@/lib/reviews/export";
import { withAdminApi } from "@/lib/shopify/authenticate-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

interface RouteContext {
  params: Promise<{ productId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const { productId } = await context.params;
  const { searchParams } = new URL(request.url);

  const parsedQuery = exportQuerySchema.safeParse({
    format: searchParams.get("format"),
    fileType: searchParams.get("fileType") ?? undefined,
    fields: searchParams.get("fields") ?? undefined,
  });

  if (!parsedQuery.success) {
    return extensionJsonResponse(
      { error: "Invalid export parameters" },
      origin,
      { status: 400 }
    );
  }

  const { format, fileType, fields } = parsedQuery.data;

  return withAdminApi(
    request,
    async ({ session }) => {
      try {
        const customFields =
          format === "custom" ? parseCustomExportFields(fields) : undefined;

        if (format === "custom" && customFields === null) {
          return extensionJsonResponse(
            { error: "Select at least one field for custom export" },
            origin,
            { status: 400 }
          );
        }

        const result = await exportProductReviews(session, productId, {
          format,
          fileType,
          fields: customFields ?? undefined,
        });

        return attachmentResponse(
          result.content,
          result.filename,
          result.contentType,
          origin
        );
      } catch (error) {
        if (error instanceof ExportError) {
          return extensionJsonResponse({ error: error.message }, origin, {
            status: error.status,
          });
        }

        throw error;
      }
    },
    {
      logPrefix: "Revora export failed",
      defaultErrorMessage: "Failed to export reviews",
    }
  );
}
