import { ReviewsPage } from "@/components/reviews-page";
import { authenticatePage } from "@/lib/shopify/authenticate-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  await authenticatePage(searchParams);

  return <ReviewsPage />;
}
