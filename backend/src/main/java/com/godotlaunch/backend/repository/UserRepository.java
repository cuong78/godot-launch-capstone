package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGithubId(String githubId);
    boolean existsByEmail(String email);

    // Chống 2 tài khoản khác nhau cùng verify 1 CCCD/Passport — mỗi giấy tờ
    // chỉ được gắn với đúng 1 user. Loại trừ chính user đang confirm (cho
    // phép họ tự sửa lại thông tin KYC của mình).
    boolean existsByKycIdNumberAndIdNot(String kycIdNumber, UUID id);
    boolean existsByBankAccountAndIdNot(String bankAccount, UUID id);
    List<User> findByFullNameContainingIgnoreCaseAndStatus(String fullName, String status);
    List<User> findByRole_NameIgnoreCase(String roleName);

    // Ví nền tảng (platform wallet) = admin được tạo sớm nhất. Dùng LIMIT 1 ở DB
    // thay vì findAll() + filter trong memory (tránh full table scan mỗi lần mua hàng),
    // và ORDER BY createdAt để kết quả ổn định thay vì phụ thuộc thứ tự trả về ngẫu nhiên.
    @Query("SELECT u FROM User u WHERE LOWER(u.role.name) = 'admin' ORDER BY u.createdAt ASC")
    List<User> findAdminsOrderByCreatedAtAsc(Pageable pageable);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"role"})
    Optional<User> findWithRoleById(UUID id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"role"})
    Optional<User> findWithRoleByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.avatarUrl IS NOT NULL AND u.avatarUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.avatarUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchAvatars(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u WHERE ((u.kycFrontImageUrl IS NOT NULL AND u.kycFrontImageUrl <> '') OR (u.kycBackImageUrl IS NOT NULL AND u.kycBackImageUrl <> '')) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(u.kycFullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchKycImages(@Param("search") String search, Pageable pageable);
}
