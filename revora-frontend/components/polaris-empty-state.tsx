"use client";

import type { ReactNode } from "react";

const DEFAULT_IMAGE =
  "https://cdn.shopify.com/static/images/polaris/patterns/callout.png";

interface EmptyStateAction {
  accessibilityLabel?: string;
  href?: string;
  label: string;
  onClick?: () => void;
}

interface PolarisEmptyStateProps {
  children?: ReactNode;
  description: string;
  heading: string;
  imageAlt: string;
  imageSrc?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
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
  const hasActions = Boolean(primaryAction || secondaryAction);

  return (
    <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
      <s-box maxBlockSize="200px" maxInlineSize="200px">
        <s-image alt={imageAlt} aspectRatio="1/0.5" src={imageSrc} />
      </s-box>
      <s-grid gap="base" justifyItems="center" maxInlineSize="450px">
        <s-stack alignItems="center">
          <s-heading>{heading}</s-heading>
          <s-paragraph>{description}</s-paragraph>
        </s-stack>
        {children}
        {hasActions ? (
          <s-button-group>
            {secondaryAction ? (
              <s-button
                accessibilityLabel={
                  secondaryAction.accessibilityLabel ?? secondaryAction.label
                }
                href={secondaryAction.href}
                onClick={secondaryAction.onClick}
                slot="secondary-actions"
                variant="secondary"
              >
                {secondaryAction.label}
              </s-button>
            ) : null}
            {primaryAction ? (
              <s-button
                accessibilityLabel={
                  primaryAction.accessibilityLabel ?? primaryAction.label
                }
                href={primaryAction.href}
                onClick={primaryAction.onClick}
                slot="primary-action"
                variant="primary"
              >
                {primaryAction.label}
              </s-button>
            ) : null}
          </s-button-group>
        ) : null}
      </s-grid>
    </s-grid>
  );
}
