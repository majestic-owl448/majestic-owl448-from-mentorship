# Stamp Inventory Implementation Plan

## Current repository baseline

The repository currently contains:

- Next.js 16 App Router with React 19 and TypeScript.
- Tailwind CSS 4.
- SuperTokens authentication with Google and Apple.
- Prisma 7 connected to a local SQLite file.
- A protected placeholder dashboard.
- A generic authenticated data route that reads and creates database users.
- Vitest and ESLint configuration.

At the time of planning, the production build passes. Lint fails on three React effect patterns, and the test command fails because one suite contains no tests. The only passing test writes and deletes a Prisma user in the configured database.

The implementation should keep each phase in an atomic conventional commit. Schema migrations and their matching application changes belong in the same feature phase unless splitting them leaves both commits runnable.

## Phase 1: Repair the baseline

Suggested commit:

```text
chore: restore passing project checks
```

Work:

1. Fix the React effect lint errors in the authentication components.
2. Remove the empty `combRep` test and unused helper unless the future postage-combination feature is intentionally retained. If retained, add real unit tests without connecting it to the inventory release.
3. Configure database tests to use a disposable test database.
4. Replace the generated home-page text and metadata with inventory product copy.
5. Confirm `pnpm lint`, `pnpm test --run`, and `pnpm build` pass.

Exit condition: all existing checks pass before inventory tables are introduced.

## Phase 2: Configure persistent storage

Suggested commit:

```text
chore(db): configure persistent database
```

SQLite is suitable for local development but not for persistent deployment on the target described in the repository README. Select the production database before storing user inventories.

Work:

1. Choose and provision the hosted database.
2. Update the Prisma datasource and driver adapter.
3. Keep local and test database configuration separate from production.
4. Add migration and deployment commands to the README.
5. Verify a clean database can apply every migration from the beginning.

Exit condition: local development, isolated tests, and the production target each have documented database configuration.

## Phase 3: Connect authentication to application profiles

Suggested commits:

```text
feat(auth): persist user profiles and roles
feat(settings): require initial country settings
feat(settings): support multiple country settings
```

Add:

```text
UserProfile
  id                       String primary key, SuperTokens primary user ID
  email                    String nullable
  role                     USER or MODERATOR
  activeCountrySettingId   String nullable until initial settings are saved
  createdAt
  updatedAt

UserCountrySetting
  id
  userId
  countryCode
  displayCurrencyCode
  timeZone
  timeZoneMode             SYSTEM or CUSTOM
  createdAt
  updatedAt

unique(userId, countryCode)
```

Work:

1. Replace the unrelated numeric Prisma user with a profile keyed by the SuperTokens primary user ID.
2. Create or update the profile from authenticated server-side code.
3. Add the minimum settings flow for country, display currency, and timezone. Block inventory routes until the first country setting exists.
4. Offer the browser's IANA timezone as the system-derived default and allow a custom timezone per country setting.
5. Let the user add country settings and select one active setting.
6. Add a server-side moderator-role guard.
7. Remove the generic `/api/data` route.
8. Keep `/api/me` limited to authenticated profile information.

Tests:

- A missing session receives `401`.
- A profile is associated with the session user ID.
- A supplied client user ID is ignored or rejected.
- A normal user cannot call moderator endpoints.
- The first country setting becomes active.
- Country settings are isolated by user and unique by user plus country.
- The active setting belongs to the authenticated user.
- Invalid country, currency, and IANA timezone values are rejected.

## Phase 4: Manage linked social logins

Suggested commit:

```text
feat(auth): manage linked social logins
```

Use SuperTokens manual account linking. Keep automatic same-email linking disabled.

Settings operations:

```text
GET    /api/settings/logins
POST   /api/settings/logins/:provider/link
DELETE /api/settings/logins/:recipeUserId
```

The link operation starts from an authenticated session and binds the new provider OAuth state to that session. After provider authentication succeeds, make the existing user primary when needed and link the new recipe user to that primary ID. Reject a provider identity that already belongs to another primary user.

The removal operation requires at least two linked methods and recent authentication through a different linked method. Unlink and remove the selected recipe identity, revoke existing sessions, and create the replacement session through the confirming method. The application profile continues to use the same primary user ID.

Tests:

