# GodotLaunch Context Diagram Plan

## 1. Drawing Principle

Context diagram should show GodotLaunch as one central system and the external entities around it. It should focus on system boundary, external dependencies, and high-level data flows.

Reference:
- GeeksforGeeks: https://www.geeksforgeeks.org/system-design/context-diagrams/#what-are-context-diagrams
- Mural: https://www.mural.co/blog/context-diagrams

Arrow rule:
- Use `->` when data moves in one clear direction.
- Use `<->` only when the interaction is genuinely bidirectional.
- For grading clarity, prefer two separate one-way arrows when input and output data are different.
- Label arrows with data/information nouns, not internal actions.

Example:
```text
Developer -> GodotLaunch Platform: Game information, repository URL
GodotLaunch Platform -> Developer: Submission status, notification
```

## 2. Central System

Draw one central block:

```text
GodotLaunch Platform
```

Do not draw internal implementation as separate context entities:
- Spring Boot API
- React frontend
- PostgreSQL database
- Repository/service/controller classes
- Internal database entities such as Game, Order, Payment, Wallet

These are implementation details, not external context entities.

## 3. External Entities Around GodotLaunch

Place these blocks around the central GodotLaunch Platform:

1. Developer
2. Customer / Buyer
3. Admin
4. GitHub
5. PayOS
6. SeaweedFS
7. Python AI / Identity Service
8. Google Services
9. Email / SMTP Provider
10. Google Play / App Store

`Google Play / App Store` can be drawn as optional or dashed if the diagram only focuses on current marketplace and platform operations.

## 4. Entity Mapping And Data Flows

| External entity | Related features | Data into GodotLaunch | Data out from GodotLaunch |
|---|---|---|---|
| Developer | Game submission, asset listing, KYC, contract, withdrawal, community | Game draft, GitHub repo URL, asset file/media, face image, KYC info, signature, withdrawal request, posts/comments/reactions | Submit status, AI review result, contract PDF/status, wallet balance, payout status, notifications |
| Customer / Buyer | Browse, purchase, download, review, community | Signup/login, purchase request, payment refresh request, review, posts/comments/reactions | Marketplace/game data, checkout URL, payment status, download access, notifications |
| Admin | Moderation, payout, contract, storage, users, dispute | Moderation decision, contract terms/signature, withdrawal decision/sync request, dispute resolution, storage routing/settings | Pending queues, AI reports, audit logs, payment/withdrawal details, user/storage/platform data |
| GitHub | OAuth, repo verification, source clone | OAuth profile/token response, repo ownership metadata, bot access status, source repository content | OAuth request, repo metadata request, bot invitation request, source repository request |
| PayOS | Marketplace payment, payout | Payment webhook, payment status, payout status, payout balance | Checkout request, payment cancellation/status request, payout creation request, payout status query |
| SeaweedFS | File storage | Stored file URL, file stream, delete result | File objects: media, source bundle, avatar, contract PDF, receipt, CCCD image |
| Python AI / Identity Service | Source processing, AI review, face verify, OCR | Source scan result, source snapshot, AI report, face duplicate result, OCR extracted data | Repository processing payload, media/code review payload, face image payload, OCR image payload |
| Google Services | Google OAuth, reCAPTCHA, Vision OCR | Google token validation result, reCAPTCHA verification result, OCR text result if using Vision | Google login token verification request, reCAPTCHA siteverify request, Vision OCR request |
| Email / SMTP Provider | OTP, reset password, status email | Delivery status/error if available | Signup OTP, password reset OTP, game/asset status notification |
| Google Play / App Store | External publishing | Store status, app URL, rejection/live result | Game/app submission metadata, build/package submission |

## 5. Main Flow Scenarios

### 5.1 Auth And Account

```text
Developer / Customer / Admin -> GodotLaunch Platform:
Signup data, login credentials, OAuth authorization data

GodotLaunch Platform -> Google Services:
Google token verification request, reCAPTCHA verification request

Google Services -> GodotLaunch Platform:
Verification result

GodotLaunch Platform -> Email / SMTP Provider:
OTP email, password reset email

GodotLaunch Platform -> Developer / Customer / Admin:
JWT session, user profile, login result
```

### 5.2 Game Submission

