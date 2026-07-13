# UI Redesign Roadmap

## 1. Scope Locked

- Chi redesign `frontend UI/UX`.
- Khong thay doi backend logic.
- Khong doi API contract.
- Khong doi authentication, role logic, route logic, hoac DB.
- Thu tu duoi day duoc chot dua tren `frontend/src/App.tsx`, toan bo page trong `frontend/src/page`, va cac panel admin dang duoc render thuc te.

## 2. Approved Skill Combos

### Combo A - Brand Launch Flow

**Thu tu ap dung**

1. `docs/UI-Taste_Skill/brandkit-skill/brandkit.md`
2. `docs/UI-Taste_Skill/imagegen-frontend-web/imagegen-frontend-web-skill.md`
3. `docs/UI-Taste_Skill/stitch-skill/DESIGN.md`
4. `docs/UI-Taste_Skill/taste-skill-v1/SKILL.md`
5. `docs/UI-Taste_Skill/output-skill/OUTPUT-SKILL.MD`

**Dung cho**

- Landing, auth, onboarding, creator-conversion pages.

**Ket qua mong muon**

- Manh ve first impression.
- Co chat brand ro rang.
- Dark mode premium.
- Section hierarchy dep va co nhip.

### Combo B - Premium Commerce Surface

**Thu tu ap dung**

1. `docs/UI-Taste_Skill/brandkit-skill/brandkit.md`
2. `docs/UI-Taste_Skill/stitch-skill/DESIGN.md`
3. `docs/UI-Taste_Skill/taste-skill-v1/SKILL.md`
4. `docs/UI-Taste_Skill/output-skill/OUTPUT-SKILL.MD`

**Dung cho**

- Marketplace va product detail.

**Ket qua mong muon**

- Giao dien ban hang dep, sang trong, ro hierarchy.
- Product card, pricing block, gallery, CTA trong mot ngon ngu thiet ke thong nhat.

### Combo C - Reference Commerce Flow

**Thu tu ap dung**

1. `docs/UI-Taste_Skill/image-to-code-skill/image-to-code-skill.md`
2. `docs/UI-Taste_Skill/stitch-skill/DESIGN.md`
3. `docs/UI-Taste_Skill/taste-skill-v1/SKILL.md`
4. `docs/UI-Taste_Skill/output-skill/OUTPUT-SKILL.MD`

**Dung cho**

- Checkout, payment, wallet, payout, KYC, va cac flow can scan nhanh theo screenshot/reference.

**Ket qua mong muon**

- Chuan flow giao dich.
- De doc, de scan, de thao tac.
- Phu hop cac man hinh co trang thai, timer, QR, transfer status, result state.

### Combo D - Creator Workspace Dark

**Thu tu ap dung**

1. `docs/UI-Taste_Skill/stitch-skill/DESIGN.md`
2. `docs/UI-Taste_Skill/taste-skill-v1/SKILL.md`
3. `docs/UI-Taste_Skill/output-skill/OUTPUT-SKILL.MD`

**Dung cho**

- Dashboard, profile, community, chat, admin, va cac utility page.

**Ket qua mong muon**

- Workspace dark mode on dinh.
- Ro data density.
- Thong nhat voi san giao dich nhung khong bi qua marketing.

## 3. Skills Not Assigned Directly To A Page In This Roadmap

- `docs/UI-Taste_Skill/stitch-skill/STITCH-SKILL.md`
  - Chi dung khi can viet lai hoac nang cap `DESIGN.md` cho toan bo design system.
  - Khong dung lam combo code truc tiep cho tung page.

- `docs/UI-Taste_Skill/minimalist-skill/minimalist-SKILL.md`
  - Tam thoi khong gan cho page chinh nao trong roadmap nay.
  - Ly do: du an hien tai uu tien dark marketplace look; minimalist hop hon cho mot light editorial branch rieng trong tuong lai.

- `docs/UI-Taste_Skill/redesign-skill/redesign-skill.md`
- `docs/UI-Taste_Skill/soft-skill/soft-skill.md`
- `docs/UI-Taste_Skill/taste-skill/SKILL.md`
  - Khong nam trong execution lane chinh cua roadmap nay.

## 4. Locked Execution Order For All Pages

