# UI Admin Redesign

## Tom tat de bat dau phase UI

Tai lieu nay giu 2 muc dich:

1. Lam moc chung cho phase redesign giao dien admin
2. Giu lai phan audit route/permission o cac muc ben duoi de doi chieu khi code

Neu doc de bat dau thiet ke UI, hay uu tien cac muc trong phan mo dau nay truoc. Cac phan audit chi tiet ben duoi co the xem nhu appendix tham chieu.

## Muc tieu phase UI hien tai

Can redesign lai `AdminPage` thanh mot khu vuc quan tri ro vai tro hon, de dung chung layout va cach dieu huong cho cac chuc nang admin that su.

Muc tieu cu the:

- Tach cam giac `admin control center` khoi `creator workspace` va `storefront`
- Sap xep lai thong tin theo nhom tac vu thay vi de tat ca trong mot man hinh tab lon
- Uu tien `moderation`, `finance ops`, `user ops`, `system ops`
- Giu cac rang buoc nghiep vu da chot:
  - `Admin` khong di creator upload flow thong thuong
  - `Admin` van xem/chay duoc `web-demo`
  - `Admin` van co wallet de theo doi dong tien hoa hong nen tang
  - Chua lam `admin override flow`

## Ke hoach router va Finance Ops

Pham vi nay gom 2 viec can chot truoc khi tiep tuc redesign admin:

1. `Admin` login vao la vao thang giao dien `admin`
2. `Admin wallet` khong de o flow `WalletPage` dung chung nua, ma dua vao `Finance Ops`

### Hien trang router

Qua doc router frontend:

- App dang dung `screen-state router` trong `App.tsx`, khong phai React Router day du
- Route `/admin` da ton tai va da duoc `ProtectedRoute` chan dung role
- Van de nam o `post-login redirect`, khong nam o `admin route`

Hien tai:

- `SignInPage`
  - login email/password thanh cong -> `setCurrentScreen('explore')`
  - login Google thanh cong -> `setCurrentScreen('explore')`
- `GitHubCallbackPage`
  - login thanh cong -> `setCurrentScreen('dashboard')`
- `WalletPage`
  - van la page dung chung cho nhieu role
  - admin chi dang dung branch rieng trong cung mot page

### Hien trang Finance Ops

Trong `AdminPage` hien tai:

- `Finance Ops` moi co:
  - `Payments`
  - `Withdrawals`
- Chua co tab `Wallet`
- Nghia la admin wallet van chua duoc dua vao dung `admin information architecture`

### Huong chot

#### 1. Post-login redirect cho admin

Can tao 1 quy tac redirect ro rang sau login:

- `admin` -> `admin`
- `developer` -> `dashboard` hoac `developer-onboarding` neu flow yeu cau
- `customer` -> `explore` hoac screen mac dinh hien tai

Muc tieu:

- Khong de admin roi vao `explore`
- Khong de admin roi vao `dashboard` dung chung voi developer
- Tat ca login flows phai dung chung 1 quy tac

Noi can sua:

- `SignInPage`
- `GitHubCallbackPage`
- neu can, bo sung helper dung chung trong `App.tsx` hoac file util rieng

#### 2. Tach admin wallet khoi WalletPage dung chung

Khong nen de admin tiep tuc dung `WalletPage` theo kieu:

- customer/developer va admin dung cung 1 man hinh
- chi tach bang `isAdmin`

Huong moi:

- `WalletPage`
  - giu cho `customer`
  - giu cho `developer`
- `AdminPage`
  - them `Finance Ops -> Wallet`
  - `Payments`
  - `Withdrawals`

Ly do:

- wallet cua admin la `ops/finance surface`, khong phai `self-service wallet`
- admin can nhin theo logic:
  - payout balance
  - commission/platform wallet
  - payment monitoring
  - withdrawal processing

### Ke hoach implementation

#### Phase 1. Sua router admin login

1. Tao helper redirect sau login theo role
2. Ap dung helper do cho:
   - login email/password
   - login Google
   - login GitHub callback
3. Verify:
   - admin -> vao `admin`
   - developer -> khong vao `admin`
   - customer -> khong vao `admin`

#### Phase 2. Dua admin wallet vao Finance Ops

1. Them tab `wallet` vao `Finance Ops` trong `AdminPage`
2. Tach phan admin wallet UI hien dang nam trong `WalletPage`
3. Tao component rieng, vi du:
   - `AdminFinanceWalletPanel`
4. Gan panel nay vao `Finance Ops`
5. Giu `AdminPaymentVerificationPanel`
6. Giu `AdminWithdrawalPanel`

Thu tu Finance Ops sau khi tach:

- `Wallet`
- `Payments`
- `Withdrawals`

#### Phase 3. Chan admin di vao wallet dung chung

Sau khi phase 2 xong:

- neu admin vao `wallet`
  - redirect ve `admin`
  - hoac mo dung `Finance Ops -> Wallet`

Muc tieu:

- admin chi con 1 diem vao finance la trong `AdminPage`
- khong ton tai 2 UI tai chinh admin song song

### Giao dien can doi sau khi doi router

Sau khi router dung:

- Admin login xong thay `Admin Control Center` ngay
- Diem vao mac dinh la `Admin / Overview`
- Sidebar co `Finance Ops`
- Trong `Finance Ops` co `Wallet / Payments / Withdrawals`
- Khong can nut hoac duong dan rieng de dua admin sang `WalletPage` cu

### Cay dieu huong muc tieu

Top-level sidebar cua admin giu theo huong hien tai:

- `Overview`
- `Moderation`
- `Finance Ops`
- `User Ops`
- `System Ops`

Trong `Finance Ops`, admin se di theo 3 man hinh con:

- `Wallet`
- `Payments`
- `Withdrawals`

Nguyen tac dieu huong:

- login vao voi role `admin` -> vao `admin`
- `admin` mo `Finance Ops` thi thay finance tabs, khong nhay sang shared `WalletPage`
- neu can xem wallet, admin xem trong `Finance Ops -> Wallet`

### Checklist code

- [ ] Tao helper redirect theo role
- [ ] Sua `SignInPage`
- [ ] Sua `GitHubCallbackPage`
- [ ] Rà login Google flow de dung chung redirect
- [ ] Them tab `wallet` vao `Finance Ops`
- [ ] Tach admin wallet thanh panel rieng
- [ ] Gan panel wallet vao `AdminPage`
- [ ] Chan admin vao `WalletPage` dung chung

## Hien trang giao dien admin

Hien tai admin tap trung chu yeu trong [AdminPage.tsx](/E:/godot-launch-capstone/frontend/src/page/AdminPage.tsx:766) va dang co cac tab lon sau:

- `Moderation`
- `Users`
- `Payments`
- `Withdrawals`
- `Logs`
- `Settings`
- `Storage`
- `Disputes`

Van de hien tai:

- `AdminPage` dang gom qua nhieu concern trong mot file lon, kho mo rong va kho redesign tung module
- Header, KPI card, tab va content dang tron ca `ops`, `moderation`, `finance`, `system`
- Chua co `overview dashboard` dung nghia de admin vao la thay ngay muc nao can xu ly
- Dieu huong hien tai la tab ngang, khong scale tot khi so module tang len
- Mot so khu vuc van mang cam giac demo/noi bo hon la `admin product`

## Dinh huong IA moi cho admin

De xuat chia admin thanh 5 cum chuc nang ro rang:

1. `Overview`
   - KPI tong quan
   - viec can xu ly ngay
   - quick links vao moderation, withdrawals, payments, disputes

2. `Moderation`
   - game submissions
   - asset submissions
   - AI review
   - play web-demo
   - approve / reject / contract actions / store build handoff

