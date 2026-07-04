-- notif_type_enum được tạo ở V1 nhưng không cột nào dùng — notifications.type
-- thực tế là varchar(50) (map NotificationType.java qua EnumType.STRING thường).
-- Rác schema, giá trị cũng không khớp NotificationType.java hiện tại — xóa.
DROP TYPE IF EXISTS public.notif_type_enum;
