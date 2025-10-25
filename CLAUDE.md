# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Calendera** is a Next.js 16.0.0 application using the App Router, React 19.2.0, TypeScript, and Tailwind CSS v4. The project follows Next.js App Router conventions with server components by default.

## Development Commands

### Running the Development Server
```bash
npm run dev
```
Starts the development server at http://localhost:3000 with hot reload enabled.

### Building for Production
```bash
npm run build
```
Creates an optimized production build in the `.next` directory.

### Starting Production Server
```bash
npm run start
```
Runs the production build locally (must run `npm run build` first).

### Linting
```bash
npm run lint
```
Uses ESLint with Next.js config for TypeScript files. Configuration in `eslint.config.mjs`.

## Architecture

### App Router Structure
- Uses Next.js App Router (not Pages Router)
- Entry point: `app/page.tsx` (home page)
- Root layout: `app/layout.tsx` (defines HTML structure, metadata, and global fonts)
- All routes should be created as directories under `app/` with their own `page.tsx`

### Styling
- **Tailwind CSS v4** with PostCSS integration
- Global styles in `app/globals.css` with CSS custom properties for theming
- Dark mode support via `prefers-color-scheme` media query
- Two custom color variables: `--background` and `--foreground` (theme-aware)
- Inline theme configuration using `@theme inline` directive

### Fonts
- Uses Next.js Google Fonts optimization (`next/font/google`)
- **Geist Sans** and **Geist Mono** fonts are preloaded
- Font variables: `--font-geist-sans` and `--font-geist-mono`

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Target: ES2017
- Module resolution: bundler

### Component Conventions
- Server Components by default (no 'use client' directive needed unless using hooks/interactivity)
- Client Components require explicit `'use client'` directive at top of file
- Use `next/image` for optimized images
- Metadata exported from layouts and pages using Next.js Metadata API

## Key Technical Details

- **Next.js Version**: 16.0.0 (uses latest App Router features)
- **React Version**: 19.2.0 (latest with React Compiler support)
- **TypeScript**: Configured with strict checks and JSX transform set to `react-jsx`
- **ESLint**: Uses `eslint-config-next` with both core-web-vitals and TypeScript rules
- **PostCSS**: Configured with `@tailwindcss/postcss` plugin for Tailwind v4 processing
