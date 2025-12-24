import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
}

export class UserService {
  private readonly SALT_ROUNDS = 10;

  constructor(private pool: Pool) {}

  /**
   * Create a new user with hashed password
   */
  async createUser(email: string, password: string): Promise<User> {
    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    const query = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, password_hash, created_at
    `;

    const result = await this.pool.query(query, [email, passwordHash]);

    return result.rows[0];
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, created_at
      FROM users
      WHERE email = $1
    `;

    const result = await this.pool.query(query, [email]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find a user by ID
   */
  async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, created_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Validate a password against a user's hash
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Check if an email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM users WHERE email = $1
    `;

    const result = await this.pool.query(query, [email]);

    return result.rows.length > 0;
  }

  /**
   * Update user's password
   */
  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    const query = `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
    `;

    await this.pool.query(query, [passwordHash, userId]);
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: number): Promise<void> {
    const query = `
      DELETE FROM users
      WHERE id = $1
    `;

    await this.pool.query(query, [userId]);
  }
}