3. `Finance Ops`
   - platform wallet
   - commission ledger
   - payment sessions
   - withdrawal queue
   - payout balance

4. `User Ops`
   - user directory
   - role / status management
   - profile and account actions

5. `System Ops`
   - audit logs
   - platform settings
   - storage
   - disputes

## Review dashboard mau

Dashboard mau ban gui co nhieu diem manh ve layout va visual hierarchy. Neu nhin theo huong inspiration, day la mot mau rat tot de hoc theo.

Diem manh:

- Co `left sidebar` ro rang, giup admin luon biet minh dang o module nao
- Co `top bar` gon, tach khoi `main content` nen bo cuc rat de doc
- KPI card duoc dat ngay dau man hinh, tao cam giac vao admin la thay nhanh tinh hinh
- Khu `chart + alert panel` cho cam giac van hanh he thong, khong chi la mot bang du lieu don thuan
- Table ben duoi duoc canh le ro, spacing tot, nhin giong mot admin product nghiem tuc
- Tong the layout co nhip dieu rat on: `sidebar -> summary -> signal -> detail`

Diem can can than neu ap vao du an cua minh:

- Mau nay mang mui `generic SaaS dashboard`, trong khi admin cua minh la `marketplace moderation + finance ops`
- Neu copy qua sat, admin se trong giong dashboard quan ly business chung chung, mat di tinh chat `review / approval / operations`
- `User Management` dang duoc dat o khu vuc rat noi bat trong mock, nhung voi du an nay `Moderation` va `Finance Ops` moi la trung tam
- Khu `Live System Alerts` chi hop neu minh that su co alert operational ro rang; neu khong thi nen doi thanh `Action Required`
- O mock, search dang o cap global. Neu he thong minh chua co global search that su cho user/game/asset/payment, thi khong nen dat qua noi bat

Ket luan:

- Nen hoc `layout skeleton` va `visual hierarchy`
- Khong nen hoc nguyen `module naming` cua mock
- Khong nen de `User Management` thanh trong tam chinh o homepage admin cua du an nay

## De xuat bo cuc admin cho du an

Neu dua tren mock va nghiep vu hien tai, bo cuc phu hop nhat la:

1. `Sidebar co dinh ben trai`
2. `Top bar nho gon`
3. `Main content theo module`
4. `Overview dashboard` la man dau tien

### 1. Sidebar

Sidebar nen la noi chua `module level navigation`, khong phai list tung tab nho.

De xuat ten khu vuc sidebar:

- `Overview`
- `Moderation`
- `Finance Ops`
- `User Ops`
- `System Ops`

Neu can chia nho hon trong moi module, thi dua vao subnav hoac tab noi bo cua module, khong nen day het ra sidebar cap 1.

Vi du:

- `Moderation`
  - Games
  - Assets
  - AI Review

- `Finance Ops`
  - Wallet
  - Payments
  - Withdrawals

- `User Ops`
  - User Directory
  - Roles & Status

- `System Ops`
  - Audit Logs
  - Storage
  - Platform Settings
  - Disputes

### 2. Top bar

Top bar nen giu rat gon, chi gom:

- breadcrumb/module title
- contextual search
- quick action neu can
- admin profile

Khong nen qua nhieu button o day, vi admin cua minh la app thao tac, khong phai landing dashboard.

### 3. Overview dashboard

Trang dau tien khong nen la `User Management` nhu mock. Doi voi du an nay, overview nen uu tien:

- `Pending Moderation`
- `Withdrawal Queue`
- `Platform Wallet`
- `Recent Payments`
- `Open Disputes`
- `Recent Audit Alerts`

Hang content de xuat:

1. Hang 1:
   - 4 KPI cards
   - pending moderation
   - payout queue
   - platform wallet
   - open disputes

2. Hang 2:
   - `Marketplace Activity` chart
   - `Platform Snapshot`

3. Hang 3:
   - `Moderation queue preview`
   - `Audit/security preview`

Nghia la:

- overview phai dan admin den noi can thao tac
- khong bien overview thanh trang bao cao dep ma khong giup van hanh

### 3.1 Thay `Action Required` bang chart

Huong moi:

- Khong dung `Action Required` dang 4 card lon nua
- Thay bang 1 chart lon o cot trai cua hang 2
- Chart nay phai phuc vu admin marketplace, khong phai chart business chung chung

Ten chart de xuat:

- `Marketplace Activity`
- hoac ro nghiep vu hon: `New Listings vs Sold`

Ly do chon chart nay:

- Phu hop nghiep vu du an ban `source code` va `asset`
- Admin nhin nhanh duoc cung luc 2 lop:
  - luong hang moi dang vao marketplace
  - luong hang da ban ra
- De biet he thong dang nghieng ve:
  - listing tang nhung ban cham
  - hang ban tot nhung listing moi giam
  - can uu tien moderation de giai phong hang cho marketplace

Series nen the hien:

- `Source Code - Listings`
- `Source Code - Sold`
- `Asset - Listings`
- `Asset - Sold`

Kieu chart:

- `grouped bar chart`
- Moi moc thoi gian hien 4 cot
- Nhom mau theo nghiep vu:
  - `Source Code` dung xanh duong
  - `Asset` dung xanh la
  - `Listings` la tone dam hon
  - `Sold` la tone sang hon

Khoang thoi gian:

- Mac dinh: `5 tuan gan nhat` hoac `6 tuan gan nhat`
- Toggle sau nay co the them:
  - `7D`
  - `30D`
  - `12W`

Vi sao hop de thay cho `Action Required`:

- `Action Required` hien tai mang tinh static va bi chia nho qua muc
- Chart moi tao cam giac dashboard that hon, giong admin product chuyen nghiep hon
- Van giu duoc y nghia operational neu ben tren hoac ben duoi chart co 1 dong tom tat ngan:
  - `Pending moderation`
  - `Withdrawal queue`
  - `Maintenance`

Nguyen tac bo cuc:

- Giu nguyen vi tri cot trai hang 2, chi thay panel cu bang chart card
- Cot phai van la `Platform Snapshot`
- Chieu cao chart card nen ngang hoac nhinh hon `Platform Snapshot` de can bo cuc
- Legend dat tren chart, de doc nhanh va it roi mat

Noi dung quanh chart nen toi gian:

- Tieu de ngan
- 1 subtitle rat ngan hoac bo subtitle neu da du ro
- 1 bo loc thoi gian nho gon ben phai
- Tooltip khi hover de hien:
  - ten tuan / khoang ngay
  - tung metric
  - tong listing va tong sold cua moc do

Quick action se doi cho:

- Khong mat di hoan toan
- Dua xuong hang duoi duoi dang `Quick Access` gon hon
- Hoac dua thanh 1 dong badge/action chip nho o dau khu `Moderation Preview`

Plan implement UI:

1. Doi ten khu `Action Required` thanh `Marketplace Activity`
2. Thay 4 action card bang chart card co legend va bo loc thoi gian
3. Giu `Platform Snapshot` o cot phai de bo cuc van can
4. Chuyen cac quick action quan trong xuong khu `Quick Access`
5. Dung du lieu mock truoc de chot visual
6. Sau khi chot giao dien moi wire vao du lieu that

Plan data sau khi code UI:

- Phase 1:
  - dung mock data hoac map tu du lieu dang co trong page
- Phase 2:
  - backend tra ve du lieu aggregate theo tuan
  - tach theo `source code` va `asset`
  - tach theo `listed` va `sold`

Dieu can tranh:

- Khong dung chart doanh thu o vi tri nay, vi row nay dang noi ve `marketplace flow`, khong phai `finance`
- Khong nhet qua nhieu series khac nhu refund, dispute, withdrawal vao cung card
- Khong bien chart thanh analytics qua ky thuat; admin overview phai doc trong vai giay