| Order | Page File | Route | Locked Combo | Bundle Scope |
| --- | --- | --- | --- | --- |
| 1 | `HomePage.tsx` | `/` | `Combo A - Brand Launch Flow` | Hero, featured sections, category entry points, homepage rhythm, `Header.tsx`, `Footer.tsx`, `NotificationBell.tsx` polish tie-in |
| 2 | `MarketplacePage.tsx` | `/marketplace` | `Combo B - Premium Commerce Surface` | Search, filters, product grid, badges, cards, sorting surface |
| 3 | `DetailPage.tsx` | `/detail/:id` | `Combo B - Premium Commerce Surface` | Gallery, product hero, pricing box, buy-now block, related content |
| 4 | `CheckoutPage.tsx` | `/checkout` | `Combo C - Reference Commerce Flow` | Order summary, payment choice hierarchy, CTA clarity |
| 5 | `PaymentDetailPage.tsx` | `/payment` | `Combo C - Reference Commerce Flow` | Payment session list, detail blocks, status scan, QR-related surfaces |
| 6 | `PaymentResultPage.tsx` | `/payment/success`, `/payment/failed`, `/payment/cancelled` | `Combo C - Reference Commerce Flow` | Success, failed, cancelled states with clear next actions |
| 7 | `WalletPage.tsx` | `/wallet` | `Combo C - Reference Commerce Flow` | Deposit, withdrawal, bank selection, amount input formatting, wallet stat cards |
| 8 | `SignInPage.tsx` | `/signin` | `Combo A - Brand Launch Flow` | Sign-in hero, trust cues, OAuth emphasis, auth form hierarchy |
| 9 | `SignUpPage.tsx` | `/signup` | `Combo A - Brand Launch Flow` | Registration funnel, benefit framing, form clarity |
| 10 | `GitHubCallbackPage.tsx` | `/auth/callback` | `Combo D - Creator Workspace Dark` | Callback state, success/error recovery, loading feedback |
| 11 | `ProfilePage.tsx` | `/profile` | `Combo D - Creator Workspace Dark` | Account settings, GitHub link block, become-developer prompt area |
| 12 | `DeveloperOnboardingPage.tsx` | `/developer-onboarding` | `Combo A - Brand Launch Flow` | Upgrade path shell, onboarding hierarchy, step framing; paired KYC modals use `Combo C` |
| 13 | `PathPage.tsx` | `/path` | `Combo A - Brand Launch Flow` | Creator path selection cards, decision CTA, conversion framing |
| 14 | `DashboardPage.tsx` | `/dashboard` | `Combo D - Creator Workspace Dark` | Creator workspace shell, tabs, sales blocks, contracts, inventory panels |
| 15 | `UploadPage.tsx` | `/upload` | `Combo D - Creator Workspace Dark` | Upload workflow, media/form grouping, publish controls, `BotInviteModal.tsx` |
| 16 | `CommunityPage.tsx` | `/community` | `Combo D - Creator Workspace Dark` | Feed rhythm, cards, composer surface, discovery hierarchy |
| 17 | `CommunityDetailScreen.tsx` | `/community/detail/:id` | `Combo D - Creator Workspace Dark` | Post detail, comments, reaction cluster, discussion readability |
| 18 | `ProfileScreen.tsx` | `/profile/:id` | `Combo D - Creator Workspace Dark` | Public creator profile hero, post list, CTA to message creator |
| 19 | `ChatScreen.tsx` | `/chat` | `Combo D - Creator Workspace Dark` | Conversation layout, thread spacing, composer, list density |
| 20 | `AdminPage.tsx` | `/admin` | `Combo D - Creator Workspace Dark` | Admin shell, tabs, stats overview, panel containers, `AdminHeader.tsx` |

## 5. Admin Phase Sub-Order

Khi den `AdminPage.tsx`, panel con se duoc redesign theo thu tu nay:

1. `frontend/src/components/admin/AdminPaymentVerificationPanel.tsx`
   - Combo khoa: `Combo D - Creator Workspace Dark`
   - Muc tieu: ro bang, ro filter, ro payment verification states.

2. `frontend/src/components/admin/AdminWithdrawalPanel.tsx`
   - Combo khoa: `Combo C - Reference Commerce Flow`
   - Muc tieu: scan payout request nhanh, status ro, action block de thao tac.

