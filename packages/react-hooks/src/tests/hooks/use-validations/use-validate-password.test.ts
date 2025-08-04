import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useValidatePassword } from '../../../hooks/use-validations';

describe('useValidatePassword', () => {
  it('should return valid result for valid passwords', () => {
    const validPasswords = [
      'Password123!',
      'Test@Password1',
      'MySecure#Pass99',
      'StrongPwd$2024',
    ];

    for (const password of validPasswords) {
      const { result } = renderHook(() => useValidatePassword(password));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    }
  });

  it('should return invalid result for passwords that are too short', () => {
    const shortPasswords = ['Pass1!', 'Ab3$', '1234567'];

    for (const password of shortPasswords) {
      const { result } = renderHook(() => useValidatePassword(password));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain('Must be at least 8 characters');
    }
  });

  it('should return invalid result for passwords without uppercase letters', () => {
    const { result } = renderHook(() => useValidatePassword('password123!'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      'Must include at least one uppercase letter'
    );
  });

  it('should return invalid result for passwords without lowercase letters', () => {
    const { result } = renderHook(() => useValidatePassword('PASSWORD123!'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      'Must include at least one lowercase letter'
    );
  });

  it('should return invalid result for passwords without numbers', () => {
    const { result } = renderHook(() => useValidatePassword('Password!'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain('Must include at least one number');
  });

  it('should return invalid result for passwords without special characters', () => {
    const { result } = renderHook(() => useValidatePassword('Password123'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      'Must include at least one special character'
    );
  });

  it('should return multiple errors for passwords with multiple issues', () => {
    const { result } = renderHook(() => useValidatePassword('pass'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(1);
    expect(result.current.errors).toContain('Must be at least 8 characters');
    expect(result.current.errors).toContain(
      'Must include at least one uppercase letter'
    );
    expect(result.current.errors).toContain('Must include at least one number');
    expect(result.current.errors).toContain(
      'Must include at least one special character'
    );
  });

  it('should return invalid result for undefined password', () => {
    const { result } = renderHook(() => useValidatePassword(undefined));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it('should memoize results for the same password', () => {
    const password = 'Password123!';
    const { result, rerender } = renderHook(() =>
      useValidatePassword(password)
    );

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('should update result when password changes', () => {
    const { result, rerender } = renderHook(
      ({ passwordValue }) => useValidatePassword(passwordValue),
      {
        initialProps: { passwordValue: 'Password123!' },
      }
    );

    expect(result.current.isValid).toBe(true);

    rerender({ passwordValue: 'weak' });

    expect(result.current.isValid).toBe(false);
  });
});