### 4. Page ben trong tung module

Sau `Overview`, moi module nen theo mot khung chung:

- `module header`
- `filter/search row`
- `primary list/table`
- `detail panel` hoac `detail page`
- `action area`

Khung nay hop voi:

- moderation
- payments
- withdrawals
- user directory
- logs

## Goi y ten cho sidebar va shell

Ten tong cua khu admin:

- Khuyen nghi: `Admin Control Center`
- Thay the 1: `Platform Control Center`
- Thay the 2: `Admin Operations`

Khuyen nghi cua minh:

- Neu muon nghe manh, premium, ro vai tro: `Admin Control Center`
- Neu muon nghe operational hon, it marketing hon: `Admin Operations`

Ten item sidebar nen dung:

- `Overview`
- `Moderation`
- `Finance Ops`
- `User Ops`
- `System Ops`

Ly do:

- ngan
- ro vai tro
- scale tot khi them module
- phu hop hon cac ten generic kieu `Dashboard`, `Billing`, `CMS`, `Support Tickets`

## Plan truoc khi code giao dien

1. Chot `visual direction`
   - hoc layout tu mock
   - khong copy naming generic

2. Chot `admin shell`
   - sidebar trai
   - top bar
   - overview page

3. Chot `sidebar naming`
   - `Overview`
   - `Moderation`
   - `Finance Ops`
   - `User Ops`
   - `System Ops`

4. Chot `homepage priority`
   - moderation va finance len truoc user management

5. Chot `module priority khi code`
   - `Overview`
   - `Moderation`
   - `Finance Ops`
   - `User Ops`
   - `System Ops`

## Ke hoach redesign UI admin

### Phase 1 - Chot scope va map module

Muc tieu:

- Chot admin chi redesign pham vi `admin-only`
- Giu cac man dung chung voi `developer/customer` ra khoi scope giao dien admin dot nay

Viec can lam:

- Chot danh sach module UI trong admin:
  - `Overview`
  - `Moderation`
  - `Finance Ops`
  - `User Ops`
  - `System Ops`
- Ghi ro nhung gi khong lam trong dot nay:
  - khong redesign `UploadPage`
  - khong redesign `DashboardPage` cua developer
  - khong lam `admin override flow`

### Phase 2 - Tach layout admin dung nghia

Muc tieu:

- Bien admin tu mot page tab lon thanh mot shell co cau truc ro

De xuat:

- Tao `AdminLayout` rieng
- Doi tu `tab ngang` sang `sidebar module` + `content area`
- Co `top summary bar` nho gon:
  - ten khu vuc
  - breadcrumb/module title
  - quick actions
  - admin profile/status

Ket qua mong muon:

- De them module moi ma khong lam vo toan bo page
- Dieu huong admin ro hon ngay tu lan nhin dau

### Phase 3 - Lam lai overview dashboard

Muc tieu:

- Khi vao admin, thay ngay thong tin van hanh quan trong nhat

Overview dashboard nen co:

- `Pending moderation`
- `Withdrawal queue`
- `Recent payments`
- `Platform wallet / payout balance`
- `Open disputes`
- `Recent audit alerts`

Nguyen tac:

- KPI card chi de dan huong, khong nhai lai toan bo du lieu chi tiet
- Moi card phai co CTA ro:
  - `Review queue`
  - `Open finance ops`
  - `View disputes`
  - `See logs`

### Phase 4 - Redesign tung module theo workflow

Muc tieu:

- Moi module phai phan thanh `list -> detail -> action`

Thu tu uu tien code:

1. `Moderation`
2. `Finance Ops`
3. `User Ops`
4. `System Ops`

Huong UI cho tung module:

- `Moderation`
  - list submissions
  - filter theo loai/trang thai
  - panel detail ben phai hoac detail page rieng
  - action ro: approve, reject, view AI review, play demo

- `Finance Ops`
  - tach ro `platform wallet` khoi `withdrawal queue`
  - payments va withdrawals la 2 khu vuc con rieng
  - nhan manh so du ops, commission, payout readiness

- `User Ops`
  - search/filter la trung tam
  - action panel ro cho role/status
  - han che modal chong cheo neu khong can

- `System Ops`
  - logs, settings, storage, disputes la 4 module con
  - uu tien tinh doc, trace, filter

### Phase 5 - Refactor code theo dung layer frontend

Muc tieu:

- Khong de `AdminPage.tsx` tiep tuc gom het logic UI

De xuat tach file:

- `frontend/src/page/AdminPage.tsx`
  - chi giu route shell va module switch
- `frontend/src/components/admin/layout/*`
  - layout, sidebar, header, overview cards
- `frontend/src/components/admin/moderation/*`
- `frontend/src/components/admin/finance/*`
- `frontend/src/components/admin/users/*`
- `frontend/src/components/admin/system/*`

Nguyen tac:

- data fetching theo module
- component presentation tach khoi page orchestration
- khong nhai logic action giua cac panel

### Phase 6 - Polish va responsive

Muc tieu:

- Admin dung tot tren laptop va desktop, khong vo layout khi nhieu bang du lieu

Can dam bao:

- sidebar collapse tot
- table co sticky header khi can
- filter bar khong vo tren man hinh hep
- modal/detail panel nhat quan
- visual hierarchy ro giua alert, pending action, info, success

## Thu tu implement de vao code

1. Refactor `AdminPage` thanh shell + module components
2. Dung layout moi: sidebar, top bar, content area
3. Lam `Overview` truoc de dinh visual language
4. Lam lai `Moderation`
5. Lam lai `Finance Ops`
6. Lam lai `User Ops`
7. Lam lai `System Ops`
8. QA responsive va cleanup

## Definition of done cho phase UI nay

- Admin co `layout` rieng, khong con phu thuoc vao tab ngang hien tai lam trung tam
- Co `overview dashboard` dung nghia
- Cac module chinh duoc tach ro: `Moderation`, `Finance Ops`, `User Ops`, `System Ops`
- `web-demo` van hien dien trong moderation
- Wallet/admin finance duoc dat dung ngu canh `platform ops`, khong con cam giac creator wallet
- Code frontend admin duoc tach nho hon, de tiep tuc mo rong

## Dau vao can ban gui tiep

Sau tai lieu nay, ban gui cho minh dashboard admin mau ban muon huong toi. Khi co mock do, minh se:

- doi chieu voi IA o tren
- de xuat map module tu mock sang code hien tai
- chot thu tu code UI module nao truoc
- bat dau implement tung phan theo checklist

## Muc tieu

Tai lieu nay tach ro cac man hinh va chuc nang ma `admin` hien dang truy cap duoc thanh 3 nhom:

1. `Admin-only`
2. `Admin dang dung chung voi Developer`
3. `Admin dang dung chung voi Customer`

Ghi chu:

- Mot so man hinh dang giao thoa ca `developer` va `customer`. Trong tai lieu nay, minh xep theo use-case chinh de de redesign UI admin.
- Nguon xac dinh den tu `frontend/src/App.tsx`, `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/page/AdminPage.tsx` va cac controller backend co `@PreAuthorize`.

## Nguyen nhan ky thuat hien tai

`admin` di qua duoc nhieu man hinh dung chung vi:

- `ProtectedRoute` cho phep `admin` di qua route co `requiredRole="developer"`.
- Cac route chi can dang nhap (`ProtectedRoute` khong set `requiredRole`) deu cho `admin` vao.
- Backend cung mo nhieu API cho `ADMIN` trong cac luong von dang phuc vu `developer` hoac `customer`.

## So do tong quan