3. `frontend/src/components/admin/AdminWithdrawalDetailModal.tsx`
   - Combo khoa: `Combo C - Reference Commerce Flow`
   - Muc tieu: modal payout chi tiet, countdown/status, success-failure state, auto-close visual flow.

4. `frontend/src/components/admin/AdminUserManagementPanel.tsx`
   - Combo khoa: `Combo D - Creator Workspace Dark`
   - Muc tieu: readability cho danh sach user, filter, detail density.

5. `frontend/src/components/admin/AdminFileManagementPanel.tsx`
   - Combo khoa: `Combo D - Creator Workspace Dark`
   - Muc tieu: file ops, table clarity, action consistency.

6. `frontend/src/components/AdminDisputePanel.tsx`
   - Combo khoa: `Combo D - Creator Workspace Dark`
   - Muc tieu: evidence review, reason blocks, resolution actions de scan.

7. `frontend/src/components/admin/AdminDialog.tsx`
   - Combo khoa: `Combo D - Creator Workspace Dark`
   - Muc tieu: lam dialog goc thong nhat cho nhung panel admin con lai.

## 6. Non-Page Surfaces That Must Follow Their Parent Phase

### Commerce / Payment Cluster

- `frontend/src/components/PaymentQRModal.tsx`
  - Theo `PaymentDetailPage.tsx`
  - Combo khoa: `Combo C - Reference Commerce Flow`

- `frontend/src/components/PaymentQuickModal.tsx`
  - Theo `PaymentDetailPage.tsx`
  - Combo khoa: `Combo C - Reference Commerce Flow`

### KYC / Verification Cluster

- `frontend/src/components/KycOcrModal.tsx`
  - Theo `DeveloperOnboardingPage.tsx`
  - Combo khoa: `Combo C - Reference Commerce Flow`

- `frontend/src/components/FaceVerifyModal.tsx`
  - Theo `DeveloperOnboardingPage.tsx`
  - Combo khoa: `Combo C - Reference Commerce Flow`

### Contract / Review Cluster

- `frontend/src/components/ContractViewerModal.tsx`
  - Theo `DashboardPage.tsx` va `AdminPage.tsx`
  - Combo khoa: `Combo D - Creator Workspace Dark`

- `frontend/src/components/ReportDisputeModal.tsx`
  - Theo `DetailPage.tsx` hoac `CommunityDetailScreen.tsx` khi can
  - Combo khoa: `Combo D - Creator Workspace Dark`

### Community Cluster

- `frontend/src/components/ReactionsModal.tsx`
  - Theo `CommunityPage.tsx` va `CommunityDetailScreen.tsx`
  - Combo khoa: `Combo D - Creator Workspace Dark`

- `frontend/src/components/CommunityHub.tsx`
  - Theo `CommunityPage.tsx`
  - Combo khoa: `Combo D - Creator Workspace Dark`

### Shared Shell Cluster

- `frontend/src/components/Header.tsx`
  - Theo phase `HomePage.tsx`
  - Combo khoa: `Combo A - Brand Launch Flow`

- `frontend/src/components/Footer.tsx`
  - Theo phase `HomePage.tsx`
  - Combo khoa: `Combo A - Brand Launch Flow`

- `frontend/src/components/NotificationBell.tsx`
  - Theo phase `HomePage.tsx`
  - Combo khoa: `Combo D - Creator Workspace Dark`

## 7. Delivery Contract Before Coding

- Lam tung phase mot.
- Khong nhay trang lung tung.
- Moi page chi chinh UI layer va component layer di kem.
- Neu page co modal/phu kien thuoc cung mot cluster thi redesign chung trong cung phase.
- Hoan thanh page nao se giu nguyen data flow cua page do.

## 8. First Coding Phase After This Document

Phase dau tien sau khi roadmap duoc xac nhan:

1. `HomePage.tsx`
2. `MarketplacePage.tsx`
3. `DetailPage.tsx`

Ly do:

- Day la bo mat chinh cua san.
- Chot duoc visual language cho toan bo cac page con lai.
- Sau khi 3 page nay dep va on dinh, cac flow thanh toan, wallet, dashboard, admin se de dong bo hon.
