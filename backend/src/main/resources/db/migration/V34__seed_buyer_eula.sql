-- 1. Drop the old unique constraint on version column
ALTER TABLE public.agreement_versions 
DROP CONSTRAINT IF EXISTS agreement_versions_version_key;

-- 2. Drop the composite unique constraint if it already exists from a failed run
ALTER TABLE public.agreement_versions
DROP CONSTRAINT IF EXISTS uq_agreement_versions_type_version;

-- 3. Drop index if it exists as a standalone index (now safe to run if it was a constraint)
DROP INDEX IF EXISTS public.uq_agreement_versions_type_version;

-- 4. Create a new composite unique constraint for type and version
ALTER TABLE public.agreement_versions
ADD CONSTRAINT uq_agreement_versions_type_version UNIQUE (agreement_type, version);

-- 5. Delete any pre-existing BUYER_EULA references and versions to ensure idempotency
DELETE FROM public.user_agreement_acceptances 
WHERE agreement_version_id IN (
    SELECT id FROM public.agreement_versions WHERE agreement_type = 'BUYER_EULA'
);

DELETE FROM public.agreement_versions WHERE agreement_type = 'BUYER_EULA';

-- 6. Seed default active BUYER_EULA version
INSERT INTO public.agreement_versions (id, version, content, is_active, agreement_type, created_at)
VALUES (
    gen_random_uuid(),
    1,
    'THỎA THUẬN CẤP PHÉP NGƯỜI DÙNG CUỐI (EULA) - GODOT LAUNCH
Ngày cập nhật cuối cùng: 16 tháng 08, 2026

Thỏa thuận Cấp phép Người dùng Cuối này ("Thỏa thuận") áp dụng cho việc bạn sử dụng các tài nguyên số ("Nội dung") được cung cấp thông qua chợ ứng dụng trực tuyến Godot Launch ("Chợ ứng dụng"). Thỏa thuận này là sự ràng buộc pháp lý giữa bạn và Bên cấp phép Nội dung (Tác giả/Nhà phát triển sản phẩm). Bằng việc nhấn nút xác nhận đồng ý, bạn đồng ý tuân thủ các điều khoản trong thỏa thuận này.

1. CẤP PHÉP SỬ DỤNG NỘI DUNG
a. Quyền sở hữu: Khi bạn thực hiện giao dịch mua hoặc tải miễn phí một Nội dung, bạn chỉ được cấp quyền sử dụng Nội dung đó dưới dạng không độc quyền. Bạn không được chuyển nhượng quyền sở hữu trí tuệ của Nội dung trừ khi có thỏa thuận khác bằng văn bản từ Tác giả.

b. Quyền sử dụng Tiêu chuẩn (Standard License): Bạn có quyền sử dụng, sao chép, hiển thị và sửa đổi Nội dung để tích hợp vào các dự án của riêng bạn (ví dụ: trò chơi điện tử, phần mềm).

2. CÁC HẠN CHẾ SỬ DỤNG
Bạn không được phép:
- Bán lại, cho thuê, phân phối lại Nội dung dưới dạng độc lập (đứng một mình) mà không đi kèm với ứng dụng hoặc giá trị gia tăng rõ rệt từ phía bạn.
- Đảo ngược kỹ thuật (reverse engineer), dịch ngược hoặc cố gắng trích xuất mã nguồn của Nội dung (trừ khi Nội dung được cấp phép mã nguồn mở công khai).
- Sử dụng Nội dung cho các mục đích vi phạm pháp luật.
- Sử dụng Nội dung để huấn luyện các chương trình Trí tuệ Nhân tạo tạo sinh (Generative AI) nếu Nội dung được gắn nhãn hạn chế AI.

3. LUẬT ÁP DỤNG VÀ GIẢI QUYẾT TRANH CHẤP
Thỏa thuận này được điều chỉnh bởi và giải thích theo luật pháp nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp phát sinh từ hoặc liên quan đến thỏa thuận này sẽ được giải quyết tại Tòa án nhân dân có thẩm quyền tại Việt Nam.',
    true,
    'BUYER_EULA',
    now()
);