```text
Admin UI Surface
|
+-- 1. Admin-only
|   |
|   +-- /admin
|       |
|       +-- Moderation Queue
|       |   +-- Game submissions
|       |   +-- Asset submissions
|       |   +-- Approve / Reject
|       |   +-- Download ZIP
|       |   +-- View screenshots / video / web demo
|       |   +-- AI review report
|       |   +-- Contract offer / re-offer
|       |   +-- Upload build len Google Play
|       |
|       +-- User Directory
|       |   +-- Search / filter users
|       |   +-- Edit name / email
|       |   +-- Change role
|       |   +-- Suspend / activate / ban
|       |
|       +-- Payments
|       |   +-- Danh sach payment PayOS
|       |   +-- Payment detail
|       |
|       +-- Withdrawals
|       |   +-- Queue rut tien
|       |   +-- Approve / Reject
|       |   +-- Sync payout status
|       |   +-- Xem admin payout balance
|       |
|       +-- System Logs
|       |   +-- Filter theo action / target / actor / IP
|       |
|       +-- Platform Settings
|       |   +-- Commission rate
|       |   +-- Maintenance mode
|       |   +-- Announcement banner
|       |
|       +-- Storage
|       |   +-- Search / preview / download / delete file
|       |
|       +-- Disputes
|           +-- Xem toan bo tranh chap
|           +-- Phan xu tranh chap
|
+-- 2. Admin dang dung chung voi Developer
|   |
|   +-- /upload
|   |   +-- Tao game draft
|   |   +-- Tao marketplace item
|   |   +-- Upload media / package
|   |   +-- Submit GitHub repo
|   |   +-- Upload web demo
|   |
|   +-- /dashboard
|   |   +-- My games
|   |   +-- My marketplace items
|   |   +-- Contracts
|   |   +-- Sales stats
|   |   +-- Repo workspace
|   |
|   +-- /path
|   |   +-- Chon luong creator / commercial program
|   |
|   +-- /developer-onboarding
|   |   +-- Admin vao duoc
|   |   +-- He thong xem admin nhu da la developer
|   |
|   +-- /wallet
|       +-- Xem vi / transactions / withdrawals
|       +-- Tao withdrawal
|       +-- Mang use-case creator finance la chinh
|
+-- 3. Admin dang dung chung voi Customer
    |
    +-- /
    |   +-- Home / Explore
    |
    +-- /marketplace
    |   +-- Browse san pham
    |
    +-- /detail/:id
    |   +-- Xem chi tiet san pham
    |   +-- Add to cart / Buy now
    |
    +-- /checkout
    |   +-- Thanh toan bang vi
    |
    +-- /payment
    +-- /payment/success
    +-- /payment/failed
    +-- /payment/cancelled
    |
    +-- /community
    +-- /community/detail/:id
    +-- /profile/:authorId
    |
    +-- /chat
    |
    +-- /profile
```

## 1. Admin-only

Day la nhom nen duoc xem la pham vi redesign chinh cua UI admin.

### Route chinh

- ` /admin`

### Tab va chuc nang ben trong

| Khu vuc | Chuc nang hien tai |
| --- | --- |
| `Moderation Queue` | Duyet game, duyet asset, reject, download goi ZIP, xem thumbnail, screenshot, video, web demo, xem AI review, tao hop dong, chao lai hop dong, theo doi push Google Play |
| `User Directory` | Search, filter, view detail, edit user, doi role, suspend, activate, ban |
| `Payments` | Xem payment sessions PayOS, mo payment detail |
| `Withdrawals` | Xem queue rut tien, approve, reject, sync payout, theo doi tien ve tai khoan nguoi dung |
| `System Logs` | Loc audit log theo action, target, actor ID, target ID, IP |
| `Platform Settings` | Sua commission, maintenance mode, announcement banner |
| `Storage` | Search, preview, download, delete file he thong |
| `Disputes` | Xem toan bo tranh chap va phan xu |

### API admin rieng

- `/api/v1/admin/games/**`
- `/api/v1/admin/payments/**`
- `/api/v1/admin/withdrawals/**`
- `/api/v1/admin/payout/**`
- `/api/v1/admin/platform-settings`
- `/api/v1/admin/audit-logs`
- `/api/v1/admin/ai-reviews/**`
- `/api/admin/storage/**`
- `/api/v1/disputes/**` voi cac action admin
- `/api/v1/users` cac action admin

### Y nghia cho redesign

- Day la khu vuc can tach visual language ro nhat khoi user app.
- Nen duoc coi la `admin command center`.
- Co the chia tiep theo module: `Moderation`, `Finance Ops`, `User Ops`, `System Ops`, `Legal & Disputes`.

## 2. Admin dang dung chung voi Developer

Day la nhom route ma admin di vao duoc vi frontend va backend dang xem admin la mot superset cua developer.

### Route / man hinh

| Route | Man hinh | Admin dang lam duoc gi |
| --- | --- | --- |
| `/upload` | `UploadPage` | Tao draft game/asset, upload media, upload package, submit GitHub repo, upload web demo |
| `/dashboard` | `DashboardPage` | Xem my games, my marketplace items, contracts, sales stats, repo workspace |
| `/path` | `PathPage` | Xem va chon creator program |
| `/developer-onboarding` | `DeveloperOnboardingPage` | Admin vao duoc va he thong xem nhu da la developer |
| `/wallet` | `WalletPage` | Xem vi, transactions, withdrawals; ve nghiep vu admin van can wallet vi hoa hong nen tang di vao vi admin, nhung UI hien tai dang nghieng creator finance |

### Luu y redesign

- Nhung man nay hien chua phan biet ro `admin acting as creator`.
- Neu redesign admin sau nay tach biet hon, can quyet dinh:
  - Giu admin duoc vao nhu mot cong cu test/noi bo
  - Hay tach hoan toan khoi UI admin

### Ranh gioi nen xem xet

- `dashboard` va `upload` mang tinh `creator workspace`, khong nen de nguoi dung admin bi lan voi `admin control center`.
- `wallet` van nen ton tai cho admin, nhung can duoc redesign thanh `admin finance wallet` thay vi cam giac `creator wallet`.

## 3. Admin dang dung chung voi Customer

Day la nhom route admin vao duoc vi chi can dang nhap, hoac vi admin cung dang duoc phep di qua flow mua hang.

### Route / man hinh

| Route | Man hinh | Admin dang lam duoc gi |
| --- | --- | --- |
| `/` | `HomePage` | Xem explore/home |
| `/marketplace` | `MarketplacePage` | Browse marketplace |
| `/detail/:id` | `DetailPage` | Xem chi tiet, add to cart, buy now |
| `/checkout` | `CheckoutPage` | Mua hang bang vi |
| `/payment` | `PaymentDetailPage` | Vao duoc route payment |
| `/payment/success` | `PaymentResultPage` | Vao duoc route ket qua payment |
| `/payment/failed` | `PaymentResultPage` | Vao duoc route ket qua payment |
| `/payment/cancelled` | `PaymentResultPage` | Vao duoc route ket qua payment |
| `/community` | `CommunityPage` | Xem cong dong |
| `/community/detail/:id` | `CommunityDetailScreen` | Xem chi tiet bai dang |
| `/profile/:authorId` | `ProfileScreen` | Xem profile author |
| `/chat` | `ChatScreen` | Chat voi user khac |
| `/profile` | `ProfilePage` | Sua profile ca nhan |

### Luu y redesign

- Day khong phai admin UI dung nghia, ma la `storefront/user app`.
- Admin dang vua co the quan tri, vua co the hanh xu nhu mot buyer tren cung shell giao dien.
- Neu muon trai nghiem admin sach hon, co the tach:
  - `Admin app`
  - `Storefront user app`

## Cac diem lech can ghi nho

### 1. Admin vao duoc, nhung khong phai luc nao cung dung tron ven

