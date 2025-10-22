export function getBearerToken() {
  if (typeof window === "undefined") return null;
  const rawToken = localStorage.getItem("bearer_token");
  if (!rawToken) return null;
  const [token] = rawToken.split(".");
  return token ?? rawToken;
}
