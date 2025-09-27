# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the App Router tree; `layout.tsx` defines the global shell, while folders such as `feed/` and `llm/` expose route segments with their own `page.tsx`.
- Reusable UI lives in `components/`, grouped by domain (`common`, `layout`, etc.); build new pieces atop `components/common` primitives before adding folders.
- Global styling comes from `app/globals.css` and tokens in `tailwind.config.ts`. Extend those instead of inlining ad-hoc colors or fonts.
- Keep product decisions aligned with the brief in `docs/start.md`; grow shared data helpers inside `lib/` when real APIs arrive.

## Build, Test, and Development Commands
- Install dependencies with `bun install`; Bun is the expected runtime and package manager.
- `bun run dev` launches the local Next.js server (port 3000) with fast refresh for design iteration.
- `bun run build` compiles the production bundle; follow it with `bun run start` to smoke-test the optimized output.
- `bun run lint` executes `next lint`; resolve or justify every warning before opening a pull request.

## Coding Style & Naming Conventions
- Use TypeScript throughout. Store components in `.tsx`, utilities in `.ts`, and export React components as PascalCase functions.
- Maintain 2-space indentation, trailing commas, and double quotes to satisfy the default Next.js ESLint profile.
- Prefer Tailwind utilities and variants declared in `tailwind.config.ts`; extract repeated class sets into helpers under `components/common`.
- Name folders and files in lowercase-kebab case (e.g., `activity-feed`) to mirror the existing structure.

## Testing Guidelines
- Automated tests are not wired yet; when introducing them, co-locate specs beside implementation files (`feature.test.tsx`) and document the command in `package.json`.
- Until a test runner is configured, list manual verification steps in PRs: routes touched, responsive checks, and LLM interactions exercised.
- Keep mock data lightweight and isolate external calls under `lib/` so future test harnesses can stub them cleanly.

## Commit & Pull Request Guidelines
- Write commit subjects in English, imperative mood (`Add feed skeleton`) and keep each commit scoped to one logical change.
- Reference related issues in the footer (`Refs #123`) and call out UX or design rationale when it deviates from `docs/start.md`.
- Pull requests should include a narrative summary, screenshots or recordings for UI changes, lint/build status, and notes on any new env variables.
- Flag breaking changes early, request review once linting passes, and coordinate deployment prerequisites in the PR description.
