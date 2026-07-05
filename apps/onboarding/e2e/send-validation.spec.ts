import { expect, test } from '@playwright/test';
import { createWallet } from './helpers';

const PASSWORD = 'Sup3r$ecretPhrase!2026';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await createWallet(page, PASSWORD);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: /Ethereum/ }).click();
  await expect(page.getByRole('heading', { name: 'Send ETH' })).toBeVisible();
});

test('rejects an invalid recipient address', async ({ page }) => {
  await page.getByPlaceholder(/address or name\.eth/).fill('not-a-real-address');
  await expect(page.getByText(/Not a valid/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review' })).toBeDisabled();
});

test('accepts a valid recipient address but blocks Review on an empty balance', async ({ page }) => {
  await page.getByPlaceholder(/address or name\.eth/).fill('0x000000000000000000000000000000000000dEaD');
  await expect(page.getByText(/Not a valid/)).not.toBeVisible();

  await page.getByPlaceholder('0.00').fill('0.5');
  // A fresh wallet has 0 ETH — the form must refuse to let this proceed,
  // never attempting a network call with a doomed transaction.
  await expect(page.getByText(/Exceeds balance/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review' })).toBeDisabled();
});

test('resolves an ENS name to a real address', async ({ page }) => {
  await page.getByPlaceholder(/address or name\.eth/).fill('vitalik.eth');
  await expect(page.getByText(/^→ 0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}$/)).toBeVisible({ timeout: 15_000 });
});

test('asset picker lists every EVM network plus Bitcoin and Solana', async ({ page }) => {
  await page.getByRole('button', { name: 'Change' }).click(); // back to the asset picker
  for (const name of ['Bitcoin', 'Ethereum', 'Polygon', 'BNB Chain', 'Arbitrum', 'Optimism', 'Base', 'Avalanche', 'Solana']) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
});
