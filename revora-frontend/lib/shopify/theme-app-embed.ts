import {
  REVORA_APP_HANDLE,
  REVORA_REVIEWS_EMBED_BLOCK_HANDLE,
} from "@revora/shared/constants";
import type { Session } from "@shopify/shopify-api";

import {
  isThemesAccessDeniedError,
  sessionHasThemesAccess,
} from "@/lib/shopify/scopes";
import { getShopify } from "@/lib/shopify/shopify";

const MAIN_THEME_QUERY = `#graphql
  query RevoraMainTheme {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
        name
      }
    }
  }
`;

const THEME_FILES_QUERY = `#graphql
  query RevoraThemeFiles($themeId: ID!) {
    theme(id: $themeId) {
      files(
        filenames: ["config/settings_data.json", "templates/product.json"]
        first: 2
      ) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
          }
        }
      }
    }
  }
`;

interface ThemeFileNode {
  body?: {
    content?: string;
  };
  filename?: string;
}

interface ThemeFilesResponse {
  theme?: {
    files?: {
      nodes?: ThemeFileNode[];
    };
  };
}

interface MainThemeResponse {
  themes?: {
    nodes?: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface RevoraStorefrontWidgetStatus {
  checked: boolean;
  enabled: boolean;
  scopeUpgradeRequired: boolean;
  themeName: string | null;
}

function stripJsonComments(raw: string) {
  return raw.replace(/\/\*[\s\S]*?\*\//, "").trim();
}

function parseThemeJson(raw: string | undefined) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(stripJsonComments(raw)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isEnabledThemeBlock(block: Record<string, unknown>) {
  return block.disabled !== true;
}

export function matchesRevoraBlockType(type: unknown, apiKey: string) {
  if (typeof type !== "string") {
    return false;
  }

  const normalized = type.toLowerCase();
  if (!normalized.startsWith("shopify://apps/")) {
    return false;
  }

  const markers = [
    apiKey.toLowerCase(),
    REVORA_APP_HANDLE,
    "revora-reviews",
    "revora/blocks/",
    "revora-reviews/blocks/",
    "/apps/revora",
  ];

  return markers.some((marker) => normalized.includes(marker));
}

function isRevoraEmbedBlockType(type: string) {
  const normalized = type.toLowerCase();
  return (
    normalized.includes(`/blocks/${REVORA_REVIEWS_EMBED_BLOCK_HANDLE}`) ||
    normalized.includes("/blocks/reviews-embed")
  );
}

function isRevoraProductBlockType(type: string) {
  const normalized = type.toLowerCase();
  return (
    normalized.includes("/blocks/reviews/") ||
    normalized.includes("/blocks/reviews-summary")
  );
}

function isEnabledRevoraThemeBlock(
  block: Record<string, unknown>,
  apiKey: string,
  blockMatcher: (type: string) => boolean
) {
  const type = block.type;
  return (
    typeof type === "string" &&
    isEnabledThemeBlock(block) &&
    matchesRevoraBlockType(type, apiKey) &&
    blockMatcher(type)
  );
}

function collectThemeBlocks(
  blocks: Record<string, Record<string, unknown>> | undefined
): Record<string, unknown>[] {
  if (!blocks) {
    return [];
  }

  const collected: Record<string, unknown>[] = [];

  for (const block of Object.values(blocks)) {
    collected.push(block);

    const nestedBlocks = block.blocks;
    if (nestedBlocks && typeof nestedBlocks === "object") {
      collected.push(
        ...collectThemeBlocks(
          nestedBlocks as Record<string, Record<string, unknown>>
        )
      );
    }
  }

  return collected;
}

function resolveSettingsBlocks(
  settingsData: Record<string, unknown> | null
): Record<string, Record<string, unknown>> | null {
  const current = settingsData?.current;
  if (current && typeof current === "object") {
    const blocks = (current as Record<string, unknown>).blocks;
    if (blocks && typeof blocks === "object") {
      return blocks as Record<string, Record<string, unknown>>;
    }
  }

  const presets = settingsData?.presets;
  if (!presets || typeof presets !== "object") {
    return null;
  }

  const presetName = typeof current === "string" ? current : "Default";
  const preset = (presets as Record<string, Record<string, unknown>>)[
    presetName
  ];
  const blocks = preset?.blocks;
  if (blocks && typeof blocks === "object") {
    return blocks as Record<string, Record<string, unknown>>;
  }

  return null;
}

export function hasEnabledAppEmbed(
  settingsData: Record<string, unknown> | null,
  apiKey: string
) {
  const blocks = resolveSettingsBlocks(settingsData);
  if (!blocks) {
    return false;
  }

  return collectThemeBlocks(blocks).some((block) =>
    isEnabledRevoraThemeBlock(
      block as Record<string, unknown>,
      apiKey,
      isRevoraEmbedBlockType
    )
  );
}

export function hasEnabledProductAppBlock(
  productTemplate: Record<string, unknown> | null,
  apiKey: string
) {
  const sections = productTemplate?.sections;
  if (!sections || typeof sections !== "object") {
    return false;
  }

  for (const section of Object.values(
    sections as Record<string, Record<string, unknown>>
  )) {
    const blocks = section?.blocks as
      | Record<string, Record<string, unknown>>
      | undefined;

    for (const block of collectThemeBlocks(blocks)) {
      if (
        isEnabledRevoraThemeBlock(
          block as Record<string, unknown>,
          apiKey,
          isRevoraProductBlockType
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function isRevoraStorefrontWidgetEnabled(
  settingsData: Record<string, unknown> | null,
  productTemplate: Record<string, unknown> | null,
  apiKey: string
) {
  return (
    hasEnabledAppEmbed(settingsData, apiKey) ||
    hasEnabledProductAppBlock(productTemplate, apiKey)
  );
}

export async function getRevoraStorefrontWidgetStatus(
  session: Session,
  apiKey: string
): Promise<RevoraStorefrontWidgetStatus> {
  const hasScopes = sessionHasThemesAccess(session);

  console.log("[theme-embed] check start", {
    shop: session.shop,
    hasScopes,
    sessionScopes: session.scope,
    apiKeySet: Boolean(apiKey),
  });

  if (!hasScopes) {
    console.warn(
      "[theme-embed] returning enabled=false — session lacks read_themes scope. Merchant must re-authorize the app."
    );
    return {
      enabled: false,
      themeName: null,
      checked: false,
      scopeUpgradeRequired: true,
    };
  }

  const shopify = getShopify();
  const admin = new shopify.clients.Graphql({ session });

  try {
    const mainThemeResponse = await admin.request(MAIN_THEME_QUERY);
    const mainTheme = (mainThemeResponse.data as MainThemeResponse)?.themes
      ?.nodes?.[0];

    console.log("[theme-embed] main theme", mainTheme);

    if (!mainTheme?.id) {
      console.warn("[theme-embed] no main theme found");
      return {
        enabled: false,
        themeName: null,
        checked: true,
        scopeUpgradeRequired: false,
      };
    }

    const filesResponse = await admin.request(THEME_FILES_QUERY, {
      variables: { themeId: mainTheme.id },
    });

    const fileNodes =
      (filesResponse.data as ThemeFilesResponse)?.theme?.files?.nodes ?? [];

    console.log(
      "[theme-embed] file nodes",
      fileNodes.map((n) => ({
        filename: n.filename,
        hasContent: Boolean(n.body?.content),
        contentLength: n.body?.content?.length ?? 0,
      }))
    );

    const settingsData = parseThemeJson(
      fileNodes.find((node) => node.filename === "config/settings_data.json")
        ?.body?.content
    );
    const productTemplate = parseThemeJson(
      fileNodes.find((node) => node.filename === "templates/product.json")?.body
        ?.content
    );

    console.log(
      "[theme-embed] parsed settings_data keys",
      settingsData ? Object.keys(settingsData) : null
    );
    console.log(
      "[theme-embed] current type",
      typeof settingsData?.current,
      Array.isArray(settingsData?.current) ? "array" : ""
    );

    const blocks = resolveSettingsBlocks(settingsData);
    const allBlocks = blocks ? collectThemeBlocks(blocks) : [];
    console.log(
      "[theme-embed] resolved blocks",
      allBlocks.map((b) => ({ type: b.type, disabled: b.disabled }))
    );

    const embedEnabled = hasEnabledAppEmbed(settingsData, apiKey);
    const productBlockEnabled = hasEnabledProductAppBlock(
      productTemplate,
      apiKey
    );

    console.log("[theme-embed] results", { embedEnabled, productBlockEnabled });

    const enabled = embedEnabled || productBlockEnabled;

    return {
      enabled,
      themeName: mainTheme.name,
      checked: true,
      scopeUpgradeRequired: false,
    };
  } catch (error) {
    if (isThemesAccessDeniedError(error)) {
      console.warn("[theme-embed] themes access denied", error);
      return {
        enabled: false,
        themeName: null,
        checked: false,
        scopeUpgradeRequired: true,
      };
    }

    console.warn("[theme-embed] check failed", error);
    return {
      enabled: false,
      themeName: null,
      checked: false,
      scopeUpgradeRequired: false,
    };
  }
}
