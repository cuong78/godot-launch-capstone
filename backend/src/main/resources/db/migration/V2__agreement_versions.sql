-- ============================================================
--  AGREEMENT VERSIONS — Thỏa thuận phân phối, admin chỉnh sửa được
-- ============================================================

CREATE TABLE public.agreement_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version integer NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agreement_versions_pkey PRIMARY KEY (id),
    CONSTRAINT agreement_versions_version_key UNIQUE (version),
    CONSTRAINT agreement_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

COMMENT ON TABLE public.agreement_versions IS 'Lich su noi dung Thoa thuan phan phoi tren Marketplace — admin sua = tao version moi';

-- Chi 1 version active tai 1 thoi diem
CREATE UNIQUE INDEX uq_agreement_versions_active
    ON public.agreement_versions (is_active)
    WHERE (is_active = true);

CREATE TABLE public.user_agreement_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agreement_version_id uuid NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_agreement_acceptances_pkey PRIMARY KEY (id),
    CONSTRAINT user_agreement_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_agreement_acceptances_version_id_fkey FOREIGN KEY (agreement_version_id) REFERENCES public.agreement_versions(id),
    CONSTRAINT user_agreement_acceptances_unique UNIQUE (user_id, agreement_version_id)
);

COMMENT ON TABLE public.user_agreement_acceptances IS 'Bang chung user da bam dong y mot version cu the cua thoa thuan phan phoi';

