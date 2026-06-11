export const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const getUserFromToken = (token: string): any => {
  const payload = decodeJWT(token);
  if (!payload) return null;
  return {
    id: payload.userId || payload.sub,
    email: payload.sub,
    username: payload.sub,
    role: payload.role,
    exp: payload.exp
  };
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;
  return Date.now() >= payload.exp * 1000;
};
