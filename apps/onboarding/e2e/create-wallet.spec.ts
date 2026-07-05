import { expect, test } from '@playwright/test';
import { createWallet } from './helpers';

const PASSWORD = 'Sup3r$ecretPhrase!2026';

test('creates a wallet end-to-end and derives real BTC/ETH/SOL addresses', async ({ page }) => {
  await page.goto('/');
  await createWallet(page, PASSWORD);

  // Dashboard reached — now confirm real addresses were derived (via Receive,
  // which shows whichever asset is selected; default is Bitcoin). A fresh
  // wallet is empty, so an empty-state "Receive" CTA may ALSO be present —
  // always target the primary action row's copy, not whichever renders first.
  await page.getByRole('button', { name: 'Receive' }).first().click();
  await expect(page.getByText(/^bc1[a-z0-9]+$/)).toBeVisible();

  // Switch to Ethereum and Solana — both should show real, distinct address formats.
  await page.getByRole('button', { name: /ETH/ }).click();
  await expect(page.getByText(/^0x[a-fA-F0-9]{40}$/)).toBeVisible();

  await page.getByRole('button', { name: /SOL/ }).click();
  await expect(page.getByText(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)).toBeVisible();
});

test('rejects a weak password on the create-password screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a new wallet' }).click();

  await page.getByPlaceholder('At least 8 characters').fill('weak');
  await page.getByPlaceholder('Re-enter your password').fill('weak');
  await page.getByRole('checkbox').check();

  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

test('rejects mismatched password confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a new wallet' }).click();

  await page.getByPlaceholder('At least 8 characters').fill(PASSWORD);
  await page.getByPlaceholder('Re-enter your password').fill(PASSWORD + 'X');
  await page.getByRole('checkbox').check();

  await expect(page.getByText('Passwords do not match')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

test('import rejects an invalid recovery phrase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I already have a recovery phrase' }).click();

  await page.getByPlaceholder('word1 word2 word3 …').fill('not a real recovery phrase at all here today');
  await expect(page.getByText(/Invalid phrase|words — need/)).toBeVisible();
});

test('create → lock → unlock round-trips to the same wallet', async ({ page }) => {
  await page.goto('/');
  await createWallet(page, PASSWORD);

  // A fresh wallet is empty, so the dashboard shows a "Receive" CTA in BOTH
  // the primary action row and the empty-state card — target the primary one.
  await page.getByRole('button', { name: 'Receive' }).first().click();
  const addressLocator = page.getByText(/^bc1[a-z0-9]+$/);
  const originalAddress = await addressLocator.textContent();

  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Lock' }).click();
  await expect(page.getByText('Welcome back')).toBeVisible();

  // Wrong password is rejected.
  await page.getByPlaceholder('Your device password').fill('totally-wrong');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByText(/incorrect|tampered/i)).toBeVisible();

  // Correct password unlocks back to the SAME address.
  await page.getByPlaceholder('Your device password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByText('TOTAL BALANCE')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Receive' }).first().click();
  await expect(addressLocator).toHaveText(originalAddress!);
});
