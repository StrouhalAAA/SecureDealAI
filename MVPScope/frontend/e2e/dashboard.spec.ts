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
    await expect(page.getByRole('heading', { name: /Prehled prilezitosti/i })).toBeVisible();

    // Should show a table or list of opportunities
    const opportunitiesList = page.locator('[data-testid="opportunities-list"], table, .opportunity-card');
    await expect(opportunitiesList.first()).toBeVisible();
  });

  test('has create new opportunity button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /Nova prilezitost|Pridat|Vytvorit/i });
    await expect(createButton).toBeVisible();
  });

  test('can open create opportunity modal', async ({ page }) => {
    // Click create button
    const createButton = page.getByRole('button', { name: /Nova prilezitost|Pridat|Vytvorit/i });
    await createButton.click();

    // Modal should appear
    const modal = page.locator('[data-testid="create-modal"], .modal, [role="dialog"]');
    await expect(modal).toBeVisible();

    // Modal should have SPZ input
    const spzInput = page.getByPlaceholder(/SPZ|spz/i);
    await expect(spzInput).toBeVisible();
  });

  test('can create new buying opportunity', async ({ page }) => {
    // Open modal
    const createButton = page.getByRole('button', { name: /Nova prilezitost|Pridat|Vytvorit/i });
    await createButton.click();

    // Enter SPZ
    const spzInput = page.getByPlaceholder(/SPZ|spz/i);
    await spzInput.fill(TEST_SPZ);

    // Submit
    const submitButton = page.getByRole('button', { name: /Vytvorit|Ulozit|OK/i });
    await submitButton.click();

    // Should navigate to detail page or show success
    await expect(page).toHaveURL(/\/detail\/|created|success/i, { timeout: 5000 });
  });

  test('shows validation error for empty SPZ', async ({ page }) => {
    // Open modal
    const createButton = page.getByRole('button', { name: /Nova prilezitost|Pridat|Vytvorit/i });
    await createButton.click();

    // Try to submit without SPZ
    const submitButton = page.getByRole('button', { name: /Vytvorit|Ulozit|OK/i });
    await submitButton.click();

    // Should show error or stay on modal
    const errorMessage = page.locator('.error, .text-red, [role="alert"]');
    await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
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
    await page.waitForSelector('[data-testid="opportunities-list"] tr, .opportunity-card, table tbody tr');

    // Click on first opportunity
    const firstRow = page.locator('[data-testid="opportunities-list"] tr, .opportunity-card, table tbody tr').first();
    await firstRow.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/detail\//);
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
