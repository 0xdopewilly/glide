export type AuthProvider = "clerk";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  provider: AuthProvider;
  createdAt: string;
};