- Link a Google identity to an account created with Apple and retain one profile and inventory owner ID.
- Do not link two accounts merely because their emails match.
- Leave the account unchanged after a cancelled or failed provider flow.
- Reject an identity already linked to another primary user.
- Reject removal of the only login method.
- Reject removal when confirmation used the method being removed.
- Remove one method after authentication through another linked method.
- Revoke old sessions and preserve access through the remaining method.
- Prevent one user from listing, linking, or removing another user's login methods.

## Phase 5: Add reference and scheduling tables

Suggested commit:

```text
feat(valuation): add shared value schedules
```

Initial entities:

```text
Currency
  code
  displayName

ValueSchedule
  id
  countryCode
  currencyCode
  createdAt
  updatedAt

ValueScheduleValue
  id
  valueScheduleId
  amount
  effectiveOn nullable
  moderationStatus
  proposerId nullable
  createdAt

NamedFaceValue
  id
  countryCode
  displayCode
  normalizedCode
  valueScheduleId
  moderationStatus
  proposerId nullable
  createdAt
  updatedAt

CurrencyConversion
  id
  fromCurrencyCode
  toCurrencyCode
  multiplier
  effectiveOn nullable
  moderationStatus
  proposerId nullable
  createdAt
  updatedAt
```

Constraints:

- Approved named definitions are unique by country and normalized code.
- Amounts and multipliers are non-negative decimals; conversion multipliers must be greater than zero.
- Effective dates are date-only values.
- A value schedule's values use the schedule currency.
- A pending value is associated with its proposer.

Do not add a postage-rate catalog in this phase. A later `PostageRate` table will reference `ValueSchedule`. Named face values and formally linked postage rates will stay synchronized because neither owns a copied amount.

Tests:

- Country and code normalization.
- Duplicate approved-definition rejection.
- Decimal storage and serialization.
- Current and upcoming resolution in different IANA timezones.
- Approved data visibility.
- Pending data visibility only to its proposer.

## Phase 6: Implement the valuation service

Suggested commit:

```text
feat(valuation): calculate current stamp values
```

Create server-only functions rather than calculating money in React components:

```text
resolveNamedValue(namedFaceValueId, userId, localDate)
resolveConversion(fromCurrency, toCurrency, userId, localDate)
calculateStampValue(stamp, activeCountrySetting, resolvedValue)
findUpcomingValue(namedFaceValueId, userId, localDate)
```

Resolution rules:

1. Return zero with `OUTSIDE_ACTIVE_COUNTRY` when the stamp country differs from the active country.
2. Include approved entries and pending entries belonging to the current user.
3. Select the latest entry whose effective date is absent or no later than the active country setting's local date.
4. Prefer the user's eligible pending proposal when it conflicts with the approved value for the same effective date.
5. Find the next eligible future entry for advance notice.
6. Display the next entry when it is no more than 10 calendar days away.
7. Use the current value for totals until the effective date arrives.

The service accepts an explicit active country setting and local date for deterministic tests. The inventory route supplies today's date in that setting's saved timezone. There is no date selector in the user interface.

Use a decimal library or the database client's decimal type for every calculation. Convert to strings at the API boundary and format only at the presentation layer.

Tests must cover:

- Home-currency identity conversion.
- Fixed currency conversion.
- Named/code resolution.
- Pending and approved precedence.
- Future values before, during, and after the notice window.
- Date changes at timezone boundaries.
- Country mismatch even when both countries use the same currency.
- Active-country switching without inventory rewrites.
- Zero and fractional monetary values without floating-point artifacts.

## Phase 7: Add moderation workflows

Suggested commits:

```text
feat(moderation): add valuation proposals
feat(moderation): add proposal review tools
```

Add proposal and audit entities or extend the reference entities with a separate immutable proposal payload. A proposal must preserve exactly what the user submitted even if the approved record later changes.

API operations:

- Submit a named/code definition.
- Submit a current value.
- Submit a future scheduled value.
- Submit a fixed currency conversion.
- List the current user's proposals.
- List the moderator queue.
- Approve a proposal.
- Reject a proposal.
- Merge a duplicate proposal.

Approval behavior:

- Run the shared-data update and proposal-status update in one transaction.
- Link the proposer's pending definition to the approved definition.
- Preserve stamp references.
- Make approved data visible to every user.
- Record moderator, decision time, and decision note.
- Allow the proposer reference on approved shared records and retained moderation history to become null after account deletion.