- `payment` route mo cho admin, nhung `App.tsx` dang khong load payment history cho admin.
- `wallet top-up` hien UI cho admin, nhung API top-up chi cho `customer/developer`, de gap `403`.

### 2. Admin dang la superset role o frontend

- `ProtectedRoute` dang cho phep `admin` di qua route `requiredRole="developer"`.
- Dieu nay la ly do chinh khien `admin` cham vao duoc `upload`, `dashboard`, `wallet`.

### 3. Admin-only va creator flow dang nam trong cung mot app shell

- Header, dieu huong va cam nhan giao dien chua tach bach giua:
  - `Operational admin`
  - `Creator workspace`
  - `Buyer/storefront`

## Backend check: admin co quyen upload source code hay asset khong

Phan nay duoc doi chieu tu `GameController`, `AssetController`, `AdminGameController`, `GameServiceImpl`, `AssetServiceImpl`.

### 1. Game / source code

- O tang `controller`, admin DUOC goi cac API creator:
  - `POST /api/v1/games`
  - `POST /api/v1/games/{id}/submit-repo`
  - `GET /api/v1/games/{id}/upload-url`
  - `POST /api/v1/games/{id}/upload-complete`
  - `POST /api/v1/games/{id}/media/upload`
  - `DELETE /api/v1/games/{id}/media`
  - `DELETE /api/v1/games/{id}/media/item`
  - `POST /api/v1/games/{id}/web-demo`

- Nhung o tang `service`, cac action tren deu bi khoa boi owner check:
  - `createGameDraft(...)` tao game gan creator = chinh tai khoan admin dang dang nhap
  - `submitGameRepo(...)` bat buoc `assertGameOwner(...)`
  - `updateGame(...)` bat buoc `assertGameOwner(...)`
  - `getPresignedUploadUrl(...)` bat buoc `assertGameOwner(...)`
  - `confirmUploadComplete(...)` bat buoc `assertGameOwner(...)`
  - `uploadGameMedia(...)` bat buoc `assertGameOwner(...)`
  - `uploadWebDemo(...)` bat buoc `assertGameOwner(...)`

- Nghia la:
  - Admin co the dung flow upload/submit nhu `developer acting mode`
  - Nhung admin KHONG co quyen upload source code, media, web demo cho game cua nguoi khac qua flow creator thong thuong

- Luu y quan trong:
  - `source code game` hien tai di theo huong `submit GitHub repo`, khong phai upload ZIP lam flow chinh
  - Nhanh `upload-complete` cho `fileType=game` chi kich hoat scan cho `game.zip`, nhung comment trong code noi file source that cua game van di qua `repo + snapshot`

### 2. Asset / package / media

- O tang `controller`, admin cung DUOC goi cac API creator:
  - `POST /api/v1/assets`
  - `PUT /api/v1/assets/{id}`
  - `GET /api/v1/assets/{id}/upload-url`
  - `POST /api/v1/assets/{id}/upload`
  - `POST /api/v1/assets/{id}/media`
  - `DELETE /api/v1/assets/{id}/media`
  - `POST /api/v1/assets/{id}/upload-complete`
  - `POST /api/v1/assets/{id}/media/upload`
  - `DELETE /api/v1/assets/{id}/media/item`

- O tang `service`, da co owner check cho nhieu action:
  - `updateAsset(...)` chi cho `seller` trung email
  - `uploadItemFile(...)` chi cho `seller` trung email
  - `uploadItemMedia(...)` chi cho `seller` trung email
  - `deleteAssetMedia(...)` chi cho `seller` trung email
  - `uploadAssetMediaProxy(...)` di qua `uploadItemMedia(...)`
  - `deleteAssetMediaByUrl(...)` di qua `deleteAssetMedia(...)`

- Nghia la:
  - Admin co the tao va upload asset cho CHINH item do tai khoan admin tao ra
  - Admin KHONG co quyen binh thuong de upload package/media cho asset cua seller khac qua cac method proxy thong thuong

### 3. Diem lech quyen o nhanh asset can danh dau

- `GET /api/v1/assets/{id}/upload-url`
  - Controller mo cho `DEVELOPER` va `ADMIN`
  - `AssetServiceImpl.getPresignedUploadUrl(...)` KHONG check owner, KHONG nhan `principal`
  - Ket qua: ve ly thuyet, bat ky `developer/admin` dang dang nhap nao cung co the xin presigned URL cho item cua nguoi khac neu biet `itemId`

- `POST /api/v1/assets/{id}/upload-complete`
  - Controller mo cho `DEVELOPER` va `ADMIN`
  - Controller KHONG truyen `principal`
  - `AssetServiceImpl.confirmUploadComplete(...)` KHONG check owner
  - Ket qua: bat ky `developer/admin` nao biet `itemId` va `objectKey` deu co the gan `fileUrl` moi vao asset do va kick off virus scan

- Day la 1 `permission gap` o backend:
  - Khong phai admin duoc cap quyen moderation upload ro rang
  - Ma la phan quyen asset dang khong dong deu giua `upload proxy` va `presigned upload flow`

### 4. Admin-only upload that su

- Co 1 nhanh upload ma admin duoc quyen rieng va khong phai creator flow:
  - `POST /api/v1/admin/games/{id}/store-build`

- Nhanh nay:
  - Chi `ROLE_ADMIN` duoc goi
  - Dung de upload `APK/AAB` len Google Play sau khi game da vao trang thai `awaiting_store_build`
  - Day la quyen `ops/publishing` cua admin, khac voi quyen upload source code hay asset package cua creator

### 5. Ket luan backend cho redesign admin

- `Admin` hien tai co `entry permission` de di vao cac flow upload cua creator.
- Nhung voi `game/source code`, backend service dang khoa theo owner kha chat.
- Voi `asset`, backend service khong dong deu:
  - Proxy upload thi khoa theo owner
  - Presigned upload flow thi dang thieu owner check
- `Admin` van nen duoc xem/chay `web-demo` cua game de moderation; cai can chan la `upload web-demo` qua creator flow, khong phai kha nang play demo.
- Neu muon tach vai tro admin ro hon khi redesign:
  - Nen xem `creator upload` la mot mode rieng
  - Khong nen mac dinh admin co quyen sua/upload noi dung creator cua nguoi khac
  - Can fix nhanh `asset upload-url` va `asset upload-complete` neu muon phan quyen backend an toan va nhat quan

## Quyet dinh nghiep vu da chot

Day la huong phan quyen can xem la `target state`:

### 1. Source code

- `Admin` KHONG duoc upload source code.
- `Admin` KHONG duoc submit repo GitHub thay creator.
- `Admin` KHONG duoc dung creator flow de sua source/game package.
- Source code la phan `content ownership`, khong phai `ops authority`.

### 2. Asset / package / media

- `Admin` KHONG duoc upload trong flow thong thuong.
- Neu that su can can thiep, chi di qua `admin override flow` rieng.
- `Admin override flow` phai co:
  - `reason`
  - `ticketId`
  - `audit log`
  - `notification cho owner`
  - `version/revision moi`
  - khong ghi de am tham len file hien tai

### 3. Store build / publishing artifact

- `Admin` DUOC phep upload `APK/AAB` de submit store.
- Day la quyen `ops/publishing`, khong phai quyen so huu noi dung creator.
- Nhanh nay tiep tuc duoc giu rieng o `admin-only`.

### 4. Web-demo

- `Admin` VAN duoc xem/chay `web-demo` cua game.
- Muc dich la de `moderation` va `review quality`, khong phai de admin so huu noi dung.
- Cai can chan la:
  - `upload web-demo` qua creator flow
  - `sua web-demo` cua creator qua creator flow
