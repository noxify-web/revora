"use client"

import type { ReactNode } from "react"

const DEFAULT_IMAGE =
  "https://cdn.shopify.com/static/images/polaris/patterns/callout.png"

type EmptyStateAction = {
  label: string
  onClick?: () => void
  href?: string
  accessibilityLabel?: string
}

type PolarisEmptyStateProps = {
  heading: string
  description: string
  imageAlt: string
  imageSrc?: string
  primaryAction?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  children?: ReactNode
}

export function PolarisEmptyState({
  heading,
  description,
  imageAlt,
  imageSrc = DEFAULT_IMAGE,
  primaryAction,
  secondaryAction,
  children,
}: PolarisEmptyStateProps) {
  const hasActions = Boolean(primaryAction || secondaryAction)

  return (
    <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
      <s-box maxInlineSize="200px" maxBlockSize="200px">
        <s-image aspectRatio="1/0.5" src={imageSrc} alt={imageAlt} />
      </s-box>
      <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
        <s-stack alignItems="center">
          <s-heading>{heading}</s-heading>
          <s-paragraph>{description}</s-paragraph>
        </s-stack>
        {children}
        {hasActions ? (
          <s-button-group>
            {secondaryAction ? (
              <s-button
                slot="secondary-actions"
                variant="secondary"
                href={secondaryAction.href}
                onClick={secondaryAction.onClick}
                accessibilityLabel={
                  secondaryAction.accessibilityLabel ?? secondaryAction.label
                }
              >
                {secondaryAction.label}
              </s-button>
            ) : null}
            {primaryAction ? (
              <s-button
                slot="primary-action"
                variant="primary"
                href={primaryAction.href}
                onClick={primaryAction.onClick}
                accessibilityLabel={
                  primaryAction.accessibilityLabel ?? primaryAction.label
                }
              >
                {primaryAction.label}
              </s-button>
            ) : null}
          </s-button-group>
        ) : null}
      </s-grid>
    </s-grid>
  )
}