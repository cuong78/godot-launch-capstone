"Kính thưa Hội đồng, tiếp theo em xin phép demo luồng Publish game lên Google Play Store.
So với luồng đẩy game lên Marketplace nội bộ của hệ thống, luồng này giữ nguyên các bước nhập thông tin và tải game cơ bản để tối ưu trải nghiệm, nhưng có 2 điểm khác biệt cốt lõi:

Thứ nhất: Game sẽ không xuất hiện trên Marketplace của nền tảng, mà được đóng gói để phát hành độc lập ra chợ ứng dụng ngoài là Google Play.

Thứ hai: Bắt buộc có thêm bước Thiết lập Hợp đồng hợp tác giữa Developer và Hệ thống."

2. Chọn loại Hợp đồng & Đăng tải
(Thao tác: Chọn hình thức hợp đồng, điền thông tin và bấm Upload)

"Tại đây, Developer sẽ lựa chọn một trong hai hình thức:

Mua đứt: Hệ thống thanh toán một lần và toàn quyền sở hữu game.

Đồng sở hữu: Doanh thu sẽ được chia sẻ dựa trên số lượt tải thực tế sau khi trừ đi các chi phí nền tảng.
Sau khi chọn xong hình thức và điền thông tin, em tiến hành tải mã nguồn lên hệ thống."

3. AI Review & Đàm phán Hợp đồng
(Thao tác: Chuyển sang màn hình Admin duyệt, mở pop-up AI Review)

"Tại phía Admin, khâu AI Review ở luồng này cũng được mở rộng so với luồng Marketplace thông thường: bên cạnh việc kiểm duyệt nội dung, mô hình AI còn phân tích chất lượng game để gợi ý loại hợp đồng và mức giá tối ưu cho Admin tham khảo.
Dựa vào đề xuất của AI và mức giá Developer đưa ra, Admin có toàn quyền chấp thuận, từ chối hoặc đàm phán lại.
Sau khi thống nhất điều khoản, hai bên tiến hành ký hợp đồng điện tử để kích hoạt tiến trình đóng gói."

4. Đóng gói & Mock Google Play API
(Thao tác: Admin kích hoạt Build/Publish, chuyển sang màn hình Mock Container / Service Account)

"Sau khi ký kết, Admin sẽ đóng gói mã nguồn sang đúng chuẩn định dạng của Google Play.
Vì Google Play đối soát doanh thu định kỳ vào ngày 15 hằng tháng, nhóm đã dựng một Mock Service chạy trên Docker để mô phỏng chính xác kiến trúc tích hợp thực tế với Google Cloud:

GCS Bucket URI: Đường dẫn lưu trữ báo cáo tài chính (.csv) định kỳ.

GCP Service Account: Định danh ủy quyền giúp hệ thống tự động đọc dữ liệu báo cáo mà không cần can thiệp thủ công."

5. Đồng bộ & Đối soát Doanh thu
(Thao tác: Bấm nút Sync lượt tải / Random mock data để giao diện hiển thị bảng số liệu)

"Để Hội đồng thấy rõ luồng tiền của hệ thống, em sử dụng tính năng Đồng bộ dữ liệu từ Mock Server:

Hệ thống ghi nhận lượt tải thực tế và tính ra Tổng doanh thu.

Tiếp theo, hệ thống tự động khấu trừ phí sàn của Google Play.

Phần doanh thu ròng còn lại sẽ được phân bổ tự động: chuyển về cho Developer theo đúng tỷ lệ phần trăm đã ký kết, và phần còn lại là lợi nhuận của hệ thống."