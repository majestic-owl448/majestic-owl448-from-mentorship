export const DEVELOPMENT_AUTH_COOKIE = "stamp-inventory-development-user";

export const DEVELOPMENT_USERS = {
  user: {
    id: "local-test-user",
    email: "user@local.test",
    role: "USER",
    label: "normal test user",
  },
  moderator: {
    id: "local-test-moderator",
    email: "moderator@local.test",
    role: "MODERATOR",
    label: "moderator test user",
  },
} as const;

export type DevelopmentUserKey = keyof typeof DEVELOPMENT_USERS;

export function developmentUser(
  value: string | undefined,
): (typeof DEVELOPMENT_USERS)[DevelopmentUserKey] | null {
  if (value !== "user" && value !== "moderator") return null;
  return DEVELOPMENT_USERS[value];
}

export function isDevelopmentAuthEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_ENABLED === "true"
  );
}

export function isDevelopmentAuthClientEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true"
  );
}
