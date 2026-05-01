# Verification

Run the full verification stack in this order:

1. `./harness/init.sh`
2. `./harness/verify.sh`
3. `./node_modules/.bin/vitest run apps/server/src/**/*.test.ts packages/*/src/**/*.test.ts`
4. `./apps/web/node_modules/.bin/vitest run src/**/*.test.ts`
5. `./node_modules/.bin/playwright test`
