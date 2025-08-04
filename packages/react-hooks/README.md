# @magnidev/react-hooks

A collection of reusable React hooks for modern web development, designed to simplify state management, validation, and other common patterns in React applications.

## Features

- **Validation hooks**: Easily validate user input for forms (email, password, username, etc.)
- **Schema utilities**: Predefined schemas for authentication and more
- **Utility functions**: Helpers for common React patterns

## Installation

```bash
pnpm add @magnidev/react-hooks

npm install @magnidev/react-hooks

yarn add @magnidev/react-hooks
```

## Usage

Import the hooks you need:

```tsx
import { useState } from "react";
import { useValidateEmail, useValidatePassword } from "@magnidev/react-hooks";

function MyForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const validateEmail = useValidateEmail(email);
  const validatePassword = useValidatePassword(password);

  if (!validateEmail.isValid) {
    console.error(validateEmail.error);
  }

  if (!validatePassword.isValid) {
    console.error(validatePassword.error);
  }

  // ...
}
```

## Available Hooks

- `useValidateEmail` for validating email addresses
- `useValidatePassword` for validating passwords
- `useValidateUsername` for validating usernames
- `useValidateName` for validating names
- `useValidateText` for validating general text input

## Schemas

- `authSchema` for authentication-related validation

## Contributing

Contributions are welcome! Please see [contributing](../../CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
