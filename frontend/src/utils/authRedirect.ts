import { ScreenType, User } from "../types";
import { tokenStorage } from "./tokenStorage";

const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || "https://godotlaunch.shop";
const ADMIN_APP_URL = import.meta.env.VITE_ADMIN_APP_URL || "https://app.godotlaunch.shop";

const normalizeUserRole = (user: User | null | undefined) => {
  const role = user?.role ?? user?.roleName;
  return typeof role === "string" ? role.toLowerCase() : null;
};

export const resolvePostLoginScreen = (
  user: User | null | undefined,
): ScreenType => {
  const role = normalizeUserRole(user);

  if (role === "admin") {
    return "admin";
  }

  if (role === "developer") {
    return "dashboard";
  }

  return "explore";
};

export const isAdminPortalHost = () =>
  window.location.hostname === new URL(ADMIN_APP_URL).hostname;

/**
 * Moves authenticated users to the hostname that owns their workspace.
 * The JWT is transferred in the URL fragment so it is never sent in HTTP
 * requests or reverse-proxy access logs. The callback removes it immediately.
 */
export const redirectToRolePortal = (user: User | null | undefined): boolean => {
  const role = normalizeUserRole(user);

  if (role === "admin" && !isAdminPortalHost()) {
    const token = tokenStorage.getToken() || localStorage.getItem("accessToken");
    const fragment = token ? `#token=${encodeURIComponent(token)}` : "";
    window.location.replace(`${ADMIN_APP_URL}/auth/callback${fragment}`);
    return true;
  }

  if (role !== "admin" && isAdminPortalHost()) {
    window.location.replace(PUBLIC_APP_URL);
    return true;
  }

  return false;
};
