//package com.godotlaunch.backend.service.impl;
//
//import org.springframework.web.multipart.MultipartFile;
//
//import java.io.ByteArrayInputStream;
//import java.io.InputStream;
//
///**
// * Minimal MultipartFile wrapper around a byte array.
// * Dùng để upload dữ liệu base64 (ảnh CCCD) qua StorageRouter mà không cần HTTP request.
// */
//public class ByteArrayMultipartFile implements MultipartFile {
//
//    private final byte[] bytes;
//    private final String name;
//    private final String contentType;
//
//    public ByteArrayMultipartFile(byte[] bytes, String name, String contentType) {
//        this.bytes = bytes;
//        this.name = name;
//        this.contentType = contentType;
//    }
//
//    @Override public String getName() { return name; }
//    @Override public String getOriginalFilename() { return name; }
//    @Override public String getContentType() { return contentType; }
//    @Override public boolean isEmpty() { return bytes == null || bytes.length == 0; }
//    @Override public long getSize() { return bytes == null ? 0 : bytes.length; }
//    @Override public byte[] getBytes() { return bytes; }
//    @Override public InputStream getInputStream() { return new ByteArrayInputStream(bytes); }
//
//    @Override
//    public void transferTo(java.io.File dest) throws java.io.IOException {
//        try (var out = new java.io.FileOutputStream(dest)) {
//            out.write(bytes);
//        }
//    }
//}
