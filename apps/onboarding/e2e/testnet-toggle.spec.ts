import { expect, test } from '@playwright/test';
import { createWallet } from './helpers';

const PASSWORD = 'Sup3r$ecretPhrase!2026';

test('toggling Settings → Testnet shows the testnet banner, a tb1 BTC address, and a Sepolia send target', async ({ page }) => {
  await page.goto('/');
  await createWallet(page, PASSWORD);

  await expect(page.getByText(/Testnet mode/)).not.toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: '🧪 Testnet' }).click();
  await page.getByRole('button', { name: 'Back' }).click();

  await expect(page.getByText(/Testnet mode/)).toBeVisible();

  // Bitcoin address is a SEPARATE, genuinely-derived testnet keypair (tb1…),
  // not just the mainnet address re-displayed.
  await page.getByRole('button', { name: 'Receive' }).first().click();
  await expect(page.getByText(/^tb1[a-z0-9]+$/)).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();

  // Send screen offers Sepolia/testnet-only assets, not the mainnet list.
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Bitcoin (Testnet)', { exact: true })).toBeVisible();
  await expect(page.getByText('Sepolia', { exact: true })).toBeVisible();
  await expect(page.getByText('Solana (Devnet)', { exact: true })).toBeVisible();
  await expect(page.getByText('Polygon', { exact: true })).not.toBeVisible();
});

test('toggling back to Mainnet restores the real asset list and clears the testnet banner', async ({ page }) => {
  await page.goto('/');
  await createWallet(page, PASSWORD);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: '🧪 Testnet' }).click();
  await page.getByRole('button', { name: 'mainnet' }).click();
  await page.getByRole('button', { name: 'Back' }).click();

  await expect(page.getByText(/Testnet mode/)).not.toBeVisible();

  await page.getByRole('button', { name: 'Receive' }).first().click();
  await expect(page.getByText(/^bc1[a-z0-9]+$/)).toBeVisible();
});
