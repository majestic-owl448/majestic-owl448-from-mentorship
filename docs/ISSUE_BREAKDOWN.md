# Proposed Issue Breakdown

## Purpose

This document turns the product requirements and implementation plan into proposed issues. Each issue delivers one observable capability with its own acceptance tests. An issue listed under **Prerequisites** must be closed before work starts on the dependent issue.

The numbers are local references for planning. Replace them with GitHub issue numbers when the issues are created.

## Dependency summary

| Issue | Capability | Prerequisites |
| ---: | --- | --- |
| 1 | Reliable local checks | None |
| 2 | Persistent application database | 1 |
| 3 | Authenticated application profile | 2 |
| 4 | Required first country setting | 3 |
| 5 | Multiple country settings and active selection | 4 |
| 6 | Approved fixed currency conversion | 4 |
| 7 | Approved named/code face value | 4 |
| 8 | Future named/code value resolution | 4, 7 |
| 9 | Add and view a monetary-face-value stamp | 3, 4, 6 |
| 10 | Add and view a named/code-face-value stamp | 3, 4, 7 |
| 11 | Add and view a manual-value stamp | 3, 4 |
| 12 | Active-country inventory postage totals | 5, 9, 10, 11 |
| 13 | Owned and annulled quantity editing | 12 |
| 14 | Expired stamp handling | 12 |
| 15 | Inventory entry removal | 12 |
| 16 | Pending named/code proposal use | 4, 8, 10 |
| 17 | Pending fixed-conversion proposal use | 6, 9 |
| 18 | Moderator proposal queue | 3, 16, 17 |
| 19 | Proposal approval | 8, 12, 18 |
| 20 | Duplicate proposal merging | 18, 19 |
| 21 | Proposal rejection | 18 and product decision R1 |
| 22 | Upcoming value notice in inventory | 8, 10, 12, 16 |
| 23 | Continuous integration checks | 1, 2 |
| 24 | Persistent preview deployment | 4, 5, 12, 13, 14, 15, 19, 20, 21, 22, 23 |

Issues 6 and 7 can proceed in parallel. Issues 9, 10, and 11 can also proceed in parallel after their prerequisites close. The moderation queue waits for both proposal types so its filters and permissions are tested once against the complete proposal set.

## Product decision gate

### R1: Value after proposal rejection

The product has not decided what happens when a moderator rejects a value already used by its proposer. Before Issue 21 starts, choose one behavior:

1. Stop applying the rejected value and fall back to an approved or manual value.
2. Keep the rejected value as private data for that proposer.

This decision does not block proposal submission, the moderator queue, approval, or merging.

## Proposed issues

### Issue 1: Make local project checks reliable

**Prerequisites:** None

**Feature:** A contributor can run the repository's lint, test, and production-build commands and receive a trustworthy pass or failure.

**Scope:**

- Fix the three existing React effect lint errors.
- Remove the empty test suite.
- Remove the unused combination helper, or retain it with focused tests and no inventory integration.
- Give database tests a disposable database instead of the developer's application database.
- Replace starter metadata and home-page copy with the stamp inventory product identity.

**Acceptance tests:**

- `pnpm lint` exits successfully.
- `pnpm test --run` exits successfully and runs at least one real assertion per retained suite.
- `pnpm build` exits successfully.
- A database test cannot add, change, or remove a record from the configured development database.

### Issue 2: Persist application data in a deployable database

**Prerequisites:** Issue 1

**Feature:** Application records survive a deployment and can be recreated from committed migrations.

**Scope:**

- Select and configure the hosted database used by the deployment target.
- Update the Prisma provider and adapter.
- Keep development, test, and production connections separate.
- Document migration and connection setup.

**Acceptance tests:**

- Every migration applies to an empty database in order.
- The application can create and read a smoke-test record through Prisma.
- A test database reset does not affect development or production data.
- A record created before an application restart remains afterward.

### Issue 3: Persist a profile for the authenticated user

**Prerequisites:** Issue 2

**Feature:** A signed-in SuperTokens user has one application profile keyed by their authentication ID.