- Cai can giu la:
  - kha nang `Play Demo` trong admin moderation
  - kha nang mo `web-demo` de xem game co chay duoc hay khong

### 5. Wallet admin

- `Admin` VAN nen co wallet.
- Ly do nghiep vu:
  - khi san pham ban duoc, phan hoa hong cua nen tang can di vao vi admin/he thong
- Tuy nhien:
  - UI hien tai cua `WalletPage` dang nghieng creator finance
  - ve redesign sau nay nen tach thanh `admin finance wallet` hoac `platform balance wallet`

## Ma tran quyen dich

| Nhom chuc nang | Developer owner | Admin mac dinh | Admin override | Ghi chu |
| --- | --- | --- | --- | --- |
| Tao game draft | Co | Khong | Khong | Neu admin can test thi dung tai khoan dev noi bo |
| Submit repo source code | Co | Khong | Khong | Khong mo override cho source code |
| Upload game media | Co | Khong | Khong | Thuoc creator content |
| Upload web-demo | Co | Khong | Khong | Chan admin upload qua creator flow |
| Xem / choi web-demo de moderation | Co | Co | Khong can | Day la review capability, khong phai upload capability |
| Tao asset draft | Co | Khong | Khong | Admin khong dung creator workspace de dang ban |
| Upload asset package/media | Co | Khong | Co | Chi qua flow override rieng, co case va audit |
| Xem wallet / commission cua admin | Khong | Co | Khong can | Can giu lai cho finance ops cua nen tang |
| Approve / reject game | Khong | Co | Khong can | Day la moderation |
| Approve / reject asset | Khong | Co | Khong can | Day la moderation |
| Upload store build APK/AAB | Khong | Co | Khong can | Day la publishing ops |

## Pham vi hien tai

Trong giai doan hien tai, chi chot va thuc thi cac diem sau:

- Chua lam `admin override flow`.
- Chua mo rong them `ticket`, `case`, `revision`, `rollback` cho override.
- Tap trung vao `hardening permission` truoc.
- `Admin` van duoc `xem/chay web-demo` de review game.
- `Admin` van can `wallet` de theo doi dong tien hoa hong cua nen tang.
- Cac noi dung `override` chi giu lai trong docs nhu `future scope`, chua phai pham vi implement ngay.

## Backend-first plan

Muc tieu cua phase backend dau tien:

- Dua backend ve dung ranh gioi role `admin`.
- Chan `admin` khoi creator upload flow.
- Giu `admin-only ops` va `admin review capability`.
- Khong dong den `admin override flow` trong phase nay.

### 1. Chia lai route backend theo 4 nhom

#### Nhom A - Giu nguyen `admin-only`

- Cac route nay tiep tuc chi cho `ROLE_ADMIN`:
  - `/api/v1/admin/games/**`
  - `/api/v1/admin/payments/**`
  - `/api/v1/admin/withdrawals/**`
  - `/api/v1/admin/payout/**`
  - `/api/v1/admin/platform-settings`
  - `/api/v1/admin/audit-logs`
  - `/api/v1/admin/ai-reviews/**`
  - `/api/admin/storage/**`

Y nghia:

- Day la nhom `ops`, `moderation`, `finance`, `system`.
- Khong tron voi creator flow.

#### Nhom B - Chan `admin` khoi creator upload flow

- Doi tu `hasAnyRole('DEVELOPER', 'ADMIN')` ve chi cho `DEVELOPER` o cac route:

Game:

- `POST /api/v1/games`
- `POST /api/v1/games/{id}/submit-repo`
- `GET /api/v1/games/{id}/upload-url`
- `POST /api/v1/games/{id}/upload-complete`
- `POST /api/v1/games/{id}/media/upload`
- `DELETE /api/v1/games/{id}/media`
- `DELETE /api/v1/games/{id}/media/item`
- `POST /api/v1/games/{id}/web-demo`

Asset:

- `POST /api/v1/assets`
- `PUT /api/v1/assets/{id}`
- `GET /api/v1/assets/{id}/upload-url`
- `POST /api/v1/assets/{id}/upload`
- `POST /api/v1/assets/{id}/media`
- `DELETE /api/v1/assets/{id}/media`
- `POST /api/v1/assets/{id}/upload-complete`
- `POST /api/v1/assets/{id}/media/upload`
- `DELETE /api/v1/assets/{id}/media/item`

Y nghia:

- `Admin` khong con duoc upload `source code`, `asset/package/media`, `web-demo` qua flow creator.

#### Nhom C - Giu `admin review capability`

- Cac route xem/noi dung review van cho admin vao duoc:
  - `GET /api/v1/games/**`
  - `GET /api/v1/games/*/web-demo/**`
  - cac route doc asset/game de phuc vu moderation

Y nghia:

- `Admin` van xem duoc noi dung.
- `Admin` van choi duoc `web-demo`.
- `Admin` mat quyen `upload`, khong mat quyen `review`.

#### Nhom D - Giu `admin finance visibility`, xem lai `admin self-service finance`

- Giu cho admin:
  - `GET /api/v1/wallets/me`
  - `GET /api/v1/wallets/me/transactions`

- Can xem lai trong phase backend nay:
  - co de `admin` di qua flow `/api/v1/wallets/withdrawals/**` hay khong
  - co de `admin` dung `/api/v1/payments/topup` hay khong

Khuyen nghi tam thoi:

- `Admin` duoc xem wallet va transaction history.
- `Admin` KHONG nen dung top-up flow thong thuong.
- `Admin` withdrawal neu co nhu cau nen tach thanh finance ops rule rieng, khong dung mac dinh creator withdrawal flow.

##### Ket qua audit wallet hien tai

- Dang on:
  - `admin-only finance ops` da tach rieng qua:
    - `/api/v1/admin/payout/**`
    - `/api/v1/admin/withdrawals/**`
    - `/api/v1/admin/payments/**`
  - `Admin` van co the dung:
    - `GET /api/v1/wallets/me`
    - `GET /api/v1/wallets/me/transactions`
  - `Admin` da bi chan khoi `top-up create` va `my-payments` o backend.

- Xung dot can ghi nho:
  - `DeveloperWithdrawalController` truoc day con mo `admin` vao:
    - `/api/v1/wallets/summary`
    - `/api/v1/wallets/sales-stats`
    - `/api/v1/wallets/withdrawals/**`
  - `WalletPage` dang dung chung da coi `admin` nhu `khong phai customer`, nen bi troi sang UI creator wallet.
  - `WalletPage` truoc day con goi `GET /api/v1/payments/my-payments` de resume top-up, nhung backend khong cho `admin` vao route nay.

- Chot xu ly phase nay:
  - `Admin` chi di qua `wallet balance + transaction history`.
  - `Admin` khong di qua `summary/sales-stats/withdrawals/top-up resume` cua shared self-service wallet flow.
  - UI wallet admin tam thoi chi hien thong tin vi admin va ledger, khong hien top-up hay self-withdrawal.
  - `PaymentServiceImpl` da duoc dong bo voi `OrderServiceImpl`:
    - PayOS purchase se cong `platform commission` vao `admin/platform wallet`
    - va tao transaction `TxnType.commission` trong ledger noi bo

- De lai phase sau:
  - Tiep tuc doi soat va thong nhat bao cao tai chinh tren UI/admin dashboard dua tren ledger da duoc ghi dung.
  - Neu can `admin finance dashboard` day du hon, tach rieng khoi `WalletPage` dung chung.

### 2. Siet lai service logic, khong chi rely vao router

Can lam o service:

- `GameServiceImpl`
  - Giu owner check nhu hien tai
  - Khong them shortcut cho `admin`

