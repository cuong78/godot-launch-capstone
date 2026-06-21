package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.StorageRouting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StorageRoutingRepository extends JpaRepository<StorageRouting, String> {
    @Query("SELECT r FROM StorageRouting r JOIN FETCH r.bucket b JOIN FETCH b.account WHERE r.fileType = :fileType")
    Optional<StorageRouting> findByFileTypeWithJoin(@Param("fileType") String fileType);

    Optional<StorageRouting> findByFileType(String fileType);

    @Query("SELECT r FROM StorageRouting r JOIN FETCH r.bucket b JOIN FETCH b.account")
    List<StorageRouting> findAllWithBucketAndAccount();
}
