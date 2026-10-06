export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthUserResponse = {
  email: string;
};

export type LoginResponse = {
  user: AuthUserResponse;
};

export type MeResponse = {
  user: AuthUserResponse;
};
