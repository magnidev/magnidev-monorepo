import { useMemo } from 'react';
import type z from 'zod';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  usernameSchema,
} from '../schemas/auth-schema';

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

const useValidateEmail = (email?: string): ValidationResult => {
  return useMemo(() => {
    const { success, error } = emailSchema().safeParse(email);

    if (success) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    if (error.issues.length > 0) {
      for (const issue of error.issues) {
        errors.push(issue.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [email]);
};

const useValidatePassword = (password?: string): ValidationResult => {
  return useMemo(() => {
    const { success, error } = passwordSchema().safeParse(password);

    if (success) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    if (error.issues.length > 0) {
      for (const issue of error.issues) {
        errors.push(issue.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [password]);
};

const useValidateName = (name?: string): ValidationResult => {
  return useMemo(() => {
    const { success, error } = nameSchema().safeParse(name);

    if (success) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    if (error.issues.length > 0) {
      for (const issue of error.issues) {
        errors.push(issue.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [name]);
};

const useValidateUsername = (
  username?: string,
  options?: {
    bannedUsernames?: string[];
  }
): ValidationResult => {
  return useMemo(() => {
    const { bannedUsernames } = options || {};

    const { success, error } = usernameSchema({
      bannedUsernames,
    }).safeParse(username);

    if (success) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    if (error.issues.length > 0) {
      for (const issue of error.issues) {
        errors.push(issue.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [username, options]);
};

const useValidateText = (text: string, schema: z.ZodType): ValidationResult => {
  if (!schema) {
    throw new Error('Schema is required for validation');
  }

  return useMemo(() => {
    const { success, error } = schema.safeParse(text);

    if (success) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    if (error.issues.length > 0) {
      for (const issue of error.issues) {
        errors.push(issue.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [text, schema]);
};

export {
  useValidateEmail,
  useValidatePassword,
  useValidateName,
  useValidateUsername,
  useValidateText,
  type ValidationResult,
};
