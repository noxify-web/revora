import { ReviewExportPage } from "@/components/review-export-page";
import { authenticatePage } from "@/lib/shopify/authenticate-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const { shop } = await authenticatePage(searchParams);

  return <ReviewExportPage shop={shop} />;
}