**Scope:**

- Replace the unrelated numeric user model with `UserProfile`.
- Create or update the profile from the server-side session.
- Store email as optional profile data.
- Add `USER` and `MODERATOR` roles.
- Remove the generic user data API.

**Acceptance tests:**

- The first authenticated profile request creates one profile with the SuperTokens user ID.
- Later requests reuse the same profile.
- A client-supplied owner ID cannot create or access another profile.
- An unauthenticated request returns `401`.
- A request for another user's private record returns `404`.

### Issue 4: Require the first country setting

**Prerequisites:** Issue 3

**Feature:** A newly authenticated user saves the minimum settings required for inventory valuation: country, display currency, and timezone.

**Scope:**

- Add `UserCountrySetting` with country, display currency, IANA timezone, and `SYSTEM` or `CUSTOM` timezone mode.
- Add the authenticated first-run settings form and API.
- Offer the browser's IANA timezone as the system-derived initial value.
- Make the first country setting active and block inventory routes until it exists.

**Acceptance tests:**

- A valid country, currency, and timezone selection persists across sign-out and sign-in.
- The first setting becomes active without a second request.
- Inventory routes reject or redirect a user whose required settings are incomplete.
- The system option saves the IANA timezone reported by the browser.
- A custom valid IANA timezone can replace the system-derived value.
- An invalid or unsupported currency code receives a field error.
- An invalid country code or timezone receives a field error.
- One user's selection does not alter another user's profile.

### Issue 5: Manage multiple country settings and select the active country

**Prerequisites:** Issue 4

**Feature:** A user can save settings for more than one country and choose which country controls current postage valuation.

**Scope:**

- Add, list, and edit user-owned country settings.
- Enforce one setting per user and country.
- Give each country its own display currency and system-derived or custom timezone.
- Add an active-country selector.

**Acceptance tests:**

- A second country can be added without changing the first setting.
- Duplicate country settings for one user are rejected.
- Editing one country's currency or timezone does not alter another country.
- The active selection persists across sessions.
- A user cannot activate another user's country setting.
- The active setting's saved timezone, rather than the server timezone, supplies the local date.

### Issue 6: Resolve an approved fixed currency conversion

**Prerequisites:** Issue 4

**Feature:** A monetary face value in another currency can be expressed in the active country's display currency through an approved fixed conversion.

**Scope:**

- Add currency and fixed-conversion records.
- Store the multiplier as an exact decimal.
- Resolve the identity conversion when the two currencies match.
- Resolve an approved source-to-target conversion when they differ.

**Acceptance tests:**

- A face amount in the active country's display currency is returned unchanged.
- A face amount in another currency is multiplied by the approved rate.
- Decimal multiplication does not introduce binary floating-point artifacts.
- A missing conversion returns a typed unresolved result rather than silently using `1`.
- Stamp validity is not inferred from the currency conversion.

### Issue 7: Resolve an approved named/code face value

**Prerequisites:** Issue 4

**Feature:** A country-specific name or code resolves to the approved value in its shared value schedule.

**Scope:**

- Add `NamedFaceValue`, `ValueSchedule`, and `ValueScheduleValue`.
- Normalize names and codes for lookup while preserving display text.
- Enforce approved uniqueness by country and normalized name/code.
- Return the schedule amount and currency.

**Acceptance tests:**

- `IT` plus `B Zona 1` resolves independently from the same text in another country.
- Lookup is insensitive to the normalization rules chosen by the implementation.
- Display capitalization remains unchanged.
- Two approved definitions cannot share the same country and normalized code.
- The amount comes from the schedule and is not copied onto the named definition.

### Issue 8: Resolve future named/code value changes by local date

**Prerequisites:** Issues 4 and 7

**Feature:** A named/code schedule switches to a future amount on its effective date in the active country setting's timezone.

**Scope:**

- Store `effectiveOn` as a calendar date.
- Derive current and upcoming states for a supplied user and local date.
- Return the next eligible change and days until it applies.
- Keep former values out of the user-facing product history after transition cleanup.

**Acceptance tests:**

