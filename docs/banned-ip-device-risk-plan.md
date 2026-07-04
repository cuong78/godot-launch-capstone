# Banned IP Refactor Plan: IP + Device Fingerprint Risk Control

## 1. Muc tieu

Hien tai `BannedIp` dang mang nghia "chan IP" tai gateway/API layer. Cach nay co 2 van de:

- De cam nham nguoi dung hop le neu ho dung chung IP, vi du quan net, truong hoc, cong ty, nha tro, mobile CGNAT.
- De bi ne neu spammer doi VPN/proxy/IP moi.

Huong moi: khong dung IP lam dinh danh chinh. IP chi la mot tin hieu mang. Quyet dinh chan/cooldown dua tren:

- IP address.
- First-party device token.
- Fingerprint hash.
- Hanh vi spam theo thoi gian.



1. Cung IP, nhieu fingerprint.
2. Cung fingerprint, nhieu IP.
3. Cung IP + cung fingerprint va co hanh vi spam.

Kịch bản 1: Cùng IP, nhiều fingerprint
Ví dụ quán net:
IP: 113.x.x.x
Fingerprint A, B, C, D
Xử lý:
Không ban IP.
Chỉ rate limit nhẹ theo IP.
Nếu từng fingerprint không spam thì cho qua.
Nếu quá nhiều signup từ cùng IP trong thời gian ngắn thì bật CAPTCHA/OTP.



Kịch bản 2: Cùng fingerprint, nhiều IP
Ví dụ user đổi VPN để tạo account spam:
Fingerprint: fp_abc
IP: 1.1.1.1, 8.8.8.8, 45.x.x.x
Xử lý:
Tăng risk mạnh.
Giới hạn signup/upload theo fingerprint.
Nếu vượt ngưỡng: cooldown device 24h hoặc bắt xác minh thêm.
Kịch bản 3: Cùng IP + cùng fingerprint spam
Ví dụ cùng máy tạo nhiều account/upload asset:
IP: 113.x.x.x
Fingerprint: fp_abc
Account created: 5/day
Asset uploaded: 20/hour
Xử lý:
Chặn signup/upload tạm thời.
Đưa asset vào manual review.
Ghi risk_event.
Có thể ban device token/fingerprint tạm thời.