Merge behavior:

- Select the existing canonical definition or schedule.
- Repoint the proposer's references inside the transaction.
- Mark the proposal `MERGED`.
- Reject a merge that would create incompatible country, currency, or effective-date data.

The rejected-proposal behavior in the PRD must be decided before completing this phase.

Moderator interface:

- Queue filtered by proposal type and status.
- Submitted source and proposed values.
- Existing possible matches.
- Approve, reject, and merge actions with confirmation.
- Decision note.

Tests must exercise authorization, duplicate handling, transaction rollback, and pending-data visibility after every decision type.

## Phase 8: Add stamp inventory persistence and APIs

Suggested commit:

```text
feat(stamps): add user-owned inventory endpoints
```

Add:

```text
StampInventoryEntry
  id
  userId
  countryCode
  name
  yearOfIssue nullable
  faceValueType       MONETARY, NAMED, or NONE
  faceAmount nullable
  faceCurrencyCode nullable
  namedFaceValueId nullable
  manualPostageAmount nullable
  manualPostageCurrencyCode nullable
  quantityOwned
  quantityAnnulled
  expired
  createdAt
  updatedAt
```

Enforce type-specific fields in shared request validation and with database constraints supported by the selected database.

API routes:

```text
GET    /api/stamps
POST   /api/stamps
PATCH  /api/stamps/:id
DELETE /api/stamps/:id
GET    /api/settings
PATCH  /api/settings
POST   /api/settings/countries
PATCH  /api/settings/countries/:id
POST   /api/settings/countries/:id/activate
```

Every stamp query includes the session user ID. Updates and deletions for records outside that ownership boundary return `404`.

The list response includes:

- Raw inventory fields.
- Active country and active display currency.
- Resolved current unit value.
- Usable quantity.
- Total postage value.
- Upcoming named/code value when it falls inside the notice window.
- An explanation of whether the value came from face amount, conversion, named schedule, manual entry, annulled status, or expired status.

Tests:

- Create each face-value type.
- Reject invalid field combinations.
- Accept postage value zero.
- Reject negative amounts.
- Enforce owned and annulled quantity constraints.
- Apply expired and annulled zero-value rules.
- Edit quantity and remove an entry.
- Prevent cross-user read, update, and deletion.
- Recalculate after conversion and schedule changes.
- Preserve the currency of a manual value when a country setting's display currency changes.
- Require a country on every stamp and require named/code references to match it.
- Return zero with `OUTSIDE_ACTIVE_COUNTRY` for stamps from other countries.
- Recalculate values when the user switches active country without rewriting inventory entries.

## Phase 9: Build proposal interfaces

Suggested commits:

```text
feat(valuation): add named value and conversion proposals
```

Named/code selector:

- Country selector.
- Search by display or normalized code.
- Approved results.
- The current user's pending results.
- Form to propose a missing definition or value.
- Current and upcoming values with effective dates.

Proposal forms must explain that pending data is private to the proposer until approved.

## Phase 10: Build the inventory interface

Suggested commits:

```text
feat(stamps): add inventory creation form
feat(stamps): add inventory list controls
```

Add-stamp flow:

1. Select the stamp country, defaulting to the active country.
2. Enter a stamp name.
3. Optionally enter the year of issue.
4. Select monetary, named/code, or no face value.
5. Enter the fields for that type.
6. Enter quantity owned and quantity annulled.
7. Set expired when applicable.
8. Preview the resolved unit and total postage value.
9. Save the entry.

Inventory list:

- Name and optional year.
- Stamp country.
- Face value.
- Owned, annulled, and usable quantities.
- Expired indicator.
- Current unit value.
- Line total.
- Upcoming value and effective date within the notice window.
- Edit quantity and status controls.
- Remove action with confirmation.
- Overall total in the active country's display currency.
- A zero-value explanation for entries outside the active country.

The interface must use `annulled`; it must not label cancelled stamps as `used`.

## Phase 11: Add JSON user data export

Suggested commit:

```text
feat(settings): add user data export
```

Add an authenticated `GET /api/account/export` endpoint that returns one JSON attachment with `Cache-Control: no-store`. Give the document an explicit schema version and generation time. Serialize decimals and date-only values as strings.

The export service gathers:

