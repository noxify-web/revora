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

function matchesRevoraBlockType(type: unknown, apiKey: string) {
  if (typeof type !== "string") {
    return false;
  }

  const normalized = type.toLowerCase();
  const markers = [
    apiKey.toLowerCase(),
    "revora-reviews",
    "revora/blocks/",
    "revora-reviews/blocks/",
  ];

  return markers.some((marker) => normalized.includes(marker));
}

function hasEnabledAppEmbed(
  settingsData: Record<string, unknown> | null,
  apiKey: string
) {
  const current = settingsData?.current;
  if (!current || typeof current !== "object") {
    return false;
  }

  const blocks = (current as Record<string, unknown>).blocks;
  if (!blocks || typeof blocks !== "object") {
    return false;
  }

  return Object.values(blocks as Record<string, Record<string, unknown>>).some(
    (block) => {
      const type = block.type;
      if (typeof type !== "string" || !isEnabledThemeBlock(block)) {
        return false;
      }

      return (
        matchesRevoraBlockType(type, apiKey) &&
        type.toLowerCase().includes("reviews-embed")
      );
    }
  );
}

function hasEnabledProductAppBlock(
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
    const blocks = section?.blocks;
    if (!blocks || typeof blocks !== "object") {
      continue;
    }

    for (const block of Object.values(
      blocks as Record<string, Record<string, unknown>>
    )) {
      const type = block.type;
      if (
        typeof type === "string" &&
        isEnabledThemeBlock(block) &&
        matchesRevoraBlockType(type, apiKey) &&
        (type.toLowerCase().includes("/blocks/reviews/") ||
          type.toLowerCase().includes("/blocks/reviews-summary"))
      ) {
        return true;
      }
    }
  }

  return false;
}

export async function getRevoraStorefrontWidgetStatus(
  session: Session,
  apiKey: string
): Promise<RevoraStorefrontWidgetStatus> {
  if (!sessionHasThemesAccess(session)) {
    return {
      enabled: false,
      themeName: null,
      checked: false,
    };
  }

  const shopify = getShopify();
  const admin = new shopify.clients.Graphql({ session });

  try {
    const mainThemeResponse = await admin.request(MAIN_THEME_QUERY);
    const mainTheme = (mainThemeResponse.data as MainThemeResponse)?.themes
      ?.nodes?.[0];

    if (!mainTheme?.id) {
      return { enabled: false, themeName: null, checked: true };
    }

    const filesResponse = await admin.request(THEME_FILES_QUERY, {
      variables: { themeId: mainTheme.id },
    });

    const fileNodes =
      (filesResponse.data as ThemeFilesResponse)?.theme?.files?.nodes ?? [];

    const settingsData = parseThemeJson(
      fileNodes.find((node) => node.filename === "config/settings_data.json")
        ?.body?.content
    );
    const productTemplate = parseThemeJson(
      fileNodes.find((node) => node.filename === "templates/product.json")?.body
        ?.content
    );

    const enabled =
      hasEnabledAppEmbed(settingsData, apiKey) ||
      hasEnabledProductAppBlock(productTemplate, apiKey);

    return {
      enabled,
      themeName: mainTheme.name,
      checked: true,
    };
  } catch (error) {
    if (isThemesAccessDeniedError(error)) {
      return {
        enabled: false,
        themeName: null,
        checked: false,
      };
    }

    console.warn("Revora theme embed status check failed", error);
    return { enabled: false, themeName: null, checked: false };
  }
}
