-- Drop the unused `SiteSetting` table.
--
-- It was added as a key/JSON store for editable homepage content, then
-- superseded by the richer `SiteContent`, `Outlet` and `DeliveryArea` models
-- that shipped in the same change. Nothing ever wrote to it and no code
-- references it, so dropping it loses no data.
--
-- `IF EXISTS` keeps this idempotent for any environment that never received
-- the table in the first place.
DROP TABLE IF EXISTS "SiteSetting";
