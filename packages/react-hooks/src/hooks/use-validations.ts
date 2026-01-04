import { useMemo } from "react";
import type z from "zod";
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneNumberSchema,
  usernameSchema,
} from "../schemas/auth-schema";

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

/**
 * Validates an email address.
 * @param email - The email address to validate.
 * @returns An object containing the validation result and any error messages.
 */
const useValidateEmail = (email?: string): ValidationResult =>
  useMemo(() => {
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

/**
 * Validates a password.
 * @param password - The password to validate.
 * @returns An object containing the validation result and any error messages.
 */
const useValidatePassword = (password?: string): ValidationResult =>
  useMemo(() => {
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

/** * Validates a name.
 * @param name - The name to validate.
 * @returns An object containing the validation result and any error messages.
 */
const useValidateName = (name?: string): ValidationResult =>
  useMemo(() => {
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

/** * Validates a username.
 * @param username - The username to validate.
 * @param options - Optional settings for validation.
 * @returns An object containing the validation result and any error messages.
 */
const useValidateUsername = (
  username?: string,
  options?: {
    bannedUsernames?: string[];
  }
): ValidationResult =>
  useMemo(() => {
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

/** * Validates a phone number.
 * @param phoneNumber - The phone number to validate.
 * @returns An object containing the validation result and any error messages.
 */
const useValidatePhoneNumber = (phoneNumber?: string): ValidationResult =>
  useMemo(() => {
    const { success, error } = phoneNumberSchema.safeParse(phoneNumber);

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
  }, [phoneNumber]);

/** * Validates text against a provided schema.
 * @param text - The text to validate.
 * @param schema - The Zod schema to validate against.
 * @returns An object containing the validation result and any error messages.
 */
const useValidateText = (text: string, schema: z.ZodType): ValidationResult => {
  if (!schema) {
    throw new Error("Schema is required for validation");
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
  useValidatePhoneNumber,
  useValidateText,
  type ValidationResult,
};
