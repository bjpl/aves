/**
 * Axios Mock Test Examples
 *
 * Demonstrates best practices for mocking axios in tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosError,
  mockAxiosTimeout,
  mockAxiosUnauthorized,
  mockAxiosNotFound,
  mockAxiosSequence,
  createMockAxiosResponse,
  createMockAxiosError,
  clearAxiosMocks,
  assertAxiosCalledWith,
  assertAxiosCallCount,
} from '../utils/axios-mock-helpers';

// Example service using axios
class ApiService {
  async getData(id: string) {
    const response = await axios.get(`/api/data/${id}`);
    return response.data;
  }

  async createData(data: any) {
    const response = await axios.post('/api/data', data);
    return response.data;
  }

  async getDataWithRetry(id: string, maxRetries = 3) {
    let lastError: Error | undefined;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this.getData(id);
      } catch (error) {
        lastError = error as Error;
        if (i === maxRetries) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    throw lastError;
  }
}

describe('Axios Mock Testing Examples', () => {
  let service: ApiService;

  beforeEach(() => {
    service = new ApiService();
  });

  afterEach(() => {
    clearAxiosMocks();
  });

  describe('Example 1: Basic GET Request Mocking', () => {
    it('should mock successful GET request', async () => {
      const mockData = { id: '123', name: 'Test Item' };
      const spy = mockAxiosGet('/api/data/123', mockData);

      const result = await service.getData('123');

      expect(result).toEqual(mockData);
      assertAxiosCallCount(spy, 1);
    });

    it('should mock GET request with regex matcher', async () => {
      const mockData = { id: '456', name: 'Another Item' };
      mockAxiosGet(/\/api\/data\/\d+/, mockData);

      const result = await service.getData('456');

      expect(result).toEqual(mockData);
    });

    it('should mock GET request with delay', async () => {
      const mockData = { id: '789', name: 'Delayed Item' };
      mockAxiosGet('/api/data/789', mockData, 100);

      const startTime = Date.now();
      const result = await service.getData('789');
      const duration = Date.now() - startTime;

      expect(result).toEqual(mockData);
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });

  describe('Example 2: Basic POST Request Mocking', () => {
    it('should mock successful POST request', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: 'new-123', ...requestData };
      const spy = mockAxiosPost('/api/data', responseData);

      const result = await service.createData(requestData);

      expect(result).toEqual(responseData);
      assertAxiosCallCount(spy, 1);
    });
  });

  describe('Example 3: Error Scenarios', () => {
    it('should mock network error', async () => {
      mockAxiosError('get', '/api/data/123', 'Network Error');

      await expect(service.getData('123')).rejects.toThrow('Network Error');
    });

    it('should mock timeout error', async () => {
      mockAxiosTimeout('get', '/api/data/123');

      await expect(service.getData('123')).rejects.toThrow('Network timeout');
    });

    it('should mock 401 unauthorized error', async () => {
      mockAxiosUnauthorized('get', '/api/data/123');

      await expect(service.getData('123')).rejects.toThrow('Unauthorized');
    });

    it('should mock 404 not found error', async () => {
      mockAxiosNotFound('get', '/api/data/999');

      await expect(service.getData('999')).rejects.toThrow('Not found');
    });

    it('should mock custom axios error', async () => {
      const customError = createMockAxiosError('Custom error', 403, 'FORBIDDEN');
      mockAxiosError('get', '/api/data/123', customError);

      await expect(service.getData('123')).rejects.toMatchObject({
        message: 'Custom error',
        code: 'FORBIDDEN',
        response: expect.objectContaining({ status: 403 }),
      });
    });
  });

  describe('Example 4: Retry Logic Testing', () => {
    it('should succeed on retry after initial failure', async () => {
      const successData = { id: '123', name: 'Success' };

      mockAxiosSequence('get', '/api/data/123', [
        { error: 'Network Error' },
        { error: 'Network Error' },
        { data: successData },
      ]);

      const result = await service.getDataWithRetry('123', 3);

      expect(result).toEqual(successData);
    });

    it('should fail after max retries', async () => {
      mockAxiosSequence('get', '/api/data/123', [
        { error: 'Network Error' },
        { error: 'Network Error' },
        { error: 'Network Error' },
        { error: 'Network Error' },
      ]);

      await expect(service.getDataWithRetry('123', 3)).rejects.toThrow('Network Error');
    });
  });

  describe('Example 5: Assertion Helpers', () => {
    it('should verify axios was called with correct params', async () => {
      const spy = mockAxiosGet('/api/data/123', { id: '123' });

      await service.getData('123');

      assertAxiosCalledWith(spy, '/api/data/123');
    });

    it('should verify call count', async () => {
      const spy = mockAxiosGet('/api/data/123', { id: '123' });

      await service.getData('123');
      await service.getData('123');
      await service.getData('123');

      assertAxiosCallCount(spy, 3);
    });
  });

  describe('Example 6: Complex Response Mocking', () => {
    it('should mock response with custom headers', async () => {
      const mockData = { id: '123', name: 'Test' };
      const spy = jest.spyOn(axios, 'get');

      spy.mockResolvedValueOnce(
        createMockAxiosResponse(mockData, {
          headers: {
            'x-custom-header': 'custom-value',
            'content-type': 'application/json',
          },
        })
      );

      const response = await axios.get('/api/data/123');

      expect(response.data).toEqual(mockData);
      expect(response.headers['x-custom-header']).toBe('custom-value');
    });

    it('should mock response with custom status code', async () => {
      const spy = jest.spyOn(axios, 'post');

      spy.mockResolvedValueOnce(
        createMockAxiosResponse({ created: true }, { status: 201 })
      );

      const response = await axios.post('/api/data', { name: 'New Item' });

      expect(response.status).toBe(201);
      expect(response.data).toEqual({ created: true });
    });
  });

  describe('Example 7: Multiple Concurrent Requests', () => {
    it('should handle concurrent requests', async () => {
      mockAxiosGet('/api/data/1', { id: '1', name: 'Item 1' });
      mockAxiosGet('/api/data/2', { id: '2', name: 'Item 2' });
      mockAxiosGet('/api/data/3', { id: '3', name: 'Item 3' });

      const [result1, result2, result3] = await Promise.all([
        service.getData('1'),
        service.getData('2'),
        service.getData('3'),
      ]);

      expect(result1.name).toBe('Item 1');
      expect(result2.name).toBe('Item 2');
      expect(result3.name).toBe('Item 3');
    });
  });
});
