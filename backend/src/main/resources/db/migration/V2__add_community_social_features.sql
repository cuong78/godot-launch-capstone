-- Add social features to community_chats
CREATE TYPE reaction_type_enum AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');
CREATE TYPE chat_media_type_enum AS ENUM ('image', 'video');

ALTER TABLE community_chats
    ADD COLUMN reaction_count   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN comment_count    INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN share_count      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN is_edited        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN original_chat_id UUID REFERENCES community_chats(id) ON DELETE SET NULL;

CREATE INDEX idx_community_chats_original_id ON community_chats(original_chat_id)
    WHERE original_chat_id IS NOT NULL;

CREATE TABLE chat_media (
                            id            UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
                            chat_id       UUID                 NOT NULL REFERENCES community_chats(id) ON DELETE CASCADE,
                            url           TEXT                 NOT NULL,
                            media_type    chat_media_type_enum NOT NULL,
                            display_order SMALLINT             NOT NULL DEFAULT 0,
                            created_at    TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_reactions (
                                id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
                                chat_id       UUID               NOT NULL REFERENCES community_chats(id) ON DELETE CASCADE,
                                user_id       UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                reaction_type reaction_type_enum NOT NULL,
                                created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
                                updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
                                CONSTRAINT uq_chat_reaction UNIQUE (chat_id, user_id)
);

CREATE INDEX idx_chat_reactions_chat_id ON chat_reactions(chat_id);
CREATE INDEX idx_chat_reactions_user_id ON chat_reactions(user_id);
CREATE INDEX idx_chat_media_chat_id     ON chat_media(chat_id);