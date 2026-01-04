/**
 * E2E Tests for Dashboard Component
 *
 * Tests the main dashboard functionality including:
 * - Listing buying opportunities
 * - Creating new opportunities
 * - Search and filtering
 * - Navigation
 */

import { test, expect } from '@playwright/test';

// Test data
const TEST_SPZ = `E2E${Date.now().toString().slice(-6)}`;

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/SecureDealAI/);
  });

  test('displays list of buying opportunities', async ({ page }) => {
    // Wait for the dashboard to load
    await expect(page.getByRole('heading', { name: /SecureDealAI/i })).toBeVisible();

    // Should show a table or list of opportunities
    const opportunitiesList = page.locator('[data-testid="opportunities-list"], table, .opportunity-card');
    await expect(opportunitiesList.first()).toBeVisible();
  });

  test('has create new opportunity button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /Nová příležitost|Nova prilezitost/i });
    await expect(createButton).toBeVisible();
  });

  test('can open create opportunity modal', async ({ page }) => {
    // Click create button
    const createButton = page.getByRole('button', { name: /Nová příležitost|Nova prilezitost/i });
    await createButton.click();

    // Modal should appear with heading
    const modalHeading = page.getByRole('heading', { name: /Nová nákupní příležitost/i });
    await expect(modalHeading).toBeVisible();

    // Modal should have SPZ input (use exact placeholder to avoid matching search input)
    const spzInput = page.getByPlaceholder('např. 5L94454');
    await expect(spzInput).toBeVisible();
  });

  test('can create new buying opportunity', async ({ page }) => {
    // Open modal
    const createButton = page.getByRole('button', { name: /Nová příležitost|Nova prilezitost/i });
    await createButton.click();

    // Wait for modal
    await expect(page.getByRole('heading', { name: /Nová nákupní příležitost/i })).toBeVisible();

    // Enter SPZ
    const spzInput = page.getByPlaceholder(/5L94454/i);
    await spzInput.fill(TEST_SPZ);

    // Submit
    const submitButton = page.getByRole('button', { name: /Vytvořit/i });
    await submitButton.click();

    // Should navigate to opportunity detail page
    await expect(page).toHaveURL(/\/opportunity\//, { timeout: 5000 });
  });

  test('shows validation error for empty SPZ', async ({ page }) => {
    // Open modal
    const createButton = page.getByRole('button', { name: /Nová příležitost|Nova prilezitost/i });
    await createButton.click();

    // Wait for modal
    await expect(page.getByRole('heading', { name: /Nová nákupní příležitost/i })).toBeVisible();

    // Try to submit without SPZ
    const submitButton = page.getByRole('button', { name: /Vytvořit/i });
    await submitButton.click();

    // Should show error or stay on modal (modal should still be visible)
    await expect(page.getByRole('heading', { name: /Nová nákupní příležitost/i })).toBeVisible({ timeout: 3000 });
  });

  test('can search by SPZ', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/Hledat|Vyhledat|SPZ/i);

    if (await searchInput.isVisible()) {
      // Enter search term
      await searchInput.fill('5L9');

      // Results should filter (wait for debounce)
      await page.waitForTimeout(500);

      // Check that the page content has changed or shows filtered results
      // This is a basic check - actual implementation may vary
      await expect(page.locator('body')).toContainText(/5L9|Nenalezeno|0 vysledku/);
    }
  });

  test('can navigate to detail page', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('table tbody tr');

    // Click the "Otevřít" button on the first opportunity
    const openButton = page.getByRole('button', { name: /Otevřít|Otevrit/i }).first();
    await openButton.click();

    // Should navigate to opportunity detail page
    await expect(page).toHaveURL(/\/opportunity\//);
  });

  test('displays status badges correctly', async ({ page }) => {
    // Wait for opportunities to load
    await page.waitForTimeout(1000);

    // Check for status badges
    const statusBadges = page.locator('.status-badge, .badge, [data-status]');

    if (await statusBadges.count() > 0) {
      // At least one status badge should be visible
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('pagination works if present', async ({ page }) => {
    // Wait for list to load
    await page.waitForTimeout(1000);

    // Check if pagination exists
    const pagination = page.locator('.pagination, [data-testid="pagination"], nav[aria-label="pagination"]');

    if (await pagination.isVisible()) {
      // Find next page button
      const nextButton = page.getByRole('button', { name: /Dalsi|Next|>/i });

      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        // Page should update
        await expect(page.url()).toMatch(/page=2|offset=/);
      }
    }
  });
});
