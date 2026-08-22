# Proposed Issue Breakdown

## Purpose

This document turns the product requirements and implementation plan into proposed issues. Each issue delivers one observable capability with its own acceptance tests. An issue listed under **Prerequisites** must be closed before work starts on the dependent issue.

The GitHub issue links below are the authoritative work items for this plan.

## Dependency summary

| Issue | Capability | Prerequisites |
| ---: | --- | --- |
| [#4](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/4) | Reliable local checks | None |
| [#5](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/5) | Persistent application database | [#4](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/4) |
| [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6) | Authenticated application profile | [#5](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/5) |
| [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7) | Required first country setting | [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6) |
| [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8) | Multiple country settings and active selection | [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7) |
| [#9](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/9) | Approved fixed currency conversion | [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7) |
| [#10](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/10) | Approved named/code face value | [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7) |
| [#11](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11) | Future named/code value resolution | [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#10](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/10) |
| [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12) | Add and view a monetary-face-value stamp | [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#9](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/9) |
| [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13) | Add and view a named/code-face-value stamp | [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#10](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/10) |
| [#14](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/14) | Add and view a manual-value stamp | [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7) |
| [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15) | Active-country inventory postage totals | [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13), [#14](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/14) |
| [#16](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/16) | Owned and annulled quantity editing | [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15) |
| [#17](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/17) | Expired stamp handling | [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15) |
| [#18](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/18) | Inventory entry removal | [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15) |
| [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19) | Named/code proposal submission and private use | [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#11](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13) |
| [#20](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20) | Fixed-conversion proposal submission and private use | [#9](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/9), [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12) |
| [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21) | Moderator proposal queue | [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19), [#20](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20) |
| [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22) | Proposal approval | [#11](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21) |
| [#23](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23) | Duplicate proposal merging | [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21), [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22) |
| [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24) | Proposal rejection | [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21) and product decision R1 |
| [#25](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/25) | Upcoming value notice in inventory | [#11](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19) |
| [#26](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/26) | Continuous integration checks | [#4](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/4), [#5](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/5) |
| [#27](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27) | JSON user data export | [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19), [#20](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20), [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21), [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22), [#23](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23), [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24) |
| [#28](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/28) | Account deletion | [#27](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27) |
| [#29](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/29) | Accessibility and localization audit | [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13), [#14](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/14), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#16](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/16), [#17](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/17), [#18](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/18), [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19), [#20](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20), [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21), [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22), [#23](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23), [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24), [#25](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/25), [#27](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27), [#28](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/28) |
| [#30](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/30) | Persistent preview deployment | [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#16](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/16), [#17](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/17), [#18](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/18), [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22), [#23](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23), [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24), [#25](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/25), [#26](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/26), [#27](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27), [#28](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/28), [#29](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/29) |

[#9](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/9) and [#10](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/10) can proceed in parallel. [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13), and [#14](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/14) can also proceed in parallel after their prerequisites close. The moderation queue waits for both proposal types so its filters and permissions are tested once against the complete proposal set.

Accessibility and localization requirements belong to each feature that introduces affected interface elements. [#29](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/29) audits the combined result and fixes gaps that only appear when the complete workflow is tested.

## Product decision gate

### R1: Value after proposal rejection

The product has not decided what happens when a moderator rejects a value already used by its proposer. Before [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24) starts, choose one behavior:

1. Stop applying the rejected value and fall back to an approved or manual value.
2. Keep the rejected value as private data for that proposer.

This decision does not block proposal submission, the moderator queue, approval, or merging.

## Proposed issues

### [#4: Make local project checks reliable](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/4)

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

### [#5: Persist application data in a deployable database](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/5)

**Prerequisites:** [#4](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/4)

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

### [#6: Persist a profile for the authenticated user](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6)

**Prerequisites:** [#5](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/5)

**Feature:** A signed-in SuperTokens user has one application profile keyed by their primary user ID.

**Scope:**

- Replace the unrelated numeric user model with `UserProfile`.
- Create or update the profile from the server-side session.
- Store email as optional profile data.
- Add `USER` and `MODERATOR` roles.
- Remove the generic user data API.

**Acceptance tests:**

- The first authenticated profile request creates one profile with the SuperTokens primary user ID.
- Later requests reuse the same profile.
- A client-supplied owner ID cannot create or access another profile.
- An unauthenticated request returns `401`.
- A request for another user's private record returns `404`.

### [#7: Require the first country setting](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7)

**Prerequisites:** [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6)

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
- Every field has a visible label and associated error text, and the form can be completed with a keyboard.

### [#8: Manage multiple country settings and select the active country](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8)

**Prerequisites:** [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7)

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
- Country-setting controls and the active-country selector are keyboard accessible and expose their current selection without relying on color.

### [#9: Resolve an approved fixed currency conversion](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/9)

**Prerequisites:** [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7)

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

### [#10: Resolve an approved named/code face value](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/10)

**Prerequisites:** [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7)

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

### [#11: Resolve future named/code value changes by local date](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11)

**Prerequisites:** [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), and [#10](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/10)

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

### [#12: Add and view a stamp with a monetary face value](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12)

**Prerequisites:** [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), and [#9](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/9)

**Feature:** A user can add an owned stamp with a monetary face amount and see its resolved unit postage value.

**Scope:**

- Add the inventory model and authenticated create/list endpoints.
- Support stamp country, name, optional year, monetary amount, face currency, owned quantity, annulled quantity, and expired flag.
- Connect monetary valuation to the fixed-conversion resolver.
- Store an optional manual postage amount and currency as a fallback when no conversion resolves the monetary value.

**Acceptance tests:**

- A user can add and retrieve a stamp in the active country's display currency.
- Country is required even when the monetary face currency is shared by several countries.
- A user can add and retrieve a stamp using an approved conversion.
- A stamp with a missing conversion can be saved with a manual fallback, and that fallback is used until a conversion resolves.
- A resolvable conversion takes precedence over the stored manual fallback.
- Year of issue can be absent.
- Invalid decimals and non-positive owned quantities receive field errors.
- The list contains only the authenticated user's stamps.
- Monetary inputs have visible labels, associated field errors, and keyboard-operable controls.

### [#13: Add and view a stamp with a named/code face value](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13)

**Prerequisites:** [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), and [#10](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/10)

**Feature:** A user can select an approved country-specific name/code while adding a stamp and see its resolved unit postage value.

**Scope:**

- Add named/code search by country and text.
- Store a reference to `NamedFaceValue` on the inventory entry.
- Store the named definition's country on the inventory entry and reject a country mismatch.
- Use the referenced schedule for valuation.
- Store an optional manual postage amount and currency as a fallback when the named schedule has no eligible current value.

**Acceptance tests:**

- The form requires a country before named/code selection.
- Selecting `IT` and `B Zona 1` stores its named-face-value ID rather than a copied amount.
- Editing the schedule changes the resolved value without rewriting the stamp record.
- A named-face-value ID from an unavailable pending definition cannot be submitted by another user.
- A named/code stamp with no eligible current schedule value can be saved with a manual fallback.
- An eligible schedule value takes precedence over the stored manual fallback.
- Named/code search, selection, and errors are labelled and keyboard accessible.

### [#14: Add and view a stamp with a manual postage value](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/14)

**Prerequisites:** [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), and [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7)

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
- Manual-value inputs have visible labels, associated field errors, and keyboard-operable controls.

### [#15: Show postage totals for the active country](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15)

**Prerequisites:** [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13), and [#14](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/14)

**Feature:** A user can see every owned stamp while postage values and totals are calculated for the active country.

**Scope:**

- Add the inventory page and value explanation returned by the server.
- Calculate line totals from quantity and unit value.
- Resolve active-country entries into that country's display currency.
- Return zero with `OUTSIDE_ACTIVE_COUNTRY` for every other country's entries.
- Identify unresolved entries without treating them as zero.

**Acceptance tests:**

- Monetary, converted, named/code, and manual entries display their valuation source.
- Unresolved monetary and named/code values use their stored manual fallback when it can be expressed in the active display currency.
- A stored manual fallback does not override a resolvable face value.
- Line totals use exact decimal multiplication.
- The inventory total equals the sum of resolvable line totals.
- An unresolved entry is labelled and excluded from the total.
- A stamp outside the active country remains visible with unit and line values of zero.
- Two countries that share the same display currency remain separate for postal valuation.
- Switching the active country recalculates both countries' rows and the inventory total without changing stored stamps.
- Two users see independent lists and totals.
- Money uses `Intl.NumberFormat` with the applicable currency, and dates use the user's locale.
- Valuation source, unresolved state, and zero-value reasons are available without relying on color.

### [#16: Edit owned and annulled quantities](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/16)

**Prerequisites:** [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15)

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
- Quantity controls have visible labels, expose validation errors, and work with a keyboard.

### [#17: Mark an inventory stamp as expired](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/17)

**Prerequisites:** [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15)

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
- The expired control and its zero-value explanation are available to keyboard and screen-reader users without relying on color.

### [#18: Remove an inventory entry](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/18)

**Prerequisites:** [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15)

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
- The remove action and confirmation can be completed or cancelled with a keyboard, and focus returns to a predictable location.

### [#19: Submit and use named/code proposals](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19)

**Prerequisites:** [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#11](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11), and [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13)

**Feature:** A user can propose a missing or corrected named/code definition or value and use the eligible pending value in their own inventory.

**Scope:**

- Add immutable proposal data for named definitions and schedule values.
- Accept corrections to an existing definition's country, display name, normalized code, current value, or future value.
- Require a source URL or source note.
- Show the user's pending definitions in named/code search.
- Apply an eligible pending value only for its proposer.

**Acceptance tests:**

- The proposer can add a stamp referencing their pending definition.
- Another user cannot see or reference it.
- A pending current value applies immediately to the proposer's stamp.
- A future pending value does not apply before its effective date.
- A future pending value appears to the proposer during the 10-day notice window.
- A correction remains private and does not overwrite the approved definition or schedule before moderation.
- The proposer can use an eligible pending correction while other users continue to receive the approved data.
- Proposal status is visible to its proposer.
- Proposal inputs and status are labelled, keyboard accessible, and understandable without color.

### [#20: Submit and use fixed-conversion proposals](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20)

**Prerequisites:** [#9](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/9), and [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12)

**Feature:** A user can propose a missing or corrected fixed conversion and use it for their own monetary stamps while it awaits moderation.

**Scope:**

- Add immutable fixed-conversion proposals.
- Accept corrections to an existing conversion's source currency, target currency, or exact multiplier.
- Require a source URL or source note.
- Include the proposer's pending rate in their conversion resolver.
- Hide it from other users.

**Acceptance tests:**

- A missing conversion can be submitted from the monetary-stamp workflow.
- The proposer immediately receives a resolved value from the pending multiplier.
- For a missing conversion, another user still receives an unresolved result.
- A proposed correction remains private and does not overwrite the approved conversion before moderation.
- The proposer uses their pending corrected multiplier while other users continue to receive the approved multiplier.
- Invalid or non-positive multipliers are rejected.
- Proposal status is visible to its proposer.
- Proposal inputs and status are labelled, keyboard accessible, and understandable without color.

### [#21: Let moderators view the proposal queue](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21)

**Prerequisites:** [#6](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/6), [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19), and [#20](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20)

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
- Queue filters, proposal details, and moderation navigation are labelled and keyboard accessible.

### [#22: Let a moderator approve a proposal](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22)

**Prerequisites:** [#11](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), and [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21)

**Feature:** A moderator can approve a proposal and publish its definition, value, or conversion to all users.

**Scope:**

- Add the approve action and decision note.
- Update shared data and proposal status in one transaction.
- Preserve the proposer's inventory references.
- Record moderator and decision time.

**Acceptance tests:**

- Approval makes the proposed data visible to another user.
- Approval of a correction updates the intended shared definition, schedule value, or conversion without creating a duplicate approved record.
- A linked stamp resolves through the approved data without being rewritten.
- Approval of a scheduled value does not activate it before its effective local date.
- Approval recalculates affected current inventory values.
- A forced shared-data failure rolls back the proposal status.
- A second approval attempt is rejected without duplicating data.
- Approval confirmation and its resulting status are keyboard accessible and do not rely on color alone.

### [#23: Let a moderator merge a duplicate proposal](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23)

**Prerequisites:** [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21), and [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22)

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
- An incompatible named-value country or effective date, or an incompatible conversion currency pair, cannot be merged.
- A transaction failure leaves all references unchanged.
- Merge-target selection and confirmation are labelled and keyboard accessible.

### [#24: Let a moderator reject a proposal](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24)

**Prerequisites:** [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21) and product decision R1

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
- Rejection confirmation, required-note errors, and completed status are keyboard accessible and do not rely on color alone.

This issue is not ready for implementation until R1 is decided. Its other prerequisites can close first.

### [#25: Show an upcoming named/code value in inventory](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/25)

**Prerequisites:** [#11](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/11), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), and [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19)

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
- The notice uses a localized date and communicates current and upcoming values without relying on color.

### [#26: Run project checks in continuous integration](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/26)

**Prerequisites:** [#4](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/4), and [#5](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/5)

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

### [#27: Download all user-owned and user-linked data as JSON](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27)

**Prerequisites:** [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19), [#20](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20), [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21), [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22), [#23](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23), and [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24)

**Feature:** A user can download one JSON file containing their private records and every non-secret record linked to their account.

**Scope:**

- Add a data-download control in authenticated settings.
- Add an authenticated JSON export endpoint with a versioned document structure and `Cache-Control: no-store`.
- Export SuperTokens account metadata, profile, country settings, inventory, private valuation data, and every proposal status.
- Export shared contributions and moderation or audit entries linked to the user.
- Serialize decimals and date-only values as strings.
- Add schema coverage that requires every user-linked table or field to be exported or explicitly excluded as secret.

**Acceptance tests:**

- The response is valid JSON downloaded with a filename, schema version, and generation time.
- The response headers prevent browser and intermediary caching.
- Profile, country settings, every stamp type, and private valuation records are present.
- SuperTokens account metadata is present without tokens or provider secrets.
- Pending, rejected, approved, and merged proposals submitted by the user are present.
- Shared definitions, schedule values, conversions, and source information linked to the user are present.
- Moderation entries linked to the user as proposer or moderator are present.
- Stored decimal and date-only strings are unchanged.
- Sessions, OAuth tokens, provider secrets, API keys, and password material are absent.
- Another user's private ID, email, profile, inventory, and private proposals are absent.
- An unauthenticated user cannot create an export, and one user cannot request another user's export.
- A schema coverage test fails for a new direct user reference without an export mapping or secret exclusion.
- The download control has an accessible name, works with a keyboard, and announces failure without relying on color.

### [#28: Delete an account without deleting shared contributions](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/28)

**Prerequisites:** [#27](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27)

**Feature:** A user can permanently delete their account and private data while approved or merged shared contributions remain available without their identity.

**Scope:**

- Add an account-deletion control with explicit confirmation.
- Revoke SuperTokens sessions and delete the authentication identity.
- Delete the profile, country settings, inventory, pending and rejected proposals, and private valuation data.
- Preserve approved and merged shared records with nullable contributor references.
- Add an idempotent deletion job so an external-service failure can be retried while account access stays blocked.

**Acceptance tests:**

- Cancelling the confirmation leaves the account unchanged.
- Confirming removes the SuperTokens identity and invalidates existing sessions.
- Profile, country settings, inventory, pending proposals, rejected proposals, and private valuation records are removed.
- Approved and merged named/code definitions, schedule values, fixed conversions, and source information remain usable by other users.
- Preserved shared and moderation records contain no deleted user ID or email.
- Another user's profile, inventory, proposals, and shared contributions remain unchanged.
- A failure while deleting the SuperTokens identity leaves the account blocked and retrying completes the deletion.
- Repeating a deletion step does not recreate data or fail because a record is already absent.
- The deletion control and confirmation are keyboard accessible, use explicit text, and return focus predictably when cancelled.

### [#29: Audit accessibility and localization across the complete workflow](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/29)

**Prerequisites:** [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#12](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/12), [#13](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/13), [#14](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/14), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#16](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/16), [#17](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/17), [#18](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/18), [#19](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/19), [#20](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/20), [#21](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/21), [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22), [#23](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23), [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24), [#25](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/25), [#27](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27), and [#28](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/28)

**Feature:** The complete authenticated workflow meets the PRD's accessibility and localization requirements when its parts are used together.

**Scope:**

- Audit first-run settings, country switching, stamp forms, inventory controls, proposal workflows, moderation, export, and deletion with keyboard and screen-reader checks.
- Fix missing labels, error associations, focus movement, status announcements, and color-only communication found by the audit.
- Verify money formatting with the applicable currency and date formatting with the user's locale.
- Add automated coverage for defects that can regress through component or workflow changes.

**Acceptance tests:**

- Every interactive control in the release can be reached and operated with a keyboard in a logical order.
- Every input has a visible label, and each validation error is programmatically associated with its field.
- Opening and closing forms or confirmations moves focus to a predictable element.
- Loading, success, error, pending, approved, rejected, expired, annulled, unresolved, and upcoming states do not rely on color alone.
- Dynamic status changes that require immediate feedback are announced to screen-reader users without repeating unchanged content.
- Monetary values use `Intl.NumberFormat` with the applicable currency.
- Calendar dates are stored unambiguously and displayed in the user's locale.
- Automated tests cover each defect fixed during the audit.

### [#30: Deploy a persistent preview of the inventory release](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/30)

**Prerequisites:** [#7](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/7), [#8](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/8), [#15](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/15), [#16](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/16), [#17](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/17), [#18](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/18), [#22](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/22), [#23](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/23), [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24), [#25](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/25), [#26](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/26), [#27](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/27), [#28](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/28), and [#29](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/29)

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
- The downloaded JSON contains private inventory, a shared contribution, and linked moderation history without another user's private data.
- Account deletion removes the test user's private data while an approved contribution remains available without their identity.
- The complete workflow passes the accessibility and localization audit.
- Backup and restore instructions recover a test inventory in a non-production environment.

## Suggested GitHub metadata

Use one area label per issue:

- `area: infrastructure`
- `area: auth`
- `area: settings`
- `area: valuation`
- `area: inventory`
- `area: moderation`
- `area: accessibility`
- `area: deployment`

Keep the `blocked` label on [#24](https://github.com/majestic-owl448/majestic-owl448-from-mentorship/issues/24) until R1 is decided. Add a `prerequisite` section to the GitHub issue body using the issue links that replace the local numbers in this proposal.