- SuperTokens primary-user metadata and every linked login method exposed to the application, excluding tokens and provider secrets.
- Profile, country settings, inventory, and private valuation records.
- Every proposal submitted by the user, regardless of status.
- Shared definitions, schedule values, conversions, and later postage-rate records that retain a contributor link to the user.
- Moderation and audit entries that refer to the user as proposer, affected account, or moderator.

Do not expose another user's private ID or email through a shared moderation record. Keep record identifiers and non-private decision data so relationships in the export remain understandable.

Maintain one export mapping for every table with a user foreign key or stored authentication ID. Add a schema coverage test that fails when a new user-linked table or field has neither an export mapping nor an explicit secret exclusion.

Tests:

- Reject an unauthenticated export request.
- Return parseable JSON with an attachment filename, schema version, and generation time.
- Prevent browser and intermediary caching through the response headers.
- Include fixtures for every user-owned and user-linked record type.
- Include approved and merged contributions without changing the shared records.
- Include moderation entries linked to the user as proposer and moderator.
- Preserve decimal and date-only strings exactly.
- Exclude sessions, tokens, secrets, password material, and another user's private account fields.
- Prevent one user from exporting another user's private data.

## Phase 12: Add account deletion

Suggested commit:

```text
feat(settings): add account deletion
```

Add an authenticated `DELETE /api/account` operation with explicit confirmation. Treat deletion as an idempotent workflow because application records and the SuperTokens identity cannot be deleted in one database transaction.

Workflow:

1. Create an account-deletion job and mark the profile as deleting.
2. Revoke sessions and block further application access for that profile.
3. In a database transaction, delete inventory, country settings, pending and rejected proposals, and other private user-owned values.
4. Preserve approved and merged shared records while setting proposer and other direct user references to null.
5. Delete every linked SuperTokens recipe user and the primary user.
6. Retry any failed external step without recreating deleted private data.
7. Remove the profile and deletion job after every required deletion succeeds.

Database foreign keys must use deliberate deletion behavior. User-owned records cascade from the profile. Shared and audit records use nullable contributor references rather than cascading deletion. Do not put the user's email or authentication ID into preserved proposal payloads or audit text.

Tests:

- Delete the authentication identity, profile, country settings, inventory, and private proposal data.
- Preserve approved and merged definitions, schedules, conversions, and their source information.
- Remove the deleted user's identity from preserved shared data and moderation history.
- Leave every other user's data unchanged.
- Reject account access while deletion is incomplete.
- Retry an interrupted SuperTokens deletion without duplicating work or failing on already-removed records.

## Phase 13: Verification and deployment

Suggested commits:

```text
test: cover authenticated inventory workflows
chore: document production deployment
```

Automated verification:

- Unit tests for normalization, date resolution, and decimal calculations.
- API tests for authentication, ownership, validation, and moderation.
- Component tests for conditional face-value fields and quantity controls.
- Browser tests covering sign-in, required first-run settings, active-country switching, proposal submission, stamp creation, editing, and deletion.
- Browser tests covering explicit login linking, removal through a different linked login, and last-login protection.
- Browser tests covering a JSON data export with private, shared, and moderation records.
- Browser tests covering account-deletion confirmation and rejection of the deleted session.
- Two-account tests proving inventory and pending-proposal isolation.
- Migration test from an empty database.

Deployment work:

1. Configure production database credentials.
2. Configure SuperTokens production domains.
3. Replace demo social credentials with production Google and Apple applications.
4. Run migrations before serving the new application version.
5. Add CI jobs for lint, tests, build, and migration checks.
6. Test a preview deployment with a normal account and a moderator account.
7. Document backup, restore, and moderator-role assignment.

Release verification:

- All acceptance criteria in the PRD pass.
- The production database persists inventory across deployments.
- A moderator decision changes only the intended shared definition or schedule.
- A scheduled change activates according to each test user's local date.
- No inventory or pending proposal crosses user boundaries.

## Recommended delivery order

Phases 1 through 6 establish profiles, login management, shared data, and the valuation engine. Phase 7 adds moderation before users depend on shared data. Phases 8 through 10 deliver the inventory workflow. Phase 11 adds data export after every user-linked record type exists. Phase 12 adds account deletion after export is available. Phase 13 verifies the complete authenticated flow and prepares deployment.

Do not add postage-combination logic, a planned-mailing-date selector, a postage-rate catalog, or collection valuation while implementing these phases. Those features require separate product requirements.
