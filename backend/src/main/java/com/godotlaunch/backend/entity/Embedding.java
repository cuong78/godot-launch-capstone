package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.EmbeddingType;
import com.pgvector.PGvector;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Bảng gộp mọi vector đối chiếu sinh trắc/giấy tờ của user — khuôn mặt (chống
 * 2 tài khoản dùng chung 1 mặt) và ảnh CCCD/Passport (chống re-upload ảnh cũ
 * kèm sửa tay idNumber để bypass check trùng text).
 *
 * KHÔNG gộp chung 1 cột vector: face dùng model dlib/face_recognition
 * (128-dim), KYC dùng CLIP (512-dim) — 2 model khác nhau, pad chung 1 cột sẽ
 * làm loãng vector và giảm độ chính xác cosine similarity. Mỗi row chỉ dùng
 * ĐÚNG MỘT trong hai cột theo `type` (còn lại NULL).
 *
 * type=face:      dùng embedding128, unique theo user (1 user 1 khuôn mặt).
 * type=kyc_front/kyc_back: dùng embedding512, KHÔNG unique (giữ lịch sử nếu
 * re-KYC, và 1 lần KYC có 2 ảnh — mặt trước bắt buộc, mặt sau chỉ CCCD).
 */
@Entity
@Table(name = "embeddings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Embedding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private EmbeddingType type;

    // Chỉ có giá trị khi type = face.
    @Column(name = "embedding_128", columnDefinition = "vector(128)")
    private PGvector embedding128;

    // Chỉ có giá trị khi type = kyc_front / kyc_back.
    @Column(name = "embedding_512", columnDefinition = "vector(512)")
    private PGvector embedding512;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
