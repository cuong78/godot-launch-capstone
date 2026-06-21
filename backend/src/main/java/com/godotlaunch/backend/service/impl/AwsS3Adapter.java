package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.service.StorageService;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.InputStream;

/**
 * Adapter cho AWS S3 — khởi tạo với config động từ DB (không dùng application.yaml).
 * Config JSON: { "bucket": "...", "region": "...", "accessKey": "...", "secretKey": "..." }
 */
public class AwsS3Adapter implements StorageService {

    private final S3Client s3Client;
    private final String bucket;
    private final String region;

    public AwsS3Adapter(String configJson) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode cfg = mapper.readTree(configJson);
            this.bucket = cfg.get("bucket").asText();
            this.region = cfg.get("region").asText();
            String accessKey = cfg.get("accessKey").asText();
            String secretKey = cfg.get("secretKey").asText();

            this.s3Client = S3Client.builder()
                    .region(Region.of(this.region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)))
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Invalid AWS S3 config", e);
        }
    }

    @Override
    public String upload(MultipartFile file, String objectKey) {
        try {
            PutObjectRequest req = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .contentType(file.getContentType())
                    .build();
            s3Client.putObject(req, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return getPublicUrl(objectKey);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload to S3", e);
        }
    }

    @Override
    public void delete(String objectKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build());
    }

    @Override
    public String getPublicUrl(String objectKey) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, objectKey);
    }

    /**
     * Đọc file từ S3 về dạng stream (dùng khi cần proxy file về client hoặc virus scan).
     * Caller có trách nhiệm đóng stream sau khi dùng.
     */
    public InputStream readFile(String objectKey) {
        GetObjectRequest req = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();
        return s3Client.getObject(req);
    }
}
