package com.godotlaunch.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import xyz.capybara.clamav.ClamavClient;
import xyz.capybara.clamav.commands.scan.result.ScanResult;

import java.io.InputStream;

@Service
public class ClamAVService {

    private final ClamavClient clamavClient;

    public ClamAVService(
            @Value("${clamav.host:localhost}") String host,
            @Value("${clamav.port:3310}") int port) {
        this.clamavClient = new ClamavClient(host, port);
    }

    /**
     * Quét file từ InputStream (nhận luồng dữ liệu stream trực tiếp từ AWS S3).
     * 
     * @param inputStream Luồng dữ liệu của file cần quét
     * @return true nếu an toàn (Clean), false nếu phát hiện virus (Infected)
     */
    public boolean scanStream(InputStream inputStream) {
        try {
            ScanResult scanResult = clamavClient.scan(inputStream);
            return scanResult instanceof ScanResult.OK;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi kết nối đến ClamAV: " + e.getMessage(), e);
        }
    }
}