```text
Developer -> GodotLaunch Platform:
Game information, GitHub repo URL

GodotLaunch Platform -> GitHub:
Repo metadata request, bot access request, source repository request

GitHub -> GodotLaunch Platform:
Repo ownership metadata, bot access status, source repository content

GodotLaunch Platform -> Python AI / Identity Service:
Source processing and AI review request

Python AI / Identity Service -> GodotLaunch Platform:
Virus scan result, source snapshot, AI report

GodotLaunch Platform -> SeaweedFS:
Source bundle and media files

GodotLaunch Platform -> Admin:
Pending game and AI review report
```

### 5.3 Asset Marketplace Listing

```text
Developer -> GodotLaunch Platform:
Asset metadata, asset file, media

GodotLaunch Platform -> SeaweedFS:
Asset file and media files

GodotLaunch Platform -> Python AI / Identity Service:
Asset/media review request

Python AI / Identity Service -> GodotLaunch Platform:
AI review result

GodotLaunch Platform -> Admin:
Pending asset for approval

Admin -> GodotLaunch Platform:
Asset approval/rejection decision

GodotLaunch Platform -> Developer:
Approval/rejection notification
```

### 5.4 Marketplace Purchase And Payment

```text
Customer / Buyer -> GodotLaunch Platform:
Purchase request

GodotLaunch Platform -> PayOS:
Checkout creation request

PayOS -> GodotLaunch Platform:
Checkout URL, payment status, payment webhook

GodotLaunch Platform -> Customer / Buyer:
Checkout URL, payment result, download permission

GodotLaunch Platform -> Developer:
Wallet revenue update, payment notification
```

### 5.5 Withdrawal And Payout

```text
Developer -> GodotLaunch Platform:
Withdrawal request and bank info

Admin -> GodotLaunch Platform:
Withdrawal approval/rejection decision, payout sync request

GodotLaunch Platform -> PayOS:
Payout balance request, payout creation request, payout status query

PayOS -> GodotLaunch Platform:
Payout status and balance

GodotLaunch Platform -> Developer:
Withdrawal status and wallet update
```

### 5.6 KYC, Face Verification, And Contract

```text
Developer -> GodotLaunch Platform:
Face image, KYC images/info, signature

GodotLaunch Platform -> Python AI / Identity Service:
Face image payload, face registration payload, OCR image payload

Python AI / Identity Service -> GodotLaunch Platform:
Duplicate result, OCR result

GodotLaunch Platform -> SeaweedFS:
CCCD image files, contract PDF

GodotLaunch Platform -> Developer / Admin:
KYC status, contract status, signed contract
```

### 5.7 Community

```text
Developer / Customer / Admin -> GodotLaunch Platform:
Post content, comment content, reaction data, share data

GodotLaunch Platform -> Developer / Customer / Admin:
Feed update, notification, realtime community update
```

### 5.8 Admin Operations And Storage

```text
Admin -> GodotLaunch Platform:
Storage account/bucket/routing config, commission settings, moderation actions

GodotLaunch Platform -> SeaweedFS:
Configured file objects for routed storage

GodotLaunch Platform -> Admin:
Audit logs, system state, configured routing, payment/payout queues
```

### 5.9 External Publishing

```text
Admin -> GodotLaunch Platform:
External publishing request

GodotLaunch Platform -> Google Play / App Store:
Game/app submission metadata and package

Google Play / App Store -> GodotLaunch Platform:
Store status, rejection/live result, store URL

GodotLaunch Platform -> Developer / Admin:
External publish status
```

## 6. Suggested Layout

Recommended layout:

```text
                         GitHub
                           |
Developer          GodotLaunch Platform          PayOS
                           |
Customer / Buyer      SeaweedFS               Google Services
                           |
Admin             Python AI / Identity Service Email / SMTP Provider
                           |
                  Google Play / App Store
```

Better visual placement:
- Left side: Developer, Customer / Buyer, Admin
- Right side: GitHub, PayOS, SeaweedFS
- Bottom side: Python AI / Identity Service, Google Services, Email / SMTP Provider
- Optional dashed block: Google Play / App Store

## 7. Final Checklist

Before submitting the context diagram, verify:

- GodotLaunch Platform is the only central system.
- All surrounding blocks are external entities.
- Every arrow is labeled with business-level data, not class names or endpoint names.
- Internal implementation details are not shown.
- Bidirectional arrows are only used when both input and output are important.
- Main flows are covered: auth, submit/review, marketplace purchase, payout, KYC/contract, storage, community, admin operations.
