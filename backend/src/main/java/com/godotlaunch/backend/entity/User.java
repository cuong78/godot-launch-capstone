package com.godotlaunch.backend.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "email", nullable = false, unique = true, columnDefinition = "citext")
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "preferred_language", nullable = false, length = 10)
    private String preferredLanguage = "vi";

    @Column(name = "github_id", unique = true, length = 50)
    private String githubId;

    @Column(name = "github_username", length = 100)
    private String githubUsername;

    @Column(name = "github_token_enc", columnDefinition = "TEXT")
    private String githubTokenEnc;

    @Column(name = "github_linked_at")
    private Instant githubLinkedAt;

    @Column(name = "session_hash", columnDefinition = "TEXT")
    private String sessionHash;

    @Column(name = "face_verified", nullable = false)
    private boolean faceVerified = false;

    @Column(name = "kyc_verified", nullable = false)
    private boolean kycVerified = false;

    @Column(name = "kyc_full_name", columnDefinition = "TEXT")
    private String kycFullName;

    @Column(name = "kyc_id_number", columnDefinition = "TEXT")
    private String kycIdNumber;

    @Column(name = "kyc_date_of_birth")
    private LocalDate kycDateOfBirth;

    @Column(name = "kyc_address", columnDefinition = "TEXT")
    private String kycAddress;

    @Column(name = "kyc_document_type", columnDefinition = "TEXT")
    private String kycDocumentType;

    @Column(name = "kyc_verified_at")
    private Instant kycVerifiedAt;

    @Column(name = "kyc_front_image_url", columnDefinition = "TEXT")
    private String kycFrontImageUrl;

    @Column(name = "kyc_back_image_url", columnDefinition = "TEXT")
    private String kycBackImageUrl;

    @Column(name = "bank_name", length = 200)
    private String bankName;

    @Column(name = "bank_account", length = 100)
    private String bankAccount;

    @Column(name = "bank_account_holder", length = 200)
    private String bankAccountHolder;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
