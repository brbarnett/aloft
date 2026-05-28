# Aloft

A minimal juggling tracker — keep your balls in the air without overthinking it.

## Prerequisites

- **Node.js** v22+
- **pnpm** — install via:
    ```bash
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```
    Or if you already have Node.js, enable via Corepack:
    ```bash
    corepack enable pnpm
    ```

## Setup

```bash
pnpm install
```

## Development

```bash
make dev        # start the web dev server (http://localhost:5173)
make typecheck  # type-check all packages
make build      # production build
make preview    # preview production build
make clean      # remove dist and node_modules
```

## Project Structure

```
apps/
  web/    — Vite + React + TypeScript frontend (@aloft/web)
  api/    — Backend (placeholder, not yet implemented)
packages/
  types/  — Shared TypeScript interfaces (@aloft/types)
```
