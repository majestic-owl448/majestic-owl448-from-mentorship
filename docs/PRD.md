# Stamp Inventory Product Requirements

## Document status

- Product area: stamp inventory
- Release scope: first usable inventory release
- Included systems: authentication, inventory, valuation, crowdsourced reference data, and moderation
- Excluded systems: postage planning, stamp combination selection, and collection-market valuation

## Product summary

The application lets an authenticated user record the stamps they own and calculate their current postage value in a selected currency. A stamp can have a monetary face value, a country-specific name or code, or no face value. The user records how many copies they own, how many are annulled, and whether the stamp has expired.

Named and coded face values use shared, moderated data. Currency conversions that represent established fixed conversions can also become shared data. Users can propose additions and changes. A proposer can use their pending data immediately when its effective date has arrived; other users see it only after approval.

## Product goals

The first release must let a user:

1. Sign in and access only their own inventory.
2. Select a home currency and timezone.
3. Add a stamp identified by a name, face value, and optional year of issue.
4. Record the owned and annulled quantities for that stamp.
5. Mark a stamp as expired.
6. Edit quantities and remove an inventory entry.
7. See current unit and total postage values in their home currency.
8. Use country-specific named or coded face values.
9. Propose shared named/code values, scheduled changes, and fixed currency conversions.
10. See an upcoming named/code value during the 10 calendar days before it takes effect.

## Out of scope

The first release will not:

- Find combinations of stamps for a letter or parcel.
- Ask for a planned mailing date.
- Model postal products, weights, dimensions, destinations, or service levels.
- Maintain a user-facing history of old named/code values.
- Track purchase price, sale price, catalog value, condition grade, or collection value.
- Research or pre-populate stamp catalogs.
- Fetch live foreign-exchange rates.
- Mark stamps as annulled when a user consumes them in the application.

An annulled stamp is a stamp that was already cancelled. It remains owned and visible in the collection, but its postage value is zero.

## Terms

| Term | Meaning |
| --- | --- |
| Home currency | Currency used to display the user's postage values and inventory total. |
| Face value | Monetary amount, country-specific name/code, or absent denomination shown on a stamp. |
| Named face value | A denomination identified by country and a normalized name or code. |
| Value schedule | Shared source of the current value and approved or proposed future changes. |
| Annulled quantity | Owned copies that have been cancelled and cannot contribute postage value. |
| Expired stamp | Stamp identity for which every owned copy has postage value zero. |
| Fixed conversion | Established conversion between currencies, such as a retired currency and its replacement. |
| Proposal | User-submitted addition or change awaiting moderator action. |

## Roles

### User

A user manages their profile and inventory, reads approved shared data, and submits proposals. They can use their own eligible pending proposal while it awaits moderation.

### Moderator

A moderator reviews proposals, checks the submitted source, merges duplicates, and approves or rejects changes. Moderator actions are recorded with the actor and time.

## Stamp identity and ownership

An inventory entry represents copies of the same stamp identity owned by one user.

Required and optional fields:

| Field | Requirement |
| --- | --- |
| Name | Required user-facing identifier. |
| Year of issue | Optional integer. |
| Face value type | `MONETARY`, `NAMED`, or `NONE`. |
| Monetary amount and currency | Required when the type is `MONETARY`. |
| Named face value reference | Required when the type is `NAMED`. |
| Manual postage amount and currency | Required when the value cannot be resolved from a face value. Zero is valid. |
| Quantity owned | Integer greater than zero. |
| Quantity annulled | Integer from zero through quantity owned. |
| Expired | Boolean that applies to every owned copy in the entry. |

The application must preserve the face value when a stamp is annulled or expired. Postal validity changes the calculated postage value, not the recorded stamp identity.

## Postage valuation

### Unit value

The application resolves the unit postage value for a non-expired, non-annulled copy in this order:

1. A monetary face value in the user's home currency has the same postage value as its face amount.
2. A monetary face value in another currency uses the applicable fixed currency conversion.
3. A named/code face value uses its applicable value schedule.
4. A face value without an applicable conversion or named/code value requires a manual postage amount.
5. A stamp with no face value requires a manual postage amount.

