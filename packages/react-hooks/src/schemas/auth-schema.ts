import { z } from 'zod';
import defaultBanedUsernames from '../utils/default-banned-usernames';

const nameRegex = /^[a-zA-Z\s]{2,100}$/;

const nameSchema = (): z.ZodType => {
  return z
    .string()
    .min(2, {
      error: 'Must be at least 2 characters',
    })
    .max(100, {
      error: 'Must be at most 100 characters',
    })
    .regex(nameRegex, {
      error: 'Can only contain letters and spaces',
    });
};

const usernameRegex = /^[a-zA-Z0-9_]{6,20}$/;
const uppercaseRegex = /[A-Z]/;
const lowercaseRegex = /[a-z]/;
const numberRegex = /[0-9]/;
const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

const usernameSchema = (options?: {
  bannedUsernames?: string[];
}): z.ZodType => {
  const { bannedUsernames = defaultBanedUsernames } = options || {};

  return z
    .string()
    .min(6, {
      error: 'Must be at least 6 characters',
    })
    .max(20, {
      error: 'Must be at most 20 characters',
    })
    .regex(usernameRegex, {
      error: 'Can only contain letters, numbers, and underscores',
    })
    .refine((value) => !bannedUsernames.includes(value.toLowerCase()), {
      message: 'This username is not allowed',
    });
};

const emailSchema = (): z.ZodType => {
  return z.email({
    error: 'Invalid email format',
  });
};

const passwordSchema = (): z.ZodType => {
  return z
    .string()
    .min(8, {
      error: 'Must be at least 8 characters',
    })
    .regex(uppercaseRegex, {
      error: 'Must include at least one uppercase letter',
    })
    .regex(lowercaseRegex, {
      error: 'Must include at least one lowercase letter',
    })
    .regex(numberRegex, {
      error: 'Must include at least one number',
    })
    .regex(specialCharRegex, {
      error: 'Must include at least one special character',
    });
};

export { nameSchema, usernameSchema, emailSchema, passwordSchema };
