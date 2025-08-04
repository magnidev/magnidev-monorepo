import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useValidateEmail } from '../../../hooks/use-validations';

describe('useValidateEmail', () => {
  it('should return valid result for valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'email+tag@example.org',
      'valid.email@test-domain.com',
    ];

    for (const email of validEmails) {
      const { result } = renderHook(() => useValidateEmail(email));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    }
  });

  it('should return invalid result for invalid email addresses', () => {
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'test@',
      'test..test@example.com',
      'test@example.',
      '',
      'test email@example.com',
    ];

    for (const email of invalidEmails) {
      const { result } = renderHook(() => useValidateEmail(email));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errors[0]).toContain('Invalid email format');
    }
  });

  it('should return invalid result for undefined email', () => {
    const { result } = renderHook(() => useValidateEmail(undefined));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it('should memoize results for the same email', () => {
    const email = 'test@example.com';
    const { result, rerender } = renderHook(() => useValidateEmail(email));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('should update result when email changes', () => {
    const { result, rerender } = renderHook(
      ({ emailValue }) => useValidateEmail(emailValue),
      {
        initialProps: { emailValue: 'valid@example.com' },
      }
    );

    expect(result.current.isValid).toBe(true);

    rerender({ emailValue: 'invalid-email' });

    expect(result.current.isValid).toBe(false);
  });
});
