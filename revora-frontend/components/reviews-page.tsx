"use client";

import { useCallback, useEffect, useState } from "react";

import { PolarisEmptyState } from "@/components/polaris-empty-state";
import { adminFetch, adminFetchJson } from "@/lib/admin-fetch";

interface AdminReview {
  authorEmail: string | null;
  authorName: string | null;
  comment: string | null;
  createdAt: string;
  helpfulCount: number;
  id: string;
  notHelpfulCount: number;
  productId: string | null;
  publishedAt: string | null;
  score: number | null;
  source: string;
  status: string;
}

type ReviewFilter = "all" | "pending" | "published" | "rejected";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return value.slice(0, 10);
}

function statusTone(status: string) {
  if (status === "published") {
    return "success";
  }

  if (status === "pending") {
    return "warning";
  }

  return "critical";
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [autoPublish, setAutoPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminFetchJson<{
        pendingCount?: number;
        reviews: AdminReview[];
      }>(`/api/admin/reviews?status=${filter}`);
      setReviews(data.reviews ?? []);
      setPendingCount(data.pendingCount ?? 0);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reviews"
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await adminFetchJson<{ autoPublishReviews: boolean }>(
        "/api/admin/settings"
      );
      setAutoPublish(Boolean(data.autoPublishReviews));
    } catch {
      // Settings are best-effort on first load.
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function updateAutoPublish(enabled: boolean) {
    setSavingSettings(true);
    setError(null);

    try {
      await adminFetchJson("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ autoPublishReviews: enabled }),
      });
      setAutoPublish(enabled);
      setMessage(
        enabled
          ? "New reviews will publish automatically."
          : "New reviews will require approval."
      );
    } catch (settingsError) {
      setError(
        settingsError instanceof Error
          ? settingsError.message
          : "Failed to update settings"
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function moderateReview(
    reviewId: string,
    action: "approve" | "unpublish" | "reject"
  ) {
    setActionId(reviewId);
    setError(null);

    try {
      const response = await adminFetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update review");
      }

      setMessage(
        action === "approve"
          ? "Review approved and published."
          : action === "unpublish"
            ? "Review unpublished."
            : "Review rejected."
      );
      await loadReviews();
    } catch (moderationError) {
      setError(
        moderationError instanceof Error
          ? moderationError.message
          : "Failed to update review"
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <s-page heading="Reviews" inlineSize="large">
      <s-section heading="Publishing settings">
        <s-stack gap="small">
          <s-text>
            Choose whether imported and customer-submitted reviews go live
            immediately or wait for your approval.
          </s-text>
          <s-checkbox
            checked={autoPublish}
            disabled={savingSettings}
            label="Auto-publish new reviews"
            onChange={(event) => {
              void updateAutoPublish(event.currentTarget.checked);
            }}
          />
        </s-stack>
      </s-section>

      {message ? (
        <s-banner
          dismissible
          heading={message}
          onDismiss={() => setMessage(null)}
          tone="success"
        />
      ) : null}

      {error ? (
        <s-banner
          dismissible
          heading={error}
          onDismiss={() => setError(null)}
          tone="critical"
        />
      ) : null}

      <s-section heading="All reviews">
        <s-stack gap="base">
          <s-stack direction="inline" gap="small">
            <s-button
              onClick={() => setFilter("all")}
              variant={filter === "all" ? "primary" : "secondary"}
            >
              All
            </s-button>
            <s-button
              onClick={() => setFilter("pending")}
              variant={filter === "pending" ? "primary" : "secondary"}
            >
              Pending{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </s-button>
            <s-button
              onClick={() => setFilter("published")}
              variant={filter === "published" ? "primary" : "secondary"}
            >
              Published
            </s-button>
            <s-button
              onClick={() => setFilter("rejected")}
              variant={filter === "rejected" ? "primary" : "secondary"}
            >
              Rejected
            </s-button>
          </s-stack>

          {loading ? (
            <s-stack alignItems="center" direction="inline" gap="small">
              <s-spinner accessibilityLabel="Loading reviews" />
              <s-text color="subdued">Loading reviews…</s-text>
            </s-stack>
          ) : reviews.length === 0 ? (
            <PolarisEmptyState
              description="Import Temu reviews or wait for customers to submit reviews from your storefront widget."
              heading="No reviews yet"
              imageAlt="No reviews illustration"
            />
          ) : (
            <s-table>
              <s-table-header-row>
                <s-table-header>Author</s-table-header>
                <s-table-header>Rating</s-table-header>
                <s-table-header>Review</s-table-header>
                <s-table-header>Source</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Date</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {reviews.map((review) => (
                  <s-table-row key={review.id}>
                    <s-table-cell>
                      <s-stack gap="small">
                        <s-text type="strong">
                          {review.authorName || "Customer"}
                        </s-text>
                        {review.authorEmail ? (
                          <s-text color="subdued">{review.authorEmail}</s-text>
                        ) : null}
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      {review.score ? `${review.score}/5` : "—"}
                    </s-table-cell>
                    <s-table-cell>
                      <s-text>
                        {(review.comment || "").slice(0, 120)}
                        {(review.comment || "").length > 120 ? "…" : ""}
                      </s-text>
                    </s-table-cell>
                    <s-table-cell>{review.source}</s-table-cell>
                    <s-table-cell>
                      <s-badge tone={statusTone(review.status)}>
                        {review.status}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      {formatDate(review.publishedAt || review.createdAt)}
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small">
                        {review.status === "pending" ? (
                          <s-button
                            disabled={actionId === review.id}
                            onClick={() => {
                              void moderateReview(review.id, "approve");
                            }}
                            variant="primary"
                          >
                            Approve
                          </s-button>
                        ) : null}
                        {review.status === "published" ? (
                          <s-button
                            disabled={actionId === review.id}
                            onClick={() => {
                              void moderateReview(review.id, "unpublish");
                            }}
                          >
                            Unpublish
                          </s-button>
                        ) : null}
                        {review.status === "rejected" ? null : (
                          <s-button
                            disabled={actionId === review.id}
                            onClick={() => {
                              void moderateReview(review.id, "reject");
                            }}
                            tone="critical"
                          >
                            Reject
                          </s-button>
                        )}
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
