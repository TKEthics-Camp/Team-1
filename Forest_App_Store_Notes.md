# Forest: App Store notes

26 September 2026 · Team-1, commit `97527d8`

These are the issues and unknowns that came up while looking through the repo and Apple's documentation. The implementation choices and order of work are still open for discussion.

This is based on the checked-in code. The live database, deployed consent service, and an installed iOS version haven't been verified. No app tests or iOS builds were run for these notes.

## Summary and next steps

Forest already has most of its core features in the web app, but there isn't a verified iOS release yet. The main issues are reliable syncing, consent enforcement, reviewing reported media, complete account deletion, and draft privacy information. Device behavior and the live backend still have unknowns. Launch countries, minimum age, release scope, and publisher ownership are also undecided.

The next steps, in broad terms:

- **Agree on the release scope:** audience, countries, minimum age, supported devices, sharing, and any paid features.
- **Discuss the code issues:** decide which changes are needed and how the team wants to handle them.
- **Settle the iOS approach:** choose how to turn the web project into an installable app and establish what is deployed on the backend.
- **Check the resulting app:** confirm device behavior, saved data, account flows, consent, sharing, and deletion work as intended.
- **Complete the publishing details:** publisher account, policies, privacy declarations, age rating, screenshots, and reviewer access.
- **Submit and handle follow-up:** respond to review feedback, with support and moderation responsibilities agreed for release.

These steps leave the specific fixes, priorities, and assignments to the team. The sections below explain the issues behind them.

## What we have right now

Forest is a hobby journal with a garden that changes as people log activities. It has text entries, photos, voice notes, progress and rewards, English and Chinese text, and separate student and educator flows. There is also sharing, discovery, class membership, reporting, and blocking.

The frontend uses React and Vite. Dexie stores data in the browser's IndexedDB database. Supabase provides accounts, cloud data, and media storage. The repo also contains a web manifest and service worker for the PWA, which is the installable web version.

The current build is a web build. There is no iOS project or signed App Store build in the reviewed checkout. Some older README and product-document statements don't match the newer implementation, particularly around social features and consent.

```text
Current app
  React interface
    - local records in Dexie / IndexedDB
    - accounts and synced records in Supabase
    - photos and audio in cloud storage

Current build
  Vite -> website / PWA
```

Repo: `package.json`, `src/db/db.js`, `src/main.jsx`, `src/lib/remote.js`.

## The iOS question

Apple doesn't require the app to be rewritten in Swift. The missing piece is an iOS application that can be built, signed, installed, and submitted. The way we get from the current web app to that application hasn't been decided.

For context, Capacitor can host web code inside an iOS app. React Native uses a different UI component system, so existing HTML/CSS screens aren't directly interchangeable with its screens. These are different technical routes; neither is selected here.

Apple's minimum-functionality rule expects more than a repackaged website. Whether Forest meets that rule depends on the submitted experience. A particular framework doesn't guarantee approval.

A browser installation and a native installation also have separate local storage. Signing in can recover data that reached the backend, but that doesn't automatically recover work that only exists in the browser cache. A website deployment doesn't update an already installed iOS binary.

