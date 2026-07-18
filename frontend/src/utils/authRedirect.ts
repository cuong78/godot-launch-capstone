import { ScreenType, User } from "../types";

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
