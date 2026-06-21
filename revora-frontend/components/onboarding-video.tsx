"use client"

import {
  CHROME_WEB_STORE_URL,
  ONBOARDING_YOUTUBE_VIDEO_ID,
} from "@/lib/onboarding"

type OnboardingVideoProps = {
  onOpenChromeStore?: () => void
}

const mediaFrameStyle = {
  aspectRatio: "16 / 9",
  display: "grid",
  placeItems: "center",
  textAlign: "center" as const,
  background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
}

export function OnboardingVideo({ onOpenChromeStore }: OnboardingVideoProps) {
  const hasVideo = Boolean(ONBOARDING_YOUTUBE_VIDEO_ID)

  function openChromeStore() {
    onOpenChromeStore?.()
    window.open(CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer")
  }

  return (
    <s-box
      border="base"
      borderRadius="base"
      background="base"
      overflow="hidden"
    >
      <s-stack gap="none">
        {hasVideo ? (
          <div style={{ ...mediaFrameStyle, placeItems: "stretch" }}>
            <iframe
              title="Revora quick start video"
              src={`https://www.youtube.com/embed/${ONBOARDING_YOUTUBE_VIDEO_ID}?rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </div>
        ) : (
          <div style={mediaFrameStyle}>
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
          </div>
        )}

        <s-box padding="base">
          <s-stack gap="small">
            <s-text type="strong">Prefer to watch?</s-text>
            <s-paragraph color="subdued">
              {hasVideo
                ? "See the full import flow from Temu to your Shopify storefront."
                : "We'll add a quick-start video here. The checklist below walks you through the same flow."}
            </s-paragraph>
            <s-stack direction="inline" gap="small">
              <s-button variant="primary" icon="external" onClick={openChromeStore}>
                Add to Chrome
              </s-button>
              {hasVideo ? (
                <s-button
                  variant="secondary"
                  onClick={() =>
                    window.open(
                      `https://www.youtube.com/watch?v=${ONBOARDING_YOUTUBE_VIDEO_ID}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  Open on YouTube
                </s-button>
              ) : null}
            </s-stack>
          </s-stack>
        </s-box>
      </s-stack>
    </s-box>
  )
}