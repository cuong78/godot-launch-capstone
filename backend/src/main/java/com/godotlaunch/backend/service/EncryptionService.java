package com.godotlaunch.backend.service;

public interface EncryptionService {
    String encrypt(String plainText);
    String decrypt(String cipherText);
}