Money calculations must use decimal arithmetic. JavaScript floating-point numbers must not be used for stored values or multiplication.

A manual postage amount retains the currency in which the user entered it. If the user changes their home currency, the application converts that amount when an applicable conversion exists. When no conversion exists, the entry remains stored but cannot contribute to the new home-currency total until the user supplies a conversion or replaces the manual amount.

### Quantity calculation

```text
usable quantity = expired ? 0 : quantity owned - quantity annulled

total postage value = usable quantity * current unit postage value
```

Rules:

- Annulled copies remain included in quantity owned.
- Every annulled copy has postage value zero.
- Every copy of an expired stamp has postage value zero.
- Postage value can be zero but cannot be negative.
- The inventory total is the sum of each entry's total postage value in the home currency.

## Named/code face values

A named/code face value is globally identified by:

```text
country code + normalized name/code
```

The database must preserve a display value separately from the normalized lookup value. The pair `(countryCode, normalizedCode)` must be unique among approved definitions.

Examples supplied during product definition include an Italian face value named `B Zona 1`. The application does not assume or seed its amount without submitted data.

Each named/code definition references a value schedule. The monetary amount is not stored directly on the definition.

## Shared value schedules

A value schedule stores:

- Country
- Currency
- Current baseline value
- Approved future values
- Pending values visible to their proposers
- Effective calendar date for each future value

This separation prepares the data for a later postage-rate feature:

```text
NamedFaceValue -----> ValueSchedule <----- Future PostageRate
```

When a named/code denomination and a postage rate are formally linked, both reference the same schedule. An update to that schedule changes them together. Values that happen to have the same amount but are not formally linked use separate schedules.

The inventory release does not need a postage-rate catalog or postage-rate user interface. A future `PostageRate` record can reference an existing schedule without changing stamp inventory records.

## Current and future named/code values

An effective date is stored as a calendar date, not a universal activation timestamp. Applicability is calculated from the user's IANA timezone.

At a single instant, a future value can be current for a user whose local date has advanced and still be upcoming for another user. For that reason, `CURRENT` and `SCHEDULED` are derived states rather than persistent global states.

For a user and local date, the resolver selects the latest eligible value whose effective date is absent or on or before that date. Eligible values are:

- Approved global values.
- Pending values proposed by the current user.

During the 10 calendar days before the next eligible value takes effect, the inventory shows:

- Current amount.
- Upcoming amount.
- Upcoming effective date.

Inventory totals use the current amount only. The release does not provide a postage-date selector.

After a new value applies in every supported timezone, the former amount can leave active valuation data. Moderator audit records remain available to moderators, but users do not receive a historical-rate feature.

### Schedule example

The product discussion supplied this acceptance example; it is not a request to seed a stamp catalog:

- Country: Italy (`IT`).
- Named/code face value: `B Zona 1`.
- Schedule currency: `EUR`.
- Current value: `1.35`.
- Approved future value: `1.40`.
- Effective date: October 1, 2028.

Through September 30, 2028 in the user's timezone, inventory calculations use `1.35 EUR`. From October 1, they use `1.40 EUR`. During the 10-day notice window, the interface shows both values and the effective date. A future postage-rate record for `B Zona 1` can reference the same schedule and change at the same time.

## Currency conversions

The application distinguishes fixed currency conversions from live market exchange rates. A verified fixed conversion is global because its mathematical rate does not vary by user.

A conversion contains:

- Source currency.
- Target currency.
- Exact decimal multiplier.
- Optional effective date.
- Proposal and moderation data.

Users must be able to enter a missing conversion for their inventory. That user-owned value works immediately. A moderator can approve it as a shared fixed conversion after checking its source. Existing stamps continue to resolve through the same conversion reference after approval.

Whether a stamp denominated in a former currency remains valid is separate from the conversion. The stamp's expired field controls postal validity.

## Crowdsourcing and moderation

Users can propose:

- A new named/code face value.
- A correction to its country, display name, or normalized code.
- A current value.
- A future value and effective date.
- A missing fixed currency conversion.
- A correction to a fixed conversion.

