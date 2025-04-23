# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build: `npm run build`
- Dev server: `npm run dev`
- Type check: `npm run type-check`
- Preview build: `npm run preview`

## Code Style

- TypeScript is required with strict typing
- Use Vue 3 composition API with `<script setup>` syntax
- Follow Vue SFC structure: `<script>`, `<template>`, and optionally `<style>`
- Import paths use `@/` alias for `src/` directory
- Use reactive refs (`ref()`) for component state
- Prefer arrow functions for handlers and async operations
- Components: PascalCase for components, camelCase for instances
- Maintain clean async/await patterns with proper error handling
- Handle Amplify client operations with proper subscription cleanup
- Always include type annotations for refs and function parameters

## Project Structure

- Vue components in `src/components/`
- Amplify backend configuration in `amplify/`
- CSS in `src/assets/`