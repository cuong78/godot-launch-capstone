# 00. Tổng quan luồng nghiệp vụ

## Bản đồ tài liệu theo thứ tự flow

| Thứ tự | Tài liệu | Phạm vi |
|---:|---|---|
| 00 | Tài liệu hiện tại | Tổng quan yêu cầu nghiệp vụ |
| 01 | [JWT Session](01-jwt-session-pattern.md) | Phiên đăng nhập và revoke token |
| 02 | [GitHub OAuth](02-github-oauth.md) | Liên kết GitHub và quyền truy cập repository |
| 03 | [Face Verify & KYC](03-face-kyc-security.md) | Điều kiện danh tính để trở thành developer |
| 04 | [Source Publishing](04-source-publishing-plan.md) | Submit Game bằng repo, scan và snapshot |
| 05 | [AI Review](05-ai-review-plan.md) | Đánh giá code, media, text, tags và NSFW |
| 06 | [Plagiarism Detection](06-plagiarism-detection-plan.md) | So sánh source giữa các Game |
| 07 | [Live Preview](07-live-preview-plan.md) | Web demo cho Game |
| 08 | [Google Play Publish](08-google-play-publish-flow.md) | Hợp đồng và phát hành store |
| 09 | [Google Play API Setup](09-google-play-api-setup-guide.md) | Cấu hình credential Google Play |
| 10 | [Payment Flow](10-payment-flow.md) | Nạp tiền, thanh toán và download |
| 11 | [Payout Flow](11-payout-flow.md) | Developer rút tiền và admin payout |
| 90 | [Redis](90-redis.md) | Hạ tầng cache homepage, không thuộc business flow |

Các sequence diagram trong `docs/diagram/` giữ số thứ tự nghiệp vụ gốc từ 1 đến 6.

## Yêu cầu nghiệp vụ gốc

1. Become developer 
Mục đích: nếu chưa link github trước thì phải link , nếu đã rồi thì phải tới bước quét faceid, kyc  (hoàng)


2. push game 
1 repo nếu private thì có bot đi vào ,  2.1 nếu marketplace thì virus,lưu lại tất cả commit, ai review, admin đánh giá,  
2.2 nếu to store ,nói lên hợp đồng, từ chối thẳng và từ chối có lý do để admin xem sét và ký, sau khi ký phải nói được cấu chuyện admin push lên store ( đăng ký chplay lấy api về làm)
 ( kỳ anh )


3. push asset ( nôm na giống game, nhưng đơn giản hơn )
( kỳ anh)


4) luồng nạp tiền vào ví 
( tú)

5. mua game, mua asset (nếu ví không đủ tiền, thì sẽ yêu cầu nạp vào ví, sau khi nạp vào ví rồi lấy tiền đó đi mua chứ không phải mua thanh toán trực tiếp, sau khi mua thành công thì ví seller sẽ tăng lên số tiền theo phần trăm,  tải game (phải nói lên được seller được tải nhiều lần), buyer ví trừ tiền, ví nền tảng cộng tiền )  
(tú)

6. rút tiền (phải nói lên được admin chấp nhận gửi tiền về cho user, và ví admin sẽ bị trừ tiền, và ví bên admin phải sync được với hệ thống payos( ví bảo kim) có nghĩa là ví dụ tài khoản ví admin hết tiền thì admin phải qua bên trang payos kích vào ví bảo kim để nạp tiền, thì tôi muốn nó hiện số dư bao nhiêu trên màn hình để admin follow cho dễ ( lưu ý ví này chỉ để chuyển tiền về cho user)  admin sẽ có thêm một ví là nhận tiền. bởi vì payos (ví bảo kim) có hai loại ví, nó ko cộng dồn lại với nhau   )
(Hoàng)


7. Dispute Flow
Mục đích: user tố cáo tranh chấp bản quyền/source, admin xử lý( nói rỏ ra flow), ban user .
Cương

8. AI review  , check đạo văn 
Cương 