INSERT INTO public.agreement_versions (id, version, content, is_active, created_at) VALUES (
    gen_random_uuid(),
    1,
    'THỎA THUẬN PHÂN PHỐI SẢN PHẨM TRÊN GODOTLAUNG

Vui lòng đọc kỹ và xác nhận các điều khoản dưới đây trước khi tiếp tục đăng ký trở thành Developer trên GodotLaunch.

ĐIỀU 1: ĐIỀU KHOẢN CHUNG & PHẠM VI ÁP DỤNG

1.1. Bằng cách chọn "Đồng ý" và tiếp tục quá trình đăng ký, bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi các điều khoản của thỏa thuận này.

1.2. Bạn cam kết là tác giả gốc hoặc có toàn quyền sở hữu/phân phối hợp pháp đối với mọi source code, tài nguyên (asset), hoặc sản phẩm khác mà bạn đăng tải lên GodotLaunch.

ĐIỀU 2: CHIA SẺ DOANH THU & PHÍ NỀN TẢNG

2.1. Tỷ lệ chia sẻ doanh thu mặc định dành cho Developer là {{revenueSharePercent}}% giá trị mỗi giao dịch thành công (sau khi trừ thuế và phí thanh toán phát sinh liên quan). Nền tảng GodotLaunch nhận phí vận hành {{commissionRate}}% trên mỗi giao dịch.

2.2. Tỷ lệ tại 2.1 có thể thay đổi tùy theo cấu hình của nền tảng tại từng thời điểm, hoặc theo các thỏa thuận Co-publishing/hợp đồng đặc thù riêng biệt mà hai bên ký kết cho từng sản phẩm cụ thể.

ĐIỀU 3: BẰNG CHỨNG COMMIT & KHUYẾN NGHỊ BẢO MẬT REPOSITORY

3.1. Snapshot làm bằng chứng. Khi bạn submit game/source code qua liên kết GitHub repository, hệ thống ghi nhận snapshot tại thời điểm submit — bao gồm commit SHA hiện tại và lịch sử commit của repository. Đây là căn cứ dữ liệu chính mà nền tảng sử dụng để đối chiếu khi có tranh chấp bản quyền giữa các bên (xem Điều 5).

3.2. Khuyến nghị bảo mật. Lịch sử commit (tác giả, thời gian, nội dung từng commit) là bằng chứng quan trọng nhất để xác định ai là tác giả gốc thật sự. Bạn nên giữ repository ở chế độ private và hạn chế chia sẻ quyền truy cập cho người ngoài. Nếu repository của bạn công khai hoặc bị lộ quyền truy cập, đây là rủi ro thuộc trách nhiệm của bạn — xem Điều 5.4.

ĐIỀU 4: BẢO MẬT & QUY CHUẨN NỘI DUNG

4.1. Developer cam kết tuyệt đối không đăng tải mã nguồn hoặc tài nguyên chứa mã độc, nội dung vi phạm bản quyền phần mềm khác, hoặc vi phạm thuần phong mỹ tục.

4.2. Mọi khiếu nại liên quan đến sao chép ý tưởng, đạo nhái source code sẽ được xử lý theo quy trình tại Điều 5 của thỏa thuận này.

ĐIỀU 5: XỬ LÝ TRANH CHẤP BẢN QUYỀN

5.1. Quy trình tố cáo. Khi một Developer (bên B) tố cáo Developer khác (bên A) đạo nhái/đánh cắp source code của mình, sản phẩm của bên A bị tạm gỡ khỏi Marketplace ngay lập tức trong lúc chờ xử lý. Ban Quản Trị đối chiếu snapshot commit của A (ghi nhận lúc A submit — Điều 3.1) với repository mà B cung cấp làm bằng chứng.

5.2. Nếu bên A thực sự đánh cắp source của bên B:
- Bên A phải hoàn trả toàn bộ số tiền đã nhận được từ sản phẩm vi phạm, cộng các phí phát sinh liên quan, trong vòng 5 ngày kể từ khi bị kết luận.
- Nền tảng chuyển khoản tiền hoàn trả đó cho bên B (người bị hại).
- Sản phẩm vi phạm bị xóa khỏi nền tảng.
- Nếu bên A cố tình không hoàn trả trong thời hạn: nền tảng có quyền cấm vĩnh viễn danh tính của A (tài khoản, khuôn mặt, CCCD, tài khoản ngân hàng) khỏi toàn bộ nền tảng, đồng thời theo đuổi các biện pháp pháp lý cần thiết dựa trên hồ sơ định danh (KYC/FaceID) đã xác thực.

5.3. Nếu tố cáo là sai sự thật (vu cáo): sản phẩm của bên A được khôi phục. Nếu một tài khoản bị xác định vu cáo quá 3 lần, danh tính của tài khoản đó (bao gồm khuôn mặt, CCCD, tài khoản ngân hàng) sẽ bị cấm vĩnh viễn khỏi nền tảng — không thể đăng ký tài khoản mới hoặc thêm tài khoản ngân hàng mới bằng cùng danh tính đó.

5.4. Trường hợp không thể kết luận rõ ràng. Nếu lịch sử commit và thời gian của bên A và bên B giống nhau đến mức không thể phân biệt ai là tác giả gốc, đây không mặc nhiên là bằng chứng cho thấy A đạo nhái — trường hợp này luôn được chuyển cho Ban Quản Trị xem xét thủ công. Nếu kết luận nguyên nhân là do bên B không bảo mật repository của mình (để lộ quyền truy cập, để repository công khai...) khiến bên A có thể tiếp cận, thì bên B tự chịu trách nhiệm về hậu quả đó — nền tảng không chịu trách nhiệm cho việc rò rỉ xảy ra ngoài phạm vi kiểm soát của hệ thống.

ĐIỀU 6: NGHĨA VỤ LƯU TRỮ & TRÁCH NHIỆM KHI SẢN PHẨM BỊ TỪ CHỐI

6.1. GodotLaunch không có nghĩa vụ lưu trữ vĩnh viễn source code hoặc file bạn đã submit. Khi một game/sản phẩm bị Ban Quản Trị từ chối (reject), toàn bộ file source code, gói nén và tài nguyên liên quan bị xóa khỏi hệ thống lưu trữ của nền tảng — nền tảng không giữ lại bản sao nào sau khi từ chối.

6.2. Điều này đồng nghĩa: nếu source code của bạn bị lộ ra bên ngoài sau thời điểm bị từ chối, đó hoàn toàn không thể là do nền tảng lưu trữ và làm rò rỉ — vì tại thời điểm đó nền tảng đã không còn giữ bản sao nào của sản phẩm. Trong mọi trường hợp, nền tảng không chịu trách nhiệm dưới bất kỳ hình thức nào đối với việc source code bị lộ ra ngoài sau khi bạn nộp lên hệ thống, bất kể sản phẩm được duyệt hay bị từ chối.

ĐIỀU 7: ĐỘC QUYỀN PHÂN PHỐI SAU KHI KÝ HỢP ĐỒNG MUA ĐỨT / CO-PUBLISHING

7.1. Nếu bạn đã ký hợp đồng bán sản phẩm cho nền tảng theo hình thức Mua đứt (Full Acquisition) hoặc Đồng xuất bản (Co-publishing), bạn không được phép tiếp tục cung cấp, chia sẻ, bán lại, hoặc phân phối source code của sản phẩm đó dưới bất kỳ hình thức nào ra bất kỳ nền tảng thứ ba nào khác, kể từ thời điểm hợp đồng có hiệu lực.

7.2. Nếu nền tảng phát hiện source code của sản phẩm đã ký hợp đồng độc quyền bị phát tán ra bên ngoài do hành vi của bạn, bạn sẽ chịu trách nhiệm hoàn toàn trước pháp luật đối với hành vi vi phạm hợp đồng và vi phạm bản quyền liên quan.

ĐIỀU 8: THANH TOÁN & RÚT TIỀN (PAYOUT)

8.1. Doanh thu từ việc bán hàng được tích lũy vào Ví điện tử nội bộ trên GodotLaunch.

8.2. Bạn chỉ được phép rút tiền (Withdrawal) về tài khoản ngân hàng chính chủ đã cung cấp và xác thực trong bước hoàn tất hồ sơ Developer (KYC). Tài khoản ngân hàng này cũng là căn cứ đối chiếu nếu phát sinh tranh chấp tại Điều 5.

Bằng việc nhấn "Tôi đồng ý", bạn xác nhận đã đọc và chấp nhận toàn bộ các điều khoản trên.',
    true,
    now()
);
