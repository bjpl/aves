/**
 * Tests for input sanitization utilities
 */

import {
  sanitizeString,
  sanitizeEmail,
  escapeHtml,
  sanitizeSqlString,
  sanitizeFilePath,
  sanitizeUrl,
  sanitizeSearchQuery,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeObject,
  sanitizeStringArray,
  removeNullBytes,
  truncateString
} from '../validation/sanitize';

describe('Sanitization Utilities', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should remove control characters', () => {
      expect(sanitizeString('test\x00\x01\x1F')).toBe('test');
    });

    it('should remove script tags', () => {
      expect(sanitizeString('hello<script>alert("xss")</script>world')).toBe('helloworld');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should handle mixed case', () => {
      expect(sanitizeEmail('Test.User@Example.COM')).toBe('test.user@example.com');
    });
  });

  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape angle brackets', () => {
      expect(escapeHtml('<div>content</div>')).toBe('&lt;div&gt;content&lt;&#x2F;div&gt;');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"quoted" and \'single\'')).toBe('&quot;quoted&quot; and &#x27;single&#x27;');
    });

    it('should escape all HTML special characters', () => {
      const input = '&<>"\'/';
      const expected = '&amp;&lt;&gt;&quot;&#x27;&#x2F;';
      expect(escapeHtml(input)).toBe(expected);
    });
  });

  describe('sanitizeSqlString', () => {
    it('should escape single quotes', () => {
      expect(sanitizeSqlString("O'Reilly")).toBe("O''Reilly");
    });

    it('should remove semicolons', () => {
      expect(sanitizeSqlString('DROP TABLE users;')).toBe('DROP TABLE users');
    });

    it('should remove SQL comments', () => {
      expect(sanitizeSqlString('SELECT * FROM users--')).toBe('SELECT * FROM users');
    });

    it('should remove multi-line comment markers', () => {
      expect(sanitizeSqlString('/* comment */ SELECT')).toBe(' comment  SELECT');
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove parent directory references', () => {
      expect(sanitizeFilePath('../../../etc/passwd')).toBe('etc/passwd');
    });

    it('should remove invalid filename characters', () => {
      expect(sanitizeFilePath('file<name>:test|file?.txt')).toBe('filenametestfile.txt');
    });

    it('should remove leading slashes', () => {
      expect(sanitizeFilePath('/usr/local/file.txt')).toBe('usr/local/file.txt');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilePath('  file.txt  ')).toBe('file.txt');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow https URLs', () => {
      const url = 'https://example.com';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should allow http URLs', () => {
      const url = 'http://example.com';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBe('');
    });

    it('should block file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  search term  ')).toBe('search term');
    });

    it('should allow Spanish characters', () => {
      expect(sanitizeSearchQuery('búho español')).toBe('búho español');
    });

    it('should remove special characters', () => {
      expect(sanitizeSearchQuery('test@#$%query')).toBe('testquery');
    });

    it('should allow hyphens and underscores', () => {
      expect(sanitizeSearchQuery('test-query_term')).toBe('test-query_term');
    });

    it('should limit length to 200 characters', () => {
      const longQuery = 'a'.repeat(300);
      expect(sanitizeSearchQuery(longQuery).length).toBe(200);
    });
  });

  describe('sanitizeNumber', () => {
    it('should convert valid number strings', () => {
      expect(sanitizeNumber('42')).toBe(42);
    });

    it('should handle actual numbers', () => {
      expect(sanitizeNumber(42)).toBe(42);
    });

    it('should return null for NaN', () => {
      expect(sanitizeNumber('not a number')).toBeNull();
    });

    it('should return null for infinity', () => {
      expect(sanitizeNumber(Infinity)).toBeNull();
    });

    it('should handle negative numbers', () => {
      expect(sanitizeNumber(-42)).toBe(-42);
    });

    it('should handle decimals', () => {
      expect(sanitizeNumber(3.14)).toBe(3.14);
    });
  });

  describe('sanitizeBoolean', () => {
    it('should handle boolean true', () => {
      expect(sanitizeBoolean(true)).toBe(true);
    });

    it('should handle boolean false', () => {
      expect(sanitizeBoolean(false)).toBe(false);
    });

    it('should convert string "true" to true', () => {
      expect(sanitizeBoolean('true')).toBe(true);
    });

    it('should convert string "TRUE" to true', () => {
      expect(sanitizeBoolean('TRUE')).toBe(true);
    });

    it('should convert string "false" to false', () => {
      expect(sanitizeBoolean('false')).toBe(false);
    });

    it('should convert truthy values to true', () => {
      expect(sanitizeBoolean(1)).toBe(true);
      expect(sanitizeBoolean({})).toBe(true);
      expect(sanitizeBoolean([])).toBe(true);
    });

    it('should convert falsy values to false', () => {
      expect(sanitizeBoolean(0)).toBe(false);
      expect(sanitizeBoolean('')).toBe(false);
      expect(sanitizeBoolean(null)).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values', () => {
      const input = {
        name: '  John  ',
        email: 'john@example.com',
        age: 30
      };

      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(30);
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '  Jane  ',
          email: 'jane@example.com'
        }
      };

      const result = sanitizeObject(input);
      expect(result.user.name).toBe('Jane');
      expect(result.user.email).toBe('jane@example.com');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['  tag1  ', '  tag2  ']
      };

      const result = sanitizeObject(input);
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('sanitizeStringArray', () => {
    it('should sanitize all strings in array', () => {
      const input = ['  test1  ', '  test2  '];
      expect(sanitizeStringArray(input)).toEqual(['test1', 'test2']);
    });

    it('should filter out non-strings', () => {
      const input = ['test', 123, 'hello', null, 'world'] as any[];
      expect(sanitizeStringArray(input)).toEqual(['test', 'hello', 'world']);
    });

    it('should filter out empty strings after sanitization', () => {
      const input = ['test', '   ', 'hello'];
      expect(sanitizeStringArray(input)).toEqual(['test', 'hello']);
    });

    it('should handle non-array input', () => {
      expect(sanitizeStringArray('not an array' as any)).toEqual([]);
    });
  });

  describe('removeNullBytes', () => {
    it('should remove null bytes', () => {
      expect(removeNullBytes('test\0null\0bytes')).toBe('testnullbytes');
    });

    it('should handle strings without null bytes', () => {
      expect(removeNullBytes('normal string')).toBe('normal string');
    });

    it('should handle non-string input', () => {
      expect(removeNullBytes(123 as any)).toBe('');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      const long = 'a'.repeat(100);
      expect(truncateString(long, 50)).toHaveLength(50);
    });

    it('should not truncate short strings', () => {
      expect(truncateString('short', 100)).toBe('short');
    });

    it('should handle exact length', () => {
      const str = 'exact';
      expect(truncateString(str, str.length)).toBe(str);
    });

    it('should handle non-string input', () => {
      expect(truncateString(123 as any, 10)).toBe('');
    });
  });
});
