import { NextResponse } from "next/server";

import { extensionCorsHeaders } from "@/lib/extension/cors";

export function attachmentResponse(
  content: Uint8Array,
  filename: string,
  contentType: string,
  origin: string | null
) {
  const headers = extensionCorsHeaders(origin);
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);

  return new NextResponse(Buffer.from(content), {
    status: 200,
    headers,
  });
}
