# Frontend i18n Recovery Checklist

Last reviewed: July 27, 2026

## Status legend

- `[ ] Missing` = page/component is still mostly hardcoded and does not properly use i18n
- `[-] Partial` = i18n exists, but there are still many hardcoded texts / alerts / messages
- `[x] Good` = page already uses i18n reasonably well, only minor cleanup may remain

## Priority order

1. `frontend/src/page/UploadPage.tsx`
2. `frontend/src/page/DeveloperOnboardingPage.tsx`
3. `frontend/src/page/ProfilePage.tsx`
4. `frontend/src/page/GitHubCallbackPage.tsx`
5. `frontend/src/page/PathPage.tsx`
6. `frontend/src/page/ProfileScreen.tsx`
7. `frontend/src/App.tsx`
8. `frontend/src/components/Footer.tsx`
9. Shared modals/components used by onboarding/profile/admin flows
10. Partial cleanup for admin/dashboard leftovers

## Route pages

- `[x] Good` `frontend/src/page/UploadPage.tsx`
  - Added `upload` namespace and replaced page-level hardcoded labels, alerts, placeholders, upload states, and security telemetry texts

- `[x] Good` `frontend/src/page/DeveloperOnboardingPage.tsx`
  - Reused `developer` namespace for onboarding steps, error states, completion screen, payout form, and modal handoff texts

- `[x] Good` `frontend/src/page/ProfilePage.tsx`
  - Added `profile` namespace for profile header, GitHub link/unlink flow, edit-form labels, avatar picker, validation, and save-status texts

- `[x] Good` `frontend/src/page/GitHubCallbackPage.tsx`
  - Reused `auth` namespace for OAuth callback loading, backend error-code mapping, and return-navigation texts

- `[x] Good` `frontend/src/page/PathPage.tsx`
  - Added `path` namespace for hero copy, program cards, CTA buttons, and the grant-program simulation alert

- `[x] Good` `frontend/src/page/ProfileScreen.tsx`
  - Reused `profile` namespace for creator-profile loading, back-navigation, and message CTA texts

- `[-] Partial` `frontend/src/page/AdminPage.tsx`
  - Restored major error states, audit filters, finance header, banner/settings labels, contract composer modal, rejection modal, play-demo/lightbox copy, and contract/user status badges
  - Still contains deeper moderation/detail-panel copy mixed between EN/VI and should be swept in a follow-up pass

- `[x] Good` `frontend/src/page/DashboardPage.tsx`
  - Restored hardcoded alerts, fallback error strings, contract callback errors, and sales/game/marketplace error states

- `[x] Good` `frontend/src/App.tsx`
  - Restored shared toast/payment/cart texts, background alt text, marketplace fallback labels, and sample project date labels

- `[x] Good` `frontend/src/page/HomePage.tsx`
- `[x] Good` `frontend/src/page/MarketplacePage.tsx`
- `[x] Good` `frontend/src/page/DetailPage.tsx`
- `[x] Good` `frontend/src/page/CheckoutPage.tsx`
- `[x] Good` `frontend/src/page/PaymentDetailPage.tsx`
- `[x] Good` `frontend/src/page/PaymentResultPage.tsx`
- `[x] Good` `frontend/src/page/SignInPage.tsx`
- `[x] Good` `frontend/src/page/SignUpPage.tsx`
- `[x] Good` `frontend/src/page/WalletPage.tsx`

## Shared components and modals

- `[x] Good` `frontend/src/components/Footer.tsx`
  - Static footer links, labels, CTA, legal copy, and back-home aria text now use the `shared` namespace

- `[x] Good` `frontend/src/components/FaceVerifyModal.tsx`
  - Verification headings, checklist, errors, camera states, and success copy now use the `shared` namespace

- `[x] Good` `frontend/src/components/KycOcrModal.tsx`
  - OCR headings, field labels, upload flow labels, status copy, and validation messages now use the `shared` namespace

- `[x] Good` `frontend/src/components/ContractViewerModal.tsx`
  - Reject/signing flow, status badges, download labels, form labels, and contract action errors now use the `shared` namespace

- `[x] Good` `frontend/src/components/BotInviteModal.tsx`
  - GitHub invite helper text, copy states, steps, and fallback bot label now use the `shared` namespace

- `[x] Good` `frontend/src/components/ReportDisputeModal.tsx`
  - Report labels, placeholders, validation, submitting state, and success copy now use the `shared` namespace

## Admin subcomponents needing cleanup

- `[x] Good` `frontend/src/components/admin/AdminFileManagementPanel.tsx`
  - Storage categories, search/table labels, list/detail empty states, delete modal, pagination, and file action messages now use the `admin` namespace

- `[x] Good` `frontend/src/components/admin/AdminBannerPanel.tsx`
  - Banner CRUD labels, validation/errors, preview texts, and action aria labels now use the `admin` namespace

- `[x] Good` `frontend/src/components/admin/AdminAgreementPanel.tsx`
  - Agreement version editor, validation/errors, helper text, and history labels now use the `admin` namespace

- `[x] Good` `frontend/src/components/admin/AdminPaymentVerificationPanel.tsx`
  - Payment list filters, table headers, detail modal labels, pagination, and fallback errors now use the `admin` namespace

- `[x] Good` `frontend/src/components/admin/ExternalPublishStatusCard.tsx`
  - Google Play upload workflow, status labels, helper copy, placeholders, and upload states now use the `admin` namespace

- `[x] Good` `frontend/src/components/admin/AdminUserManagementPanel.tsx`
  - User filters, table labels, dialogs, role/status labels, and validation messages now use the `admin` namespace

- `[x] Good` `frontend/src/components/admin/AdminWithdrawalPanel.tsx`
  - Withdrawal list filters, notices, action messages, pagination, and status labels now use the `admin` namespace

- `[x] Good` `frontend/src/components/admin/AdminWithdrawalDetailModal.tsx`
  - Withdrawal detail labels, payout tracking, remarks/actions, notices, and progress overlay now use the `admin` namespace

## Execution checklist

- `[x]` Review current frontend i18n coverage
- `[x]` Create recovery checklist
- `[x]` Restore `UploadPage`
- `[x]` Restore `DeveloperOnboardingPage`
- `[x]` Restore `ProfilePage`
- `[x]` Restore `GitHubCallbackPage`
- `[x]` Restore `PathPage`
- `[x]` Restore `ProfileScreen`
- `[x]` Restore `App.tsx` shared toast/payment/cart texts
- `[x]` Restore `Footer.tsx`
- `[x]` Restore `FaceVerifyModal`
- `[x]` Restore `KycOcrModal`
- `[x]` Restore `ContractViewerModal`
- `[x]` Restore `BotInviteModal`
- `[x]` Restore `ReportDisputeModal`
- `[-]` Sweep `AdminPage` partial leftovers
- `[x]` Sweep `DashboardPage` partial leftovers
- `[x]` Sweep remaining admin subcomponents