- `AssetServiceImpl`
  - Bat buoc truyen `principal` vao:
    - `getPresignedUploadUrl(...)`
    - `confirmUploadComplete(...)`
  - Them owner check dong deu nhu cac method upload proxy da co

- `Withdrawal / wallet / payment service`
  - Tach ro `admin viewing own platform wallet` voi `creator/customer self-service finance`
  - Neu service dang cho `admin` di qua creator flow vi role superset, can chan lai o service guard

Nguyen tac:

- Router chi la lop dau.
- Service moi la noi chot quyet dinh cuoi cung.

### 3. Chot rule backend cho tung capability

Rule backend nen duoc chot ro:

- `Admin`:
  - duoc `moderate`
  - duoc `publish store build`
  - duoc `view wallet/transactions` cua minh
  - duoc `play web-demo`
  - khong duoc `submit source`
  - khong duoc `upload asset`
  - khong duoc `upload web-demo`

- `Developer`:
  - duoc full creator flow tren noi dung cua chinh ho

- `Customer`:
  - duoc flow mua hang, thanh toan, vi ca nhan

### 4. Thu tu implement backend

1. Sua `@PreAuthorize` o controller game/asset
2. Fix `AssetServiceImpl` owner check cho `upload-url` va `upload-complete`
3. Ra soat `wallet/payment/withdrawal` endpoint nao dang cho admin di qua flow creator
4. Them service guard neu behavior hien tai dang dung role superset
5. Test lai toan bo route matrix theo 3 role

### 5. Definition of done cho backend phase nay

- `Admin` khong goi duoc creator upload route cua game
- `Admin` khong goi duoc creator upload route cua asset
- `Admin` van xem/choi duoc `web-demo`
- `Admin` van upload duoc `store build`
- `Admin` van xem duoc wallet va transaction cua chinh minh
- `Asset upload-url` va `asset upload-complete` khong con lo hong owner check
- Logic service khong con ngam xem `admin` la `developer superset` trong cac nhanh upload

## Backend implementation checklist

### BE-01 - Route matrix audit

- Muc tieu:
  - Chot danh sach route nao `admin` duoc giu, route nao phai chan
- File can ra soat:
  - `GameController.java`
  - `AssetController.java`
  - `WalletController.java`
  - `PaymentController.java`
  - `DeveloperWithdrawalController.java`
  - `SecurityConfig.java`
- Done khi:
  - Co bang route matrix cuoi cung cho `admin / developer / customer`

### BE-02 - Lock creator upload routes

- Muc tieu:
  - Bo `ADMIN` khoi creator upload flow
- Viec can lam:
  - Sua `@PreAuthorize` o `GameController`
  - Sua `@PreAuthorize` o `AssetController`
- Khong dong vao:
  - `GET /api/v1/games/*/web-demo/**`
  - `/api/v1/admin/games/{id}/store-build`
- Done khi:
  - `Admin` bi `403` o cac route upload creator

### BE-03 - Asset owner-check hardening

- Muc tieu:
  - Dong lo hong quyen o flow presigned upload asset
- Viec can lam:
  - Truyen `principal` vao `getPresignedUploadUrl(...)`
  - Truyen `principal` vao `confirmUploadComplete(...)`
  - Them owner check dong deu trong `AssetServiceImpl`
- Done khi:
  - `Admin` va `developer` khong so huu item deu khong the upload/confirm cho item cua nguoi khac

### BE-04 - Preserve admin review capability

- Muc tieu:
  - Chan upload nhung van giu review
- Viec can lam:
  - Giu `GET /api/v1/games/**`
  - Giu `GET /api/v1/games/*/web-demo/**`
  - Giu cac route moderation admin-only
- Done khi:
  - `Admin` van mo duoc detail game va `Play Demo`

### BE-05 - Finance route cleanup for admin

- Muc tieu:
  - Tach `admin finance visibility` khoi `creator self-service finance`
- Viec can lam:
  - Giu `GET /api/v1/wallets/me`
  - Giu `GET /api/v1/wallets/me/transactions`
  - Ra soat `PaymentController` va `DeveloperWithdrawalController`
  - Quyet dinh route nao `admin` chi duoc xem, route nao khong duoc dung
- Done khi:
  - `Admin` van xem duoc vi cua minh
  - `Admin` khong di qua nham top-up / withdrawal flow neu nghiep vu khong cho

### BE-06 - Service guard hardening

- Muc tieu:
  - Khong de logic service ngam coi `admin` la `developer`
- Viec can lam:
  - Ra soat `GameServiceImpl`
  - Ra soat `AssetServiceImpl`
  - Ra soat cac service finance lien quan
  - Them guard neu controller da khoa nhung service van co nhanh superset
- Done khi:
  - Rule role dung o ca controller va service

### BE-07 - Regression test matrix

- Muc tieu:
  - Dam bao sua permission khong gay vo flow hien co
- Can test:
  - `Admin`
  - `Developer owner`
  - `Developer non-owner`
  - `Customer`
- Done khi:
  - Co checklist test pass cho game upload, asset upload, web-demo, wallet, payment, withdrawal, store build

## Ke hoach thuc thi

Trong pham vi hien tai, nen lam theo thu tu `backend hardening -> frontend cleanup -> rollout`.

Ghi chu:

- `Admin override flow` la pham vi de sau.
- Cac phase ve `override`, `case`, `revision` ben duoi chi nen xem la `future note`.

### Phase 1 - Khoa quyen va hardening backend

Muc tieu:

- Khoa ngay cac creator upload flow ma `admin` khong con duoc di vao.
- Xoa cac permission gap dang co o backend.

Viec can lam:

1. `GameController`
   - Doi cac endpoint upload/submit creator flow tu `hasAnyRole('DEVELOPER', 'ADMIN')` thanh quyen chi cho `DEVELOPER`.
   - Giu kha nang `GET /web-demo/**` de admin van choi thu demo duoc trong moderation.
   - Gom cac endpoint:
     - `POST /api/v1/games`
     - `POST /api/v1/games/{id}/submit-repo`
     - `GET /api/v1/games/{id}/upload-url`
     - `POST /api/v1/games/{id}/upload-complete`
     - `POST /api/v1/games/{id}/media/upload`
     - `DELETE /api/v1/games/{id}/media`
     - `DELETE /api/v1/games/{id}/media/item`
     - `POST /api/v1/games/{id}/web-demo`

2. `AssetController`
   - Doi creator upload endpoints thanh chi cho `DEVELOPER`.
   - Khong de `ADMIN` di vao flow upload thong thuong nua.

3. `AssetServiceImpl`
   - Bat buoc truyen `principal` vao `getPresignedUploadUrl(...)`.
   - Bat buoc truyen `principal` vao `confirmUploadComplete(...)`.
   - Them owner check dong deu cho:
     - `upload-url`
     - `upload-complete`
   - Muc tieu la dong bo voi cac method proxy upload da co owner check.

4. `Service guard`
   - Khong chi dua vao `@PreAuthorize`.
   - Them check role/scope ngay trong service cho cac nhanh nhay cam.
   - Neu can, them `PermissionPolicyService` de centralize rule thay vi viet le tung service.

5. `Frontend cleanup`
   - An cac CTA upload creator flow voi `admin`.
   - Giu nut `Play Demo` trong admin moderation.
   - Giu `wallet` cho admin, nhung danh dau la khu vuc can redesign sau theo huong `platform finance`.

### Phase 2 - Chot permission model ro rang

Muc tieu:

- Khong dung duy nhat role `admin/developer/customer` theo kieu superset mo ho.
- Dinh nghia quyen theo action.

De xuat permission:

