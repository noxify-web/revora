"use client"

import {
  CHROME_WEB_STORE_URL,
  ONBOARDING_YOUTUBE_VIDEO_ID,
} from "@/lib/onboarding"

type OnboardingVideoProps = {
  onOpenChromeStore?: () => void
}

export function OnboardingVideo({ onOpenChromeStore }: OnboardingVideoProps) {
  const hasVideo = Boolean(ONBOARDING_YOUTUBE_VIDEO_ID)
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${ONBOARDING_YOUTUBE_VIDEO_ID}`
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${ONBOARDING_YOUTUBE_VIDEO_ID}?rel=0`
  function openChromeStore() {
    onOpenChromeStore?.()
    window.open(CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer")
  }

  return (
    <s-box border="base" borderRadius="base" overflow="hidden">
      {hasVideo ? (
        <s-query-container containerName="onboarding-video">
          <s-box
            background="subdued"
            overflow="hidden"
            maxBlockSize="280px"
          >
            <iframe
              title="Revora quick start video"
              src={youtubeEmbedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                border: 0,
                display: "block",
              }}
            />
          </s-box>
        </s-query-container>
      ) : (
        <s-box background="subdued" padding="large-400">
          <s-stack gap="small" alignItems="center">
            <s-box
              padding="base"
              borderRadius="large"
              background="base"
              border="base"
            >
              <s-icon type="play" size="base" />
            </s-box>
            <s-heading>Video walkthrough coming soon</s-heading>
            <s-paragraph color="subdued">
              A short tutorial will live here. Follow the setup steps below to
              get started now.
            </s-paragraph>
          </s-stack>
        </s-box>
      )}

      <s-divider />

      <s-grid
        gridTemplateColumns="1fr auto"
        background="base"
        padding="base"
        gap="small"
        alignItems="center"
      >
        <s-stack gap="small-200">
          <s-text type="strong">Prefer to watch?</s-text>
          <s-paragraph color="subdued">
            {hasVideo
              ? "See the full import flow from Temu to your Shopify storefront."
              : "We'll add a quick-start video here. The checklist below walks you through the same flow."}
          </s-paragraph>
        </s-stack>
      </s-grid>

      <s-box padding="base" paddingBlockStart="none">
        <s-stack direction="inline" gap="small">
          <s-button variant="primary" icon="external" onClick={openChromeStore}>
            Add to Chrome
          </s-button>
          {hasVideo ? (
            <s-button
              variant="secondary"
              icon="external"
              href={youtubeWatchUrl}
              target="_blank"
            >
              Open on YouTube
            </s-button>
          ) : null}
        </s-stack>
      </s-box>
    </s-box>
  )
}