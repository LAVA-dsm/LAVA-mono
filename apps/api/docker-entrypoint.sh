#!/bin/sh
set -e

pnpm prisma:generate
pnpm prisma db push --skip-generate

exec node dist/main.js
