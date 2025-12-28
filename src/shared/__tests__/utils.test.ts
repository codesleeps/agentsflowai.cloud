import { buildQueryParams } from '../utils';

describe('buildQueryParams', () => {
  describe('null and empty handling', () => {
    test('returns null for null input', () => {
      expect(buildQueryParams(null as any)).toBeNull();
    });

    test('returns null for empty object', () => {
      expect(buildQueryParams({})).toBeNull();
    });

    test('returns null when all values are null or undefined', () => {
      expect(buildQueryParams({ a: null, b: undefined })).toBeNull();
    });
  });

  describe('simple key-value pairs', () => {
    test('handles single string parameter', () => {
      expect(buildQueryParams({ name: 'John' })).toBe('name=John');
    });

    test('handles multiple string parameters', () => {
      expect(buildQueryParams({ name: 'John', city: 'NYC' })).toBe('name=John&city=NYC');
    });

    test('handles number parameters', () => {
      expect(buildQueryParams({ age: 25, count: 100 })).toBe('age=25&count=100');
    });

    test('handles boolean parameters', () => {
      expect(buildQueryParams({ active: true, verified: false })).toBe('active=true&verified=false');
    });

    test('encodes special characters', () => {
      expect(buildQueryParams({ name: 'John Doe', email: 'john@example.com' }))
        .toBe('name=John%20Doe&email=john%40example.com');
    });

    test('handles mixed parameter types', () => {
      const result = buildQueryParams({ name: 'John', age: 30, active: true });
      expect(result).toBe('name=John&age=30&active=true');
    });
  });

  describe('array handling', () => {
    test('handles array with single item', () => {
      // The implementation uses unencoded brackets: key[]=value (standard format)
      expect(buildQueryParams({ tags: ['javascript'] })).toBe('tags[]=javascript');
    });

    test('handles array with multiple items', () => {
      const result = buildQueryParams({ tags: ['js', 'ts', 'react'] });
      expect(result).toBe('tags[]=js&tags[]=ts&tags[]=react');
    });

    test('handles empty array', () => {
      expect(buildQueryParams({ tags: [] })).toBe(null);
    });

    test('handles array with numbers', () => {
      const result = buildQueryParams({ ids: [1, 2, 3] });
      expect(result).toBe('ids[]=1&ids[]=2&ids[]=3');
    });
  });

  describe('nested object handling', () => {
    test('handles nested object with single property', () => {
      const result = buildQueryParams({ filter: { status: 'active' } });
      expect(result).toBe('filter[status]=active');
    });

    test('handles nested object with multiple properties', () => {
      const result = buildQueryParams({ filter: { status: 'active', type: 'user' } });
      expect(result).toContain('filter[status]=active');
      expect(result).toContain('filter[type]=user');
    });

    test('handles nested object with null values', () => {
      const result = buildQueryParams({ filter: { status: 'active', type: null } });
      expect(result).toBe('filter[status]=active');
    });

    test('handles nested object with undefined values', () => {
      const result = buildQueryParams({ filter: { status: 'active', type: undefined } });
      expect(result).toBe('filter[status]=active');
    });
  });

  describe('mixed complex parameters', () => {
    test('handles combination of simple, array, and nested objects', () => {
      const result = buildQueryParams({
        search: 'test',
        tags: ['a', 'b'],
        filter: { active: true },
      });
      expect(result).toContain('search=test');
      expect(result).toContain('tags[]=a');
      expect(result).toContain('tags[]=b');
      expect(result).toContain('filter[active]=true');
    });

    test('skips null and undefined in mixed params', () => {
      const result = buildQueryParams({
        name: 'John',
        age: null,
        city: undefined,
        active: true
      });
      expect(result).toBe('name=John&active=true');
    });
  });

  describe('edge cases', () => {
    test('handles empty string value', () => {
      expect(buildQueryParams({ name: '' })).toBe('name=');
    });

    test('handles zero as value', () => {
      expect(buildQueryParams({ count: 0 })).toBe('count=0');
    });

    test('handles keys with special characters', () => {
      const result = buildQueryParams({ 'my-key': 'value', 'another key': 'test' });
      expect(result).toContain('my-key=value');
      expect(result).toContain('another%20key=test');
    });
  });
});
