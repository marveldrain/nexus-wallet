import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Drives the REAL create-wallet flow against the REAL app (real scrypt
 * encryption, real BIP39 generation, real backup-verification quiz) — reads
 * the generated words and quiz challenges from the DOM and answers correctly,
 * exactly like a real user would. Returns the 24-word mnemonic for tests that
 * need it (e.g. to later test import).
 */
export async function createWallet(page: Page, password: string): Promise<string[]> {
  await page.getByRole('button', { name: 'Create a new wallet' }).click();

  await page.getByPlaceholder('At least 8 characters').fill(password);
  await page.getByPlaceholder('Re-enter your password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Tap to reveal/ }).click();
  const wordEls = page.locator('.grid > div span.font-medium');
  await expect(wordEls).toHaveCount(24);
  const words = await wordEls.allTextContents();

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Verify-backup quiz: 3 challenges, each asking for the word at a given
  // (1-indexed) position from a set of 3 options.
  const challenges = page.locator('.space-y-5 > div');
  await expect(challenges).toHaveCount(3);
  for (const challenge of await challenges.all()) {
    const label = await challenge.locator('p').textContent();
    const position = parseInt((label ?? '').replace(/\D/g, ''), 10);
    const correctWord = words[position - 1];
    await challenge.getByRole('button', { name: correctWord, exact: true }).click();
  }

  await page.getByRole('button', { name: 'Create wallet' }).click();
  await expect(page.getByText('TOTAL BALANCE')).toBeVisible({ timeout: 15_000 });

  return words;
}

/** Unlocks an existing vault with the given password via the real unlock form. */
export async function unlockWallet(page: Page, password: string): Promise<void> {
  await page.getByPlaceholder('Your device password').fill(password);
  await page.getByRole('button', { name: 'Unlock' }).click();
}