Sources: [Apple Review Guidelines, section 4.2](https://developer.apple.com/app-store/review/guidelines/), [Capacitor iOS documentation](https://capacitorjs.com/docs/ios), [React Native components](https://reactnative.dev/docs/intro-react-native-components).

## Issues in the current code

### Failed sync attempts are tracked in memory

The app stores local records in Dexie, but its list of pending retries is only in memory. Closing the process loses that list. This doesn't mean the local records disappear; it means the retry tracking disappears.

The code comments describe the limitation directly:

```js
// Kept in memory only (not persisted to Dexie): if the app is fully
// closed before a retry lands, the next sign-in's reconciliation still
// picks up brand-new records the same way it always has, and a fresh
// edit re-triggers a push on its own anyway. What this adds is retrying
// failed *updates* to something that already exists remotely, which
// reconciliation alone never covered.
```

Repo: `src/store/StoreContext.jsx:44–49`.

The reconciliation code mostly compares record IDs to find records missing from one side. A record can already exist on both sides while containing different edits. The outcome after a failed update followed by a restart is therefore still an issue, especially across two devices.

### The age check has a missing-function bypass

The client treats a missing age-gate RPC differently from other failures. An RPC is a database function called by the app.

```js
const missing = error.code === "PGRST202"
  || /could not find the function/i.test(error.message || "");
if (missing) {
  console.warn("Age gate not deployed; signup proceeding ungated.");
  return { ok: false, reason: "missing" };
```

Repo: `src/lib/remote.js:866–870`, excerpt ending before the closing brace.

The caller at `src/components/auth/AuthFlow.jsx:121` allows the `"missing"` result to continue. So registration can proceed when this backend function isn't available. The presence of a consent screen doesn't establish that the consent check is always enforced.

### Parts of the consent migration don't match the schema

The consent migration contains these policies:

```sql
alter policy "entries_insert_own" on public.entries
  with check (user_id = auth.uid() and public.consent_allows_writing());
alter policy "photos_insert_own" on public.photos
  with check (user_id = auth.uid() and public.consent_allows_writing());
```

Repo: `supabase/migrations/20260918000000_age_gate_guardian_consent.sql:363–366`.

The checked-in `entries` and `photos` tables use `interest_id`; they don't have those `user_id` columns. Ownership is through the parent interest. The statements above conflict with that schema. There is a similar ownership assumption in the migration's disclosure trigger.

The live schema and which migrations have actually been applied are unknown. This is a code/schema mismatch, not a claim that a particular production deployment was tested and failed.

### The moderation screen doesn't display the reported media

Reporting and moderation code already exists. However, the review screen displays text or this placeholder:

```jsx
<div className="mod-content">
  {row.content ? row.content : <em>(no text — a photo or voice note)</em>}
</div>
```

Repo: `src/components/moderation/ModerationScreen.jsx:77–79`.

There is no image preview or audio playback in this screen. Someone reviewing a media report can't inspect the reported media through that interface. Who handles reports, and how quickly they are handled, also isn't established by the repo.

### Account deletion exists, but complete cleanup is unverified

There is already an in-app account deletion control. The concern is whether all the related records and files are removed, including when part of the operation fails.

The client storage helper requests a maximum of 1,000 objects in one listing:

```js
const { data, error } = await supabase.storage
  .from(bucket).list(userId, { limit: 1000 });
```

Repo: `src/lib/remote.js:334`, with the line split for readability.

That helper has no pagination loop. Account deletion also attempts separate SQL cleanup, so the client listing alone doesn't prove that larger accounts leave files behind. Complete removal across auth, database, and storage hasn't been verified. Neither have partial failure, old sessions, nested files, or previously shared content.

Related code: `src/lib/remote.js:604`, `src/components/profile/ProfileScreen.jsx:81`.

### Reminders currently depend on the web app being open

`src/lib/useReminderTimers.js` uses the browser Notification API and runs from a React effect. Its comments explicitly describe notifications firing while the tab is open. This isn't evidence of reminders being delivered after an iPhone app is suspended or closed.

The once-per-day guard is also in memory. Permission refusal, a restart, time-zone changes, and opening the right screen from a notification haven't been verified in an installed iOS app.

### Incoming routes can be replaced with Home

`RoutedShell` navigates to Home when it mounts, at `src/App.jsx:180`. An incoming destination from a link or notification could be replaced by that navigation. The result in a native app hasn't been tested.

Guardian consent and policy pages also have browser users who may not have Forest installed or be signed in. Their behavior is part of the account flow even though those pages can sit outside the app.

### The layout is still a fixed web phone frame

In `src/styles/layout.css`, the app has a maximum width of 400 pixels and a height capped at 720 pixels. There is outer padding, a rounded border, and scrolling inside the frame.

That is the current browser layout. Its behavior around an iPhone's safe areas, keyboard, larger text, and different screen sizes is unknown. Camera, microphone, audio interruptions, and VoiceOver behavior are also unverified on a native build. The use of browser APIs doesn't by itself prove that those features are broken on iOS.

### The privacy text is still a draft

`src/lib/policyText.js:8` marks the policy as a draft. It also includes a blanket claim about having no third-party SDKs, even though the app uses third-party dependencies and services.

The final operator, contact details, data retention, vendors, and rights-handling arrangements aren't settled by that text. The support copy also directs some concerns to a teacher, which doesn't establish a monitored developer contact.

## Things that are still undecided

- Which countries the app will be available in.
- The youngest supported user and who can sign up independently.
- Whether the first release includes public discovery, classroom sharing, photos, voice, and all current social features.
- Whether iPad is supported, and the oldest supported iOS version.
- Whether the app stays free with earned coins or includes paid features.
- Who owns the Apple account, backend, domain, code, and brand.
- Who handles support, reports, and data requests after release.

These choices affect which requirements apply. The app's original audience and its English/Chinese interface don't establish its launch countries.

There is already an App Store product called [Forest: Focus for Productivity](https://apps.apple.com/us/app/forest-focus-for-productivity/id866450515), also involving growing trees. That creates a name/branding question. The listing alone doesn't establish infringement or mean that this project has to be renamed.

## Age, consent, and countries

There are four different age questions here:

- The publisher's age: who can enter Apple's agreement.
- The app's minimum user age: who the product admits.
- The consent threshold: who can authorize the relevant data handling.
- The App Store rating: what content and features a user may encounter.

They aren't interchangeable. A birthday field or a store age rating doesn't resolve all four.

The current consent flow uses an under-14 threshold and has a class-code route. A valid class code doesn't establish verified school authorization. The guardian flow's existence also doesn't establish that it satisfies every country or every type of sharing.

The country examples below are conditional; the launch countries are still unknown.

- **US:** COPPA can apply to covered collection involving children under 13. Children's images and voice recordings can count as personal information. School authorization has limits tied to the educational context, and the FTC's email-plus approach has limits around disclosure.
- **EU:** For relevant consent-based online services, the parental-consent threshold varies from 13 to 16 by member state. The applicable country and legal basis matter.
- **Canada:** Meaningful consent depends on the applicable federal/provincial framework and the person's capacity. There isn't one universal age cutoff covering every situation.
- **Mainland China:** Under-14 personal information has special protections, including guardian-consent rules. Cross-border processing and applicable app/ICP filing are separate questions. Offshore hosting isn't automatically acceptable or automatically prohibited in every case.

Apple's Kids category is for ages 11 and younger. An app used by teenagers doesn't automatically belong in it. The final store rating comes from the actual questionnaire and any applicable higher minimum age in the app's terms.

Sources: [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [EU children's data safeguards](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en), [Canadian privacy commissioner's consent guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/), [China's PIPL](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm), [Apple categories](https://developer.apple.com/app-store/categories/), [Apple age ratings](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating).

## Apple requirements relevant to Forest

These are platform requirements, separate from the team's choice of implementation.

### Shared content

Apple's user-generated-content rules include filtering objectionable material, reporting with timely responses, abusive-user blocking, and published developer contact information. Forest has some of the related code, but its completeness and operation haven't been established.

### Account deletion

Apps that support account creation must let users initiate account deletion inside the app. That includes dealing with associated data. Clearing a cache, removing garden entries, or deactivating an account is different. Some deletion processes can take time if that is clearly explained; legally required retention can also affect the outcome.

### Login and paid features

Apple's login-services rule has an exception for apps using only their own account system. Forest's own username/password flow appears relevant to that exception, but the final login options determine the assessment.

The current coins are earned through activity. They aren't purchases. Selling digital items or features generally brings Apple's in-app-purchase rules into scope, with storefront-specific exceptions.

### App Review access

Apple expects a complete app and working review access. Forest has student, educator, class, and guardian paths, so the reviewer experience depends on which of those paths the submitted build exposes. Review approval doesn't establish complete legal compliance.

Sources: [Apple Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [account deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

## Privacy and device permissions

There are three separate pieces: the public privacy policy, the App Privacy answers on the store listing, and the privacy information/configuration bundled with the native app. Having one doesn't replace the others.

Forest's backend receives account information, journal content, and media. Data uploaded just for sync can still be collected data for Apple's disclosures. "Private by default" doesn't mean "Data Not Collected."

The data inventory also involves age and consent records, guardian contact information where used, class membership, social relationships, reports, and service logs. Exact fields, retention, access, and vendor practices in the live system haven't been verified. Applicable access/export and portability rights depend on the launch scope.

Native privacy manifests describe applicable data practices and required-reason API use. Some SDKs also have manifest/signature requirements; Capacitor appears on Apple's SDK list if that route is used. The final native dependencies are not yet known.

Camera and microphone access have usage-description requirements when those APIs are used. Photo-library requirements depend on the API: a system picker can provide selected photos without broad library access. Notification permission is separate. The actual native permissions and refusal behavior aren't established by the current web build.

App Tracking Transparency concerns Apple's definition of tracking, such as certain cross-company advertising data use. Accounts and cloud sync alone don't automatically trigger that prompt. The final services and data practices determine the answer.

Sources: [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/), [privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files), [third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/), [required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api), [microphone usage description](https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription), [system photo picker](https://developer.apple.com/documentation/photokit/selecting-photos-and-videos-in-ios), [notification permission](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications), [tracking and privacy](https://developer.apple.com/app-store/user-privacy-and-data-use/).

## Apple account, build, and listing

The standard Apple Developer Program fee is US$99 per year, with regional pricing. Individual enrollment requires legal adulthood and two-factor authentication. The individual's legal name appears as seller. An organization account involves a qualifying legal entity and verification; three people collaborating doesn't itself create that entity. Team-access permissions differ between individual and organization memberships.

Apple's Xcode build tools run on macOS. That is separate from using IntelliJ or Linux for shared web development. Access to the publisher account, signing credentials, a suitable Mac, and physical-device testing isn't established by the repo.

As of the research date, uploads require the iOS/iPadOS 26 SDK or later, and Apple has required an iOS/iPadOS 13+ deployment target since 9 September 2026. For April 2027, Apple announces an iOS/iPadOS 27 SDK minimum and an iOS 15+ deployment target. The SDK is the toolkit used to build the app; the deployment target is the oldest iOS version allowed to run it. Frameworks can impose a higher floor. These rules can change before release.

The store submission also involves:

- An app record, bundle identifier, signed build, and version/build numbers.
- Name, description, category, icon, and screenshots for the supported devices.
- Age-rating answers, App Privacy information, and privacy/support URLs.
- Pricing, country availability, content-rights declarations, and encryption/export answers.
- Review contact information and access to the app's account-dependent features.

The existing 512-pixel PWA icon isn't a complete native icon setup. Final screenshots and an iOS-specific store listing aren't established in the reviewed checkout.

HTTPS and platform-supplied encryption can still be relevant to export-compliance questions. Apple requires a trader-status declaration; traders distributing in the EU also have verified public contact details. Free pricing alone doesn't settle trader status. Mainland China availability can involve filing information.

Sources: [Apple enrollment](https://developer.apple.com/help/account/membership/program-enrollment/), [account roles](https://developer.apple.com/help/account/access/roles/), [upcoming requirements](https://developer.apple.com/news/upcoming-requirements/), [submission requirements](https://developer.apple.com/app-store/submitting/), [app icons](https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon), [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/), [EU trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements), [mainland China app information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).

## What hasn't been verified

The repo has utility tests, but this review didn't run them. It also didn't establish the outcomes below:

- An installed app saving text/photos/audio, being closed, and recovering that work.
- The same account editing records on two devices, or switching accounts on a shared device.
- Consent enforcement through direct database or storage requests, rather than only through the visible screen.
- Private, blocked, reported, and deleted content staying inaccessible where expected.
- Full account deletion after partial failures or for accounts with many media files.
- Real-device camera/audio behavior, permission refusal, incoming links, and reminders.
- Keyboard layout, larger text, VoiceOver, and English/Chinese text across supported devices.
- Which migrations are deployed, whether guardian email delivery works, and whether the operational policy matches the code.

These are unknowns, not a claim that each case has failed.

TestFlight is Apple's optional beta-distribution service. It supports up to 100 eligible App Store Connect users as internal testers and 10,000 external testers. Builds expire after 90 days, and the first external build requires review. No TestFlight results were part of this review.

In App Store Connect, adding a version to a review submission and actually submitting it are separate actions. There is no submitted or approved Forest iOS build established by this review.

Sources: [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [submitting an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app).

## A few terms

- **Backend:** the services handling accounts, cloud records, and shared rules.
- **RLS:** row-level security, meaning database rules about which records each account can access.
- **Migration:** a saved change to database structure or rules. A file in the repo doesn't prove it was applied to the live database.
- **WebView:** a browser view inside an installed app.
- **Bundle ID:** the app's unique technical identifier in Apple's system.
- **Signing:** the mechanism identifying the developer and authorizing an app build for distribution.
- **Deep link:** a link to a particular screen or item in an app.
- **SDK:** the platform tools and libraries used to build an app.

All repository paths above are relative to Team-1. The linked external sources were checked on 26 September 2026.
