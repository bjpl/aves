/**
 * User Model
 * Defines TypeScript interfaces for User entities and sessions
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSession {
  userId: string;
  email: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    created_at: Date;
  };
}
