// biome-ignore lint/performance/noBarrelFile: This is a library entry point, not a barrel file
export {
  useValidateEmail,
  useValidateName,
  useValidatePassword,
  useValidateText,
  useValidateUsername,
  type ValidationResult,
} from "./hooks/use-validations";

export {
  emailSchema,
  nameSchema,
  passwordSchema,
  usernameSchema,
} from "./schemas/auth-schema";