- `B Zona 1` resolves to `1.35 EUR` through September 30, 2028 in the active Italy setting's timezone.
- It resolves to `1.40 EUR` from October 1, 2028 in that timezone.
- At the same instant, users on opposite sides of the date boundary can resolve different current values.
- The future amount is reported as upcoming no more than 10 calendar days before its date.
- The current amount remains the calculation value before the effective date.

### Issue 9: Add and view a stamp with a monetary face value

**Prerequisites:** Issues 3, 4, and 6

**Feature:** A user can add an owned stamp with a monetary face amount and see its resolved unit postage value.

**Scope:**

- Add the inventory model and authenticated create/list endpoints.
- Support stamp country, name, optional year, monetary amount, face currency, owned quantity, annulled quantity, and expired flag.
- Connect monetary valuation to the fixed-conversion resolver.

**Acceptance tests:**

- A user can add and retrieve a stamp in the active country's display currency.
- Country is required even when the monetary face currency is shared by several countries.
- A user can add and retrieve a stamp using an approved conversion.
- Year of issue can be absent.
- Invalid decimals and non-positive owned quantities receive field errors.
- The list contains only the authenticated user's stamps.

### Issue 10: Add and view a stamp with a named/code face value

**Prerequisites:** Issues 3, 4, and 7

**Feature:** A user can select an approved country-specific name/code while adding a stamp and see its resolved unit postage value.

**Scope:**

- Add named/code search by country and text.
- Store a reference to `NamedFaceValue` on the inventory entry.
- Store the named definition's country on the inventory entry and reject a country mismatch.
- Use the referenced schedule for valuation.

**Acceptance tests:**

- The form requires a country before named/code selection.
- Selecting `IT` and `B Zona 1` stores its named-face-value ID rather than a copied amount.
- Editing the schedule changes the resolved value without rewriting the stamp record.
- A named-face-value ID from an unavailable pending definition cannot be submitted by another user.

### Issue 11: Add and view a stamp with a manual postage value

**Prerequisites:** Issues 3 and 4

**Feature:** A user can record a stamp whose postage value cannot be resolved from a face value.

**Scope:**

- Support face-value type `NONE`.
- Require the stamp country.
- Store a manual postage amount and its currency.
- Permit zero for stamps with no postal value.

**Acceptance tests:**

- A stamp without a face value can be saved with a manual amount and currency.
- A manual value of zero is accepted.
- A negative value is rejected.
- Changing the country setting's display currency preserves the entered currency instead of relabeling the amount.
- An unresolved manual currency is reported separately from a zero value.

### Issue 12: Show postage totals for the active country

**Prerequisites:** Issues 5, 9, 10, and 11

**Feature:** A user can see every owned stamp while postage values and totals are calculated for the active country.

**Scope:**

- Add the inventory page and value explanation returned by the server.
- Calculate line totals from quantity and unit value.
- Resolve active-country entries into that country's display currency.
- Return zero with `OUTSIDE_ACTIVE_COUNTRY` for every other country's entries.
- Identify unresolved entries without treating them as zero.

**Acceptance tests:**

- Monetary, converted, named/code, and manual entries display their valuation source.
- Line totals use exact decimal multiplication.
- The inventory total equals the sum of resolvable line totals.
- An unresolved entry is labelled and excluded from the total.
- A stamp outside the active country remains visible with unit and line values of zero.
- Two countries that share the same display currency remain separate for postal valuation.
- Switching the active country recalculates both countries' rows and the inventory total without changing stored stamps.
- Two users see independent lists and totals.

### Issue 13: Edit owned and annulled quantities

**Prerequisites:** Issue 12

**Feature:** A user can change how many copies they own and how many of those copies are annulled.

**Scope:**

- Add quantity editing controls and an authenticated update endpoint.
- Calculate usable quantity as owned minus annulled when the stamp is not expired.
- Keep annulled copies in the owned total.

**Acceptance tests:**

