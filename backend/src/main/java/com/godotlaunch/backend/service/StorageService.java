package com.godotlaunch.backend.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    /**
     * Upload file và trả về public URL.
     * @param file file cần upload
     * @param objectKey tên object trong bucket (bao gồm prefix, ví dụ: "avatars/uuid_name.jpg")
     * @return public URL của file sau khi upload
     */
    String upload(MultipartFile file, String objectKey);

    /**
     * Xóa file theo object key.
     */
    void delete(String objectKey);

    /**
     * Trả về public URL từ object key.
     */
    String getPublicUrl(String objectKey);
}
