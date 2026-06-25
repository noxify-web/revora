-- Extends ExtensionToken with rolling expiry + first-verify pairing signal,
-- and drops the unused ConnectCode table (the REVORA1. pairing-code flow was
-- never wired up and has been removed).
ALTER TABLE `ExtensionToken` ADD `expiresAt` text;--> statement-breakpoint
ALTER TABLE `ExtensionToken` ADD `pairedAt` text;--> statement-breakpoint
ALTER TABLE `ExtensionToken` ADD `extensionId` text;--> statement-breakpoint
-- Backfill pairedAt for tokens that were already verified (lastUsedAt set)
-- before this column existed, so the dashboard keeps showing them connected.
UPDATE `ExtensionToken` SET `pairedAt` = `lastUsedAt` WHERE `pairedAt` IS NULL AND `revokedAt` IS NULL AND `lastUsedAt` IS NOT NULL;--> statement-breakpoint
DROP TABLE `ConnectCode`;