- `GAME_SOURCE_SUBMIT_OWN`
- `GAME_MEDIA_UPLOAD_OWN`
- `ASSET_UPLOAD_OWN`
- `ASSET_OVERRIDE_REQUEST`
- `ASSET_OVERRIDE_APPROVE`
- `ASSET_OVERRIDE_EXECUTE`
- `STORE_BUILD_UPLOAD`
- `STORE_BUILD_VIEW`

Nguyen tac:

- `Developer` co quyen `*_OWN`.
- `Admin` khong co `*_OWN` cua creator flow.
- `Admin` chi co quyen `override` va `store build` neu duoc cap.
- Neu chua tach permission chi tiet ngay, van can it nhat tach logic bang service guard de dam bao behavior dung.

### Phase 3 - Tao admin override flow rieng cho asset

Muc tieu:

- Neu admin phai upload thay seller, he thong van giu duoc auditability va ownership boundary.

Nen them 1 thuc the moi, vi du:

- `AssetOverrideCase`

Truong toi thieu:

- `id`
- `assetId`
- `ownerUserId`
- `requestedBy`
- `approvedBy`
- `executedBy`
- `reason`
- `ticketId`
- `scope`
- `status`
- `expiresAt`
- `createdAt`
- `executedAt`
- `rollbackToRevisionId` neu co

Trang thai goi y:

- `requested`
- `approved`
- `rejected`
- `uploading`
- `completed`
- `cancelled`
- `expired`
- `rolled_back`

Scope goi y:

- `asset_package`
- `asset_media`
- `asset_thumbnail`
- `asset_video`

### Phase 4 - Asset revision/versioning

Muc tieu:

- Admin override khong duoc ghi de file hien tai mot cach am tham.

Can mo rong:

- Tao `AssetRevision` hoac `AssetPackageVersion`.
- Moi lan owner upload hoac admin override deu tao 1 revision moi.
- Asset hien tai tro den `currentRevisionId`.
- Luu du:
  - `objectKey/fileUrl`
  - `createdBy`
  - `createdByRole`
  - `sourceType` (`owner_upload`, `admin_override`)
  - `overrideCaseId` neu co
  - `changelog`
  - `virusScanStatus`
  - `active`

Neu chua co revision cho media:

- It nhat phai giu duoc `old file metadata` de rollback.
- Nhung phuong an dung hon van la tao bang revision rieng.

### Phase 5 - API override rieng, khong dung lai creator endpoint

Muc tieu:

- Tach hoan toan `override flow` khoi `creator flow`.

De xuat API:

1. `POST /api/v1/admin/assets/{id}/override-cases`
   - Tao request override
   - Input: `reason`, `ticketId`, `scope`, `note`

2. `POST /api/v1/admin/assets/override-cases/{caseId}/approve`
   - Duyet cho phep thuc thi override

3. `POST /api/v1/admin/assets/override-cases/{caseId}/upload-url`
   - Xin presigned URL rieng cho case da duoc approve
   - Object key phai gan voi `caseId`

4. `POST /api/v1/admin/assets/override-cases/{caseId}/upload-complete`
   - Xac nhan upload xong
   - Tao revision moi
   - Trigger virus scan / AI review / audit / notification

5. `POST /api/v1/admin/assets/override-cases/{caseId}/rollback`
   - Rollback ve revision truoc neu can

Nguyen tac ky thuat:

- Khong cho admin goi lai `/api/v1/assets/{id}/upload-url` va `/upload-complete`.
- Presigned URL phai ngan han.
- `objectKey` nen nam trong namespace rieng, vi du:
  - `admin-overrides/assets/{assetId}/{caseId}/...`

### Phase 6 - Audit log va notification

Muc tieu:

- Moi override deu truy vet duoc tu dau den cuoi.

Can mo rong `AuditAction`:

- `asset_override_requested`
- `asset_override_approved`
- `asset_override_rejected`
- `asset_override_executed`
- `asset_override_rolled_back`
- `store_build_uploaded`

Can mo rong `AuditTarget` neu can:

- `asset_override_case`
- hoac tiep tuc dung `marketplace_item` nhung can note ro `overrideCaseId`

Can mo rong `NotificationType`:

- `ASSET_OVERRIDE_REQUESTED`
- `ASSET_OVERRIDE_COMPLETED`
- `ASSET_OVERRIDE_ROLLED_BACK`
- `STORE_BUILD_STATUS`

Thong bao toi owner:

- Khi case duoc tao
- Khi case duoc execute
- Khi upload moi da thay revision hien tai
- Khi rollback neu co

### Phase 7 - Frontend admin UI

Muc tieu:

- Admin phai co giao dien rieng cho override, khong dung chung `UploadPage`.

Can them trong `AdminPage` hoac mot route admin rieng:

1. `Override Queue`
   - Danh sach case
   - Filter theo `requested / approved / completed / expired`

2. `Override Detail`
   - Asset hien tai
   - Owner
   - Reason
   - Ticket
   - Revision hien tai
   - Audit trail
   - Nut `approve`, `upload`, `complete`, `rollback`

3. `Owner visibility`
   - Trong dashboard cua seller, nen co lich su revision/override de seller nhin thay noi dung da bi admin can thiep

Dong thoi:

- Giao dien creator (`/upload`, `/dashboard`) nen an cac CTA upload voi `admin`.
- Khong de admin nhin thay hoac click duoc flow upload creator thong thuong nua.

### Phase 8 - Security va validation

Muc tieu:

- Override khong duoc tro thanh duong tac bypass security.

Bat buoc:

- Virus scan van chay
- AI review van chay neu ap dung
- Validate file type, size, mime type
- Case phai `approved` va chua `expired` moi duoc upload
- Moi case chi dung cho dung `scope`
- Moi case chi cho phep so lan upload hop ly hoac 1 lan duy nhat

De xuat them:

- Co the yeu cau `second admin approval` voi `asset_package`
- Hoac bat buoc `reason` toi thieu X ky tu va `ticketId` hop le

### Phase 9 - Testing va rollout

Muc tieu:

- Chuyen doi an toan, khong gay hieu nham role va khong mo lo hong moi.

Test can co:

- `Developer` upload owner flow van chay binh thuong
- `Admin` khong goi duoc creator upload endpoints
- `Admin` khong xin duoc presigned URL cho item/game cua nguoi khac qua flow cu
- `Admin` chi upload override duoc khi case `approved`
- Upload override tao revision moi
- Audit log, notification, rollback hoat dong dung
- `Store build` van chay rieng nhu cu

Thu tu rollout goi y:

1. Fix backend permission gap truoc
2. Hide creator upload UI cho admin
3. Ship override case backend
4. Ship override UI
5. Bat audit/notification dashboard cho admin

## Definition of done

Co the xem la hoan thanh khi dap ung du cac dieu kien sau:

- `Admin` khong con duoc upload source code qua bat ky creator endpoint nao
- `Admin` khong con duoc upload asset/package/media qua flow thong thuong
- `Asset upload-url` va `asset upload-complete` da co owner check hoac override check ro rang
- `Store build` van giu o nhanh admin-only
- `Admin override` chi ton tai o endpoint rieng
- Moi override deu co `reason`, `ticketId`, `audit log`, `notification`, `revision moi`
- Owner nhin thay duoc lich su can thiep cua admin

## Goi y pham vi redesign admin

Neu redesign theo huong ro rang va de scale, nen chot 3 tang UI:

1. `Admin Control Center`
   Chua toan bo `admin-only`

2. `Creator Workspace`
   Chua cac man dang dung chung voi `developer`

3. `Storefront Experience`
   Chua cac man dang dung chung voi `customer`

## De xuat buoc tiep theo

Sau tai lieu nay, co the lam tiep 1 trong 2 viec:

1. Ve `information architecture` moi cho admin
2. Lap bang `giu / tach / an` cho tung route hien tai de chuan bi redesign