Every proposal records:

- Proposer.
- Submitted values.
- Source URL or source note.
- Submission time.
- Status: `PENDING`, `APPROVED`, `REJECTED`, or `MERGED`.
- Moderator, decision time, and decision note when reviewed.

Pending proposal rules:

- The proposer can use the proposed value when its effective date has arrived.
- A future pending value is displayed during its notice window but does not apply early.
- Other users cannot use or see pending data.
- Approval makes the value global without changing the proposer's stamp records.
- A duplicate proposal can be merged into an existing definition or scheduled value.
- A proposal cannot directly overwrite approved data.

Moderator tools must support a queue, proposal detail, approve, reject, and merge. The approve operation must be transactional so the proposal and shared data cannot disagree.

## Authentication and data isolation

- Google and Apple login continue through SuperTokens.
- The database profile is keyed by the SuperTokens user ID.
- All inventory reads and writes derive the owner ID from the server-side session.
- A client cannot select or override the owner ID.
- Requests for another user's inventory record return `404`.
- Moderator endpoints require a server-verified moderator role.
- Pending proposals are filtered by proposer ID outside moderator views.

## Inventory interface

The authenticated inventory page contains:

- Home currency and timezone settings.
- Add-stamp form.
- Inventory list.
- Quantity owned and annulled controls.
- Expired control.
- Unit postage value and total postage value.
- Overall inventory postage total.
- Edit and remove actions.

The face-value input changes with the selected type:

- `MONETARY`: amount and currency.
- `NAMED`: country and name/code search, with an option to propose a missing definition.
- `NONE`: manual postage value.

If a required conversion is missing, the user can enter one without leaving the stamp workflow. If a named/code value has an upcoming change within the notice window, the stamp row displays both amounts and the effective date.

## Validation and error handling

- Quantity owned must be a positive integer.
- Quantity annulled must be an integer between zero and quantity owned.
- Year of issue is optional and must be a plausible four-digit integer when supplied. Exact accepted bounds belong in the implementation specification.
- Monetary amounts and conversion multipliers must be valid decimal strings.
- Postage amounts cannot be negative.
- Face-value fields must match the selected face-value type.
- Named/code lookups require a country.
- Effective dates are calendar dates.
- Timezones must be valid IANA timezone identifiers.
- Manual postage values retain their entered currency.
- Validation errors identify the affected field.

## Accessibility and localization

- Forms and controls must be keyboard accessible.
- Every input has a visible label and associated error text.
- Status is not communicated through color alone.
- Monetary values use `Intl.NumberFormat` with the applicable currency.
- Dates are displayed in the user's locale while stored in an unambiguous date format.
- The interface distinguishes `owned`, `annulled`, and `expired` without using `used` as a synonym.

## Acceptance criteria

The inventory release is complete when:

1. A signed-in user can create, edit, list, and remove only their own inventory entries.
2. Monetary, named/code, and absent face values are supported.
3. The user can set owned and annulled quantities, subject to the quantity constraints.
4. Annulled and expired copies always contribute zero postage value.
5. A monetary face value in the home currency is valued at face amount.
6. A converted monetary face value uses the applicable fixed decimal rate.
7. A named/code face value uses the current eligible value from its shared schedule.
8. Updating an approved fixed conversion recalculates every linked monetary stamp.
9. Updating an approved named/code schedule recalculates every linked named/code stamp.
10. A future value activates on its effective calendar date in each user's timezone.
11. Current and upcoming named/code values appear during the 10-day notice window.
12. A proposer can use their eligible pending data while other users cannot see it.
13. A moderator can approve, reject, and merge proposals through protected controls.
14. Inventory totals use exact decimal calculations and the user's home currency.
15. Lint, automated tests, production build, database migrations, and an authenticated browser flow pass.
16. Changing the home currency never reinterprets a stored manual amount as a different currency.

## Product decision still required

The behavior for a rejected proposal that the proposer has already used is not settled. Choose one before moderation implementation:

1. Stop using it and fall back to the applicable approved value or manual value.
2. Keep it as a private user-owned value after rejection.
