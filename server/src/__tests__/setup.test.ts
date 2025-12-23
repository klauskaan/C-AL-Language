/**
 * Jest Setup Smoke Test
 *
 * This test verifies that the Jest testing infrastructure is properly configured
 * and can run basic tests.
 */

describe('Jest Setup', () => {
  it('should run basic assertions', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it('should handle basic arithmetic', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });

  it('should handle strings', () => {
    const greeting = 'Hello Jest';
    expect(greeting).toContain('Jest');
    expect(greeting.length).toBeGreaterThan(0);
  });

  it('should handle arrays', () => {
    const items = [1, 2, 3, 4, 5];
    expect(items).toHaveLength(5);
    expect(items).toContain(3);
  });

  it('should handle objects', () => {
    const config = {
      name: 'cal-language-server',
      version: '0.4.4'
    };
    expect(config).toHaveProperty('name');
    expect(config.version).toBe('0.4.4');
  });
});
