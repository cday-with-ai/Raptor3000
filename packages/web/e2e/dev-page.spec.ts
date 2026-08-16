import { test, expect } from '@playwright/test';

/**
 * The dev-page smoke (Carson, 2026-08-13: "add possible e2e test for
 * the dev page working"). No FICS, no popups — just: the server serves,
 * the app boots, the landing renders its load-bearing parts. This is
 * the spec the nightly room can run against a local `yarn dev` without
 * touching the network beyond localhost.
 */

test('the dev page serves the space landing', async ({ page }) => {
  await page.goto('/');

  // The app booted (not a blank bundle-error page).
  await expect(page).toHaveTitle('Raptor3000');
  await expect(page.getByText('Raptor3000').first()).toBeVisible();
  await expect(page.getByText('Sign in to FICS')).toBeVisible();

  // The login form's essentials.
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await expect(page.getByLabel('Guest login')).toBeVisible();

  // The raptor is on duty (icon asset resolves).
  const icon = page.locator('img[src="/raptor3000.png"]').first();
  await expect(icon).toBeVisible();
  const iconOk = await page.evaluate(async () => {
    const r = await fetch('/raptor3000.png');
    return r.ok;
  });
  expect(iconOk).toBe(true);

  // No uncaught errors during boot.
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});
