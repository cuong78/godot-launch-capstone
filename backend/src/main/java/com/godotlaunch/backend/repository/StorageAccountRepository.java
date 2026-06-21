package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.StorageAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StorageAccountRepository extends JpaRepository<StorageAccount, UUID> {
    List<StorageAccount> findAllByIsActiveTrue();
}
