# Contributing Guide

## Prerequisites

- Node.js 18+
- MongoDB (for local backend dev)
- Chrome (for extension testing)

## Project Structure

- `sss-backend` - Express + MongoDB API
- `sss-dashboard` - React admin dashboard
- `sss-chrome-extension` - MV3 Chrome extension

## Local Development

1. Backend
   - `cd sss-backend`
   - Copy `.env.example` to `.env` and fill in values.
   - `npm install`
   - `npm run dev`

2. Dashboard
   - `cd sss-dashboard`
   - `npm install`
   - `npm run dev`

3. Extension
   - `cd sss-chrome-extension`
   - `npm install`
   - `npm run build`
   - Load the `dist` folder via Chrome > Extensions > Load unpacked.

## Tests

- Backend: `cd sss-backend && npm test`
- Dashboard: `cd sss-dashboard && npm test`
- Extension: `cd sss-chrome-extension && npm test`

## Conventions

- Prefer small, focused PRs.
- Keep API responses consistent: `{ success, data?, message? }`.
- Use existing service wrappers for API requests on the dashboard.
- Keep extension background logic in `background/` and UI logic in `popup/`.