- Owned quantity accepts positive integers.
- Annulled quantity accepts every integer from zero through owned quantity.
- Annulled quantity cannot exceed owned quantity.
- Reducing owned quantity below annulled quantity is rejected in one response.
- Annulled copies contribute zero while non-annulled copies retain their unit value.
- A quantity change refreshes the line and inventory totals.

### Issue 14: Mark an inventory stamp as expired

**Prerequisites:** Issue 12

**Feature:** A user can mark a stamp identity as expired so every owned copy has zero postage value.

**Scope:**

- Add the expired control and update behavior.
- Preserve face value, year, and quantities.
- Explain the zero value as expiration.

**Acceptance tests:**

- Marking a stamp expired changes its usable quantity for postage to zero.
- Its line total becomes zero regardless of face-value type or conversion.
- Owned and annulled quantities do not change.
- Removing the expired flag restores valuation from the current applicable rule.
- Expiring one user's entry does not affect another user's matching stamp.

### Issue 15: Remove an inventory entry

**Prerequisites:** Issue 12

**Feature:** A user can remove one stamp entry from their inventory after confirmation.

**Scope:**

- Add an authenticated delete endpoint.
- Add a confirmation step to the inventory interface.
- Refresh totals after deletion.

**Acceptance tests:**

- Confirming removal deletes the selected entry.
- Cancelling leaves it unchanged.
- Deleting an unknown or another user's ID returns `404`.
- Inventory totals no longer include the removed entry.

### Issue 16: Submit and use a pending named/code proposal

**Prerequisites:** Issues 4, 8, and 10

**Feature:** A user can propose a missing named/code definition or value and use the eligible pending value in their own inventory.

**Scope:**

- Add immutable proposal data for named definitions and schedule values.
- Require a source URL or source note.
- Show the user's pending definitions in named/code search.
- Apply an eligible pending value only for its proposer.

**Acceptance tests:**

- The proposer can add a stamp referencing their pending definition.
- Another user cannot see or reference it.
- A pending current value applies immediately to the proposer's stamp.
- A future pending value does not apply before its effective date.
- A future pending value appears to the proposer during the 10-day notice window.
- Proposal status is visible to its proposer.

### Issue 17: Submit and use a pending fixed-conversion proposal

**Prerequisites:** Issues 6 and 9

**Feature:** A user can supply a missing fixed conversion and use it for their own monetary stamps while it awaits moderation.

**Scope:**

- Add immutable fixed-conversion proposals.
- Require a source URL or source note.
- Include the proposer's pending rate in their conversion resolver.
- Hide it from other users.

**Acceptance tests:**

- A missing conversion can be submitted from the monetary-stamp workflow.
- The proposer immediately receives a resolved value from the pending multiplier.
- Another user still receives an unresolved result.
- Invalid or non-positive multipliers are rejected.
- Proposal status is visible to its proposer.

### Issue 18: Let moderators view the proposal queue

**Prerequisites:** Issues 3, 16, and 17

**Feature:** A moderator can list and inspect pending named/code and fixed-conversion proposals.

**Scope:**

- Add the moderator route guard.
- Add queue and proposal-detail endpoints.
- Add queue filters for proposal type and status.
- Display submitted source data and possible approved matches.

**Acceptance tests:**

- A moderator can view both proposal types and their submitted fields.
- A normal user receives `403` from moderator endpoints.
- Queue filters return only matching proposals.
- Proposal detail includes proposer, submission time, source, and proposed values.
- Private inventory data not required for review is absent.

### Issue 19: Let a moderator approve a proposal

**Prerequisites:** Issues 8, 12, and 18

**Feature:** A moderator can approve a proposal and publish its definition, value, or conversion to all users.

**Scope:**

- Add the approve action and decision note.
- Update shared data and proposal status in one transaction.
- Preserve the proposer's inventory references.
- Record moderator and decision time.

**Acceptance tests:**

- Approval makes the proposed data visible to another user.
- A linked stamp resolves through the approved data without being rewritten.
- Approval of a scheduled value does not activate it before its effective local date.
- Approval recalculates affected current inventory values.
- A forced shared-data failure rolls back the proposal status.
- A second approval attempt is rejected without duplicating data.

