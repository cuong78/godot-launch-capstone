export type AdminNavigationSection =
  | "overview"
  | "moderation"
  | "finance"
  | "users"
  | "system";

export type AdminNavigationTab =
  | "moderation"
  | "users"
  | "wallet"
  | "payments"
  | "withdrawal"
  | "logs"
  | "settings"
  | "storage"
  | "disputes";

export interface AdminNavigationDetail {
  section: AdminNavigationSection;
  tab?: AdminNavigationTab;
}

export const ADMIN_NAVIGATION_EVENT = "godotlaunch:admin-navigate";
let pendingAdminNavigation: AdminNavigationDetail | null = null;

export const dispatchAdminNavigation = (detail: AdminNavigationDetail) => {
  pendingAdminNavigation = detail;
  window.dispatchEvent(
    new CustomEvent<AdminNavigationDetail>(ADMIN_NAVIGATION_EVENT, {
      detail,
    }),
  );
};

export const consumeAdminNavigation = () => {
  const detail = pendingAdminNavigation;
  pendingAdminNavigation = null;
  return detail;
};
