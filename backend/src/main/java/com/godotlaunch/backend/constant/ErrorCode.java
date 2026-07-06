package com.godotlaunch.backend.constant;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public enum ErrorCode {
    // 400 Bad Request
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "Validation failed on request arguments."),
    DUPLICATE_EMAIL(HttpStatus.BAD_REQUEST, "Email is already registered."),
    DUPLICATE_USERNAME(HttpStatus.BAD_REQUEST, "Username is already taken."),
    ROLE_NOT_FOUND(HttpStatus.BAD_REQUEST, "Specified user role does not exist."),
    PASSWORDS_DO_NOT_MATCH(HttpStatus.BAD_REQUEST, "Passwords do not match."),
    INVALID_OTP(HttpStatus.BAD_REQUEST, "Invalid or expired OTP verification code."),

    // 401 Unauthorized
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Full authentication is required to access this resource."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Incorrect password or username."),
    USER_BANNED(HttpStatus.UNAUTHORIZED, "This user account has been banned."),
    INVALID_RECAPTCHA(HttpStatus.BAD_REQUEST, "reCAPTCHA verification failed. Please try again."),
    FACE_NOT_DETECTED(HttpStatus.BAD_REQUEST, "Không tìm thấy khuôn mặt rõ ràng trong ảnh. Vui lòng chụp lại với ánh sáng tốt hơn và nhìn thẳng vào camera."),
    FACE_DUPLICATE(HttpStatus.CONFLICT, "Khuôn mặt này đã được đăng ký với một tài khoản khác trong hệ thống."),
    FACE_VERIFY_REQUIRED(HttpStatus.FORBIDDEN, "Bạn cần xác thực khuôn mặt trước khi đăng tải lên Marketplace lần đầu tiên."),
    
    // 403 Forbidden
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "You do not have permission to execute this operation."),
    
    // 404 Not Found
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested user does not exist."),
    GAME_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested game does not exist."),
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested category does not exist."),
    MARKETPLACE_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested marketplace item does not exist."),
    ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested order does not exist."),
    PAYMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested payment does not exist."),
    DISPUTE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy khiếu nại."),
    FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tập tin trên server lưu trữ (Có thể đã bị xóa hoặc là dữ liệu mẫu)."),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "Yêu cầu không hợp lệ."),
    IDENTITY_BANNED(HttpStatus.FORBIDDEN, "Danh tính này đã bị cấm khỏi hệ thống do vi phạm trước đó."),
    
    // 400 Bad Request additions / Category
    CATEGORY_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "Category name or slug already exists."),
    PARENT_CATEGORY_NOT_FOUND(HttpStatus.BAD_REQUEST, "Parent category does not exist."),
    CATEGORY_PARENT_CYCLE(HttpStatus.BAD_REQUEST, "Category hierarchy cannot contain cycles."),
    
    // Community Chat
    CHAT_NOT_FOUND(HttpStatus.NOT_FOUND, "Post not found."),
    CHAT_ALREADY_DELETED(HttpStatus.BAD_REQUEST, "Post has already been deleted."),
    REACTION_NOT_FOUND(HttpStatus.NOT_FOUND, "Reaction not found."),
    CHAT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "You do not have permission to modify this post."),
    MEDIA_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "Maximum 10 media files allowed per post."),
    
    // 500 Internal Server Error
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later."),

    // GitHub OAuth
    GITHUB_AUTH_FAILED(HttpStatus.BAD_GATEWAY, "GL-5020", "Failed to authenticate with GitHub."),
    GITHUB_EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "GL-4060", "GitHub account must have a public email."),
    GITHUB_TOKEN_EXCHANGE_FAILED(HttpStatus.BAD_GATEWAY, "GL-5021", "Failed to exchange GitHub authorization code."),

    // Repo publish
    GITHUB_NOT_LINKED(HttpStatus.BAD_REQUEST, "Bạn cần liên kết tài khoản GitHub trước khi submit code."),
    REPO_URL_REQUIRED(HttpStatus.BAD_REQUEST, "Vui lòng cung cấp link repo GitHub."),
    REPO_OWNER_MISMATCH(HttpStatus.FORBIDDEN, "Repo này không thuộc tài khoản GitHub của bạn."),
    REPO_IS_FORK(HttpStatus.BAD_REQUEST, "Không chấp nhận repo fork. Vui lòng dùng repo gốc của bạn."),
    REPO_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy repo hoặc bạn không có quyền truy cập."),
    SOURCE_PROCESSING_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "Xử lý source code thất bại. Vui lòng kiểm tra lại repo."),
    SOURCE_MALWARE_DETECTED(HttpStatus.UNPROCESSABLE_ENTITY, "Phát hiện mã độc trong source code."),
    NOT_GODOT_PROJECT(HttpStatus.UNPROCESSABLE_ENTITY, "Repo không phải là dự án Godot hợp lệ. Cần có file project.godot ở thư mục gốc và các file mã nguồn .gd/.tscn."),
    REPO_NEEDS_BOT(HttpStatus.FORBIDDEN, "Repo này đang ở chế độ private hoặc sai link. Vui lòng mời tài khoản hệ thống vào repo để cấp quyền."),

    // Payment
    OWN_PRODUCT_PURCHASE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "You cannot purchase your own marketplace item."),
    PAYMENT_ALREADY_PAID(HttpStatus.BAD_REQUEST, "This payment has already been approved."),
    PAYMENT_RECEIPT_REQUIRED(HttpStatus.BAD_REQUEST, "A payment receipt file is required."),
    PAYMENT_REJECTION_REASON_REQUIRED(HttpStatus.BAD_REQUEST, "A rejection reason is required."),
    PAYMENT_NOT_AWAITING_VERIFICATION(HttpStatus.BAD_REQUEST, "This payment is not waiting for admin verification."),
    PAYMENT_NOT_READY_FOR_RECEIPT(HttpStatus.BAD_REQUEST, "This payment is already waiting for verification."),
    PAYMENT_GATEWAY_ERROR(HttpStatus.BAD_GATEWAY, "Failed to create or verify the PayOS payment session."),
    PAYMENT_WEBHOOK_INVALID(HttpStatus.BAD_REQUEST, "Invalid PayOS webhook payload."),
    PAYMENT_AMOUNT_MISMATCH(HttpStatus.BAD_REQUEST, "Payment amount does not match the order total."),
    PAYMENT_NOT_CANCELLABLE(HttpStatus.BAD_REQUEST, "This payment can no longer be cancelled."),
    PLATFORM_COMMISSION_RATE_INVALID(HttpStatus.BAD_REQUEST, "Platform commission rate must be between 0 and 100."),
    PAYOUT_BALANCE_FETCH_FAILED(HttpStatus.BAD_GATEWAY, "Failed to fetch the PayOS payout account balance."),
    PAYOUT_BALANCE_INVALID_RESPONSE(HttpStatus.BAD_GATEWAY, "Received an invalid response from the PayOS payout balance API."),
    INSUFFICIENT_PAYOUT_BALANCE(HttpStatus.BAD_REQUEST, "Insufficient PayOS payout account balance."),
    PAYOUT_CREATE_FAILED(HttpStatus.BAD_GATEWAY, "Failed to create the PayOS payout order."),
    PAYOUT_CREATE_INVALID_RESPONSE(HttpStatus.BAD_GATEWAY, "Received an invalid response from the PayOS payout create API."),
    PAYOUT_STATUS_FETCH_FAILED(HttpStatus.BAD_GATEWAY, "Failed to fetch the PayOS payout status."),
    PAYOUT_STATUS_INVALID_RESPONSE(HttpStatus.BAD_GATEWAY, "Received an invalid response from the PayOS payout status API."),
    PAYOUT_BANK_BIN_NOT_SUPPORTED(HttpStatus.BAD_REQUEST, "Unable to map the withdrawal bank to a supported PayOS BIN."),
    
    // GitHub Linking
    GITHUB_EMAIL_MISMATCH(HttpStatus.BAD_REQUEST, "GL-4070", "GitHub primary email does not match your registered email."),
    GITHUB_ALREADY_LINKED(HttpStatus.BAD_REQUEST, "GL-4071", "This GitHub account is already linked to another user."),
    GITHUB_LINK_NOT_PREPARED(HttpStatus.BAD_REQUEST, "GL-4072", "GitHub link session not found. Please start the linking process again."),
    
    // Wallet and Withdrawal
    INSUFFICIENT_BALANCE(HttpStatus.BAD_REQUEST, "GL-4080", "Insufficient wallet balance."),
    WALLET_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ví của người dùng."),
    WITHDRAWAL_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu rút tiền."),
    INVALID_WITHDRAWAL_STATUS(HttpStatus.BAD_REQUEST, "Trạng thái yêu cầu rút tiền không hợp lệ để xử lý."),
    REJECT_REASON_REQUIRED(HttpStatus.BAD_REQUEST, "Lý do từ chối là bắt buộc khi từ chối yêu cầu rút tiền."),

    // Security and File verification
    SECURITY_CHECK_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "Phát hiện mã độc trong tệp tin tải lên."),
    INVALID_FILE_STRUCTURE(HttpStatus.BAD_REQUEST, "Cấu trúc tệp tin tải lên không hợp lệ hoặc thiếu tệp index.html."),
    MEDIA_FILE_TOO_LARGE(HttpStatus.BAD_REQUEST, "Ảnh/video vượt quá dung lượng cho phép.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.code = this.name();
        this.message = message;
    }

    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
