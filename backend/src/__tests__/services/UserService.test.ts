import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { UserService } from '../../services/UserService';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock bcrypt
jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new UserService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const email = 'test@example.com';
      const password = 'SecurePass123';
      const hashedPassword = 'hashed_password_123';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const mockUser = {
        id: 1,
        email,
        password_hash: hashedPassword,
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
      });

      const result = await service.createUser(email, password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [email, hashedPassword]
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Duplicate email'));

      await expect(service.createUser('test@example.com', 'password')).rejects.toThrow(
        'Duplicate email'
      );
    });
  });

  describe('findByEmail', () => {
    it('should find an existing user', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 1,
        email,
        password_hash: 'hashed_password',
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
      });

      const result = await service.findByEmail(email);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [email]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find an existing user by ID', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser],
      });

      const result = await service.findById(userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        created_at: new Date(),
      };
      const password = 'CorrectPassword123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(user, password);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password_hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        created_at: new Date(),
      };
      const password = 'WrongPassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(user, password);

      expect(result).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ exists: true }],
      });

      const result = await service.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await service.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userId = 1;
      const newPassword = 'NewSecurePass123';
      const newHashedPassword = 'new_hashed_password';

      (bcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      (mockPool.query as jest.Mock).mockResolvedValue({});

      await service.updatePassword(userId, newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [newHashedPassword, userId]
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userId = 1;

      (mockPool.query as jest.Mock).mockResolvedValue({});

      await service.deleteUser(userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users'),
        [userId]
      );
    });
  });
});