### Issue 20: Let a moderator merge a duplicate proposal

**Prerequisites:** Issues 18 and 19

**Feature:** A moderator can merge a pending duplicate into an existing approved definition, schedule value, or conversion.

**Scope:**

- Show compatible merge targets.
- Repoint the proposer's references inside a transaction.
- Mark the proposal `MERGED` and record the selected canonical record.

**Acceptance tests:**

- A named/code duplicate can be merged into the approved country and code.
- A conversion duplicate can be merged into the approved currency pair.
- The proposer's stamps retain the same resolved value after the merge.
- Another user sees only the canonical approved record.
- An incompatible country, currency, or effective date cannot be merged.
- A transaction failure leaves all references unchanged.

### Issue 21: Let a moderator reject a proposal

**Prerequisites:** Issue 18 and product decision R1

**Feature:** A moderator can reject a proposal without publishing it as shared data.

**Scope:**

- Add the reject action and required decision note.
- Record moderator and decision time.
- Implement the proposer behavior selected in R1.

**Acceptance tests:**

- Rejection never makes the submitted data global.
- The proposer sees the rejected status and decision note.
- Another user cannot see or use the rejected data.
- The proposer's existing stamps follow the behavior selected in R1.
- A second decision attempt does not alter the completed proposal.

This issue is not ready for implementation until R1 is decided. Its other prerequisites can close first.

### Issue 22: Show an upcoming named/code value in inventory

**Prerequisites:** Issues 8, 10, 12, and 16

**Feature:** An inventory row shows the current and next named/code values when a change is no more than 10 calendar days away.

**Scope:**

- Add upcoming amount and effective date to the inventory response.
- Display both amounts on affected stamp rows.
- Keep the current amount in line and inventory totals until the effective date.

**Acceptance tests:**

- No upcoming notice appears outside the 10-day window.
- The notice appears inside the window with current amount, upcoming amount, and date.
- An eligible pending future value appears only to its proposer.
- Totals continue using the current amount before the date.
- The notice disappears and totals use the new amount on the effective date in the active country setting's timezone.

### Issue 23: Run project checks in continuous integration

**Prerequisites:** Issues 1 and 2

**Feature:** Every proposed code change receives automated lint, test, build, and migration results.

**Scope:**

- Add CI jobs for installation, generated Prisma client, lint, tests, production build, and clean migration application.
- Use an isolated CI database.
- Cache only files that cannot retain application data between runs.

**Acceptance tests:**

- A clean branch passes every CI job.
- A lint error fails the lint job.
- A failing test fails the test job.
- An invalid migration fails the migration job.
- No production credential is required or printed by the workflow.

### Issue 24: Deploy a persistent preview of the inventory release

**Prerequisites:** Issues 4, 5, 12, 13, 14, 15, 19, 20, 21, 22, and 23

**Feature:** A preview deployment supports the complete authenticated inventory and moderation flow with persistent data.

**Scope:**

- Configure the production-shaped database and SuperTokens environment.
- Configure non-demo Google and Apple applications for the preview origin.
- Apply migrations through the documented deployment process.
- Document backup, restore, and moderator-role assignment.

**Acceptance tests:**

- A normal user can sign in, complete the required first settings, add a second country, switch the active country, add each stamp type, edit quantities, expire a stamp, and remove an entry.
- Data remains after a new deployment.
- A second user cannot access the first user's inventory or pending proposals.
- A moderator can approve, merge, and reject proposals.
- Approved data recalculates linked inventory entries.
- Stamps outside the active country remain visible and have postage value zero.
- A scheduled value follows the active country setting's saved timezone.
- Backup and restore instructions recover a test inventory in a non-production environment.

## Suggested GitHub metadata

Use one area label per issue:

- `area: infrastructure`
- `area: auth`
- `area: settings`
- `area: valuation`
- `area: inventory`
- `area: moderation`
- `area: deployment`

Add `blocked` to Issue 21 until R1 is decided. Add a `prerequisite` section to the GitHub issue body using the issue links that replace the local numbers in this proposal.
