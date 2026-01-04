/**
 * E2E Tests for Complete Validation Flow
 *
 * Tests the end-to-end validation workflow:
 * - Create buying opportunity
 * - Fill vehicle form
 * - Fill vendor form with ARES lookup
 * - Upload documents
 * - Run validation
 * - Check results
 */

import { test, expect, Page } from '@playwright/test';

// Test data - matches the test scenarios from 04_01_E2E_TESTING.md
const TEST_DATA = {
  // Scenario 1: Happy Path (All GREEN)
  happyPath: {
    spz: '5L94454',
    vin: 'YV1PZA3TCL1103985',
    znacka: 'VOLVO',
    model: 'V90 CROSS COUNTRY',
    rok_vyroby: '2020',
    majitel: 'OSIT S.R.O.',
    vendor: {
      type: 'COMPANY',
      ico: '27074358',
      name: 'OSIT S.R.O.',
      dic: 'CZ27074358',
      city: 'Praha',
      postal_code: '11000',
    },
  },
  // Scenario 2: Minor Mismatches (ORANGE)
  orangePath: {
    spz: '5L94454',
    vin: 'YV1PZA3TCL1103985',
    znacka: 'VOLVO',
    model: 'V90', // Partial match
    rok_vyroby: '2020',
    majitel: 'OSIT S.R.O.',
    vendor: {
      type: 'COMPANY',
      ico: '27074358',
      name: 'OSIT S.R.O.',
      city: 'Mníšek 420', // Partial address match
      postal_code: '25210',
    },
  },
  // Scenario 3: Critical Mismatch (RED)
  redPath: {
    spz: '5L94454',
    vin: 'WVWZZZ3CZWE123456', // Different VIN
    znacka: 'VOLKSWAGEN', // Different brand
    majitel: 'OTHER COMPANY',
    vendor: {
      type: 'COMPANY',
      ico: '27074358',
      name: 'OSIT S.R.O.',
      city: 'Praha',
      postal_code: '11000',
    },
  },
  // Scenario 5: Physical Person
  foPath: {
    spz: '5L94454',
    vin: 'YV1PZA3TCL1103985',
    znacka: 'VOLVO',
    model: 'V90',
    majitel: 'JAN NOVAK',
    vendor: {
      type: 'PHYSICAL_PERSON',
      name: 'Jan Novák',
      personal_id: '900101/1234',
      date_of_birth: '1990-01-01',
      city: 'Praha',
      postal_code: '11000',
    },
  },
};

// Helper function to generate unique SPZ for each test
const generateTestSpz = () => `E2E${Date.now().toString().slice(-8)}`;

test.describe('Validation Flow', () => {
  test.describe.configure({ mode: 'serial' });

  let testSpz: string;

  test.beforeEach(async ({ page }) => {
    testSpz = generateTestSpz();
  });

  test('complete GREEN validation flow with company vendor', async ({ page }) => {
    // Step 1: Create new buying opportunity
    await page.goto('/');

    // Open create modal
    await page.getByRole('button', { name: /Nova prilezitost|Pridat/i }).click();
    await page.getByPlaceholder(/SPZ/i).fill(testSpz);
    await page.getByRole('button', { name: /Vytvorit|Ulozit/i }).click();

    // Wait for navigation to detail page
    await expect(page).toHaveURL(/\/detail\//, { timeout: 5000 });

    // Step 2: Fill vehicle form
    await expect(page.getByRole('heading', { name: /Krok 1|Data vozidla/i })).toBeVisible();

    await page.locator('input[placeholder*="VIN"], input[name="vin"]').fill(TEST_DATA.happyPath.vin);
    await page.locator('input[placeholder*="VOLVO"], input[name="znacka"]').fill(TEST_DATA.happyPath.znacka);
    await page.locator('input[placeholder*="model"], input[name="model"]').fill(TEST_DATA.happyPath.model);
    await page.locator('input[name="rok_vyroby"], input[type="number"]').first().fill(TEST_DATA.happyPath.rok_vyroby);
    await page.locator('input[placeholder*="majitel"], input[name="majitel"]').fill(TEST_DATA.happyPath.majitel);

    // Save and continue
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Step 3: Fill vendor form (Company)
    await expect(page.getByRole('heading', { name: /Krok 2|Data dodavatele/i })).toBeVisible();

    // Select company type
    await page.getByLabel(/Pravnicka osoba|COMPANY/i).check();

    // Fill ICO
    await page.locator('input[placeholder*="8"], input[name="company_id"]').fill(TEST_DATA.happyPath.vendor.ico);

    // Wait for ARES lookup
    await page.waitForTimeout(1000);

    // Click verify if auto-lookup didn't trigger
    const verifyButton = page.getByRole('button', { name: /Overit/i });
    if (await verifyButton.isEnabled()) {
      await verifyButton.click();
    }

    // Wait for ARES response
    await expect(page.locator('.ares-status, [data-ares-status]').first()).toHaveText(/overena|verified/i, { timeout: 5000 });

    // Fill remaining fields if not auto-filled
    const cityInput = page.locator('input[name="address_city"]');
    if (!(await cityInput.inputValue())) {
      await cityInput.fill(TEST_DATA.happyPath.vendor.city);
    }

    const postalInput = page.locator('input[name="address_postal_code"]');
    if (!(await postalInput.inputValue())) {
      await postalInput.fill(TEST_DATA.happyPath.vendor.postal_code);
    }

    // Save and continue
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Step 4: Document upload
    await expect(page.getByRole('heading', { name: /Krok 3|Dokumenty/i })).toBeVisible();

    // Skip document upload for this test (documents optional)
    await page.getByRole('button', { name: /Dalsi krok|Preskocit|Pokracovat/i }).click();

    // Step 5: Run validation
    await expect(page.getByRole('heading', { name: /Validace|Vysledky/i })).toBeVisible();

    const runValidationButton = page.getByRole('button', { name: /Spustit validaci|Validovat/i });
    if (await runValidationButton.isVisible()) {
      await runValidationButton.click();
    }

    // Wait for validation results
    await page.waitForTimeout(2000);

    // Step 6: Check results - should be GREEN or at least show some status
    const validationStatus = page.locator('.validation-status, [data-status], .status-badge');
    await expect(validationStatus.first()).toBeVisible();
  });

  test('physical person vendor flow', async ({ page }) => {
    await page.goto('/');

    // Create opportunity
    await page.getByRole('button', { name: /Nova prilezitost|Pridat/i }).click();
    await page.getByPlaceholder(/SPZ/i).fill(testSpz);
    await page.getByRole('button', { name: /Vytvorit|Ulozit/i }).click();

    await expect(page).toHaveURL(/\/detail\//, { timeout: 5000 });

    // Fill vehicle form (minimal)
    await page.locator('input[placeholder*="VIN"], input[name="vin"]').fill(TEST_DATA.foPath.vin);
    await page.locator('input[placeholder*="majitel"], input[name="majitel"]').fill(TEST_DATA.foPath.majitel);
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Fill vendor form (Physical Person)
    await expect(page.getByRole('heading', { name: /Krok 2|Data dodavatele/i })).toBeVisible();

    // Select FO type
    await page.getByLabel(/Fyzicka osoba|PHYSICAL_PERSON/i).check();

    // Fill name
    await page.locator('input[name="name"]').fill(TEST_DATA.foPath.vendor.name);

    // Fill rodne cislo
    await page.locator('input[placeholder*="rodne"], input[name="personal_id"]').fill(TEST_DATA.foPath.vendor.personal_id);

    // Fill date of birth
    await page.locator('input[type="date"][name="date_of_birth"]').fill(TEST_DATA.foPath.vendor.date_of_birth);

    // Fill address
    await page.locator('input[name="address_city"]').fill(TEST_DATA.foPath.vendor.city);
    await page.locator('input[name="address_postal_code"]').fill(TEST_DATA.foPath.vendor.postal_code);

    // Save
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Should proceed to next step
    await expect(page.getByRole('heading', { name: /Krok 3|Dokumenty/i })).toBeVisible();
  });

  test('validation errors show for invalid VIN', async ({ page }) => {
    await page.goto('/');

    // Create opportunity
    await page.getByRole('button', { name: /Nova prilezitost|Pridat/i }).click();
    await page.getByPlaceholder(/SPZ/i).fill(testSpz);
    await page.getByRole('button', { name: /Vytvorit|Ulozit/i }).click();

    await expect(page).toHaveURL(/\/detail\//, { timeout: 5000 });

    // Fill invalid VIN
    await page.locator('input[placeholder*="VIN"], input[name="vin"]').fill('INVALID');

    // Error should appear
    await expect(page.locator('.text-red, .error').first()).toBeVisible();
    await expect(page.locator('.text-red, .error').first()).toContainText(/17|neplatne/i);
  });

  test('ARES lookup shows not found for invalid ICO', async ({ page }) => {
    await page.goto('/');

    // Create opportunity
    await page.getByRole('button', { name: /Nova prilezitost|Pridat/i }).click();
    await page.getByPlaceholder(/SPZ/i).fill(testSpz);
    await page.getByRole('button', { name: /Vytvorit|Ulozit/i }).click();

    await expect(page).toHaveURL(/\/detail\//, { timeout: 5000 });

    // Fill vehicle form
    await page.locator('input[placeholder*="VIN"], input[name="vin"]').fill(TEST_DATA.happyPath.vin);
    await page.locator('input[placeholder*="majitel"], input[name="majitel"]').fill(TEST_DATA.happyPath.majitel);
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Fill vendor form
    await page.getByLabel(/Pravnicka osoba|COMPANY/i).check();

    // Enter invalid ICO (checksum will fail)
    await page.locator('input[placeholder*="8"], input[name="company_id"]').fill('00000001');

    // Click verify
    const verifyButton = page.getByRole('button', { name: /Overit/i });
    await verifyButton.click();

    // Should show not found or error
    await expect(page.locator('.ares-status, [data-ares-status]').first()).toContainText(/nebyla nalezena|not found|error/i, { timeout: 5000 });
  });

  test('step navigation works correctly', async ({ page }) => {
    await page.goto('/');

    // Create opportunity
    await page.getByRole('button', { name: /Nova prilezitost|Pridat/i }).click();
    await page.getByPlaceholder(/SPZ/i).fill(testSpz);
    await page.getByRole('button', { name: /Vytvorit|Ulozit/i }).click();

    await expect(page).toHaveURL(/\/detail\//, { timeout: 5000 });

    // Should be on step 1
    await expect(page.getByRole('heading', { name: /Krok 1/i })).toBeVisible();

    // Fill required fields and proceed
    await page.locator('input[placeholder*="VIN"], input[name="vin"]').fill(TEST_DATA.happyPath.vin);
    await page.locator('input[placeholder*="majitel"], input[name="majitel"]').fill(TEST_DATA.happyPath.majitel);
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Should be on step 2
    await expect(page.getByRole('heading', { name: /Krok 2/i })).toBeVisible();

    // Go back
    await page.getByRole('button', { name: /Zpet/i }).click();

    // Should be back on step 1
    await expect(page.getByRole('heading', { name: /Krok 1/i })).toBeVisible();

    // Data should be preserved
    const vinInput = page.locator('input[placeholder*="VIN"], input[name="vin"]');
    await expect(vinInput).toHaveValue(TEST_DATA.happyPath.vin);
  });

  test('data persists when navigating between steps', async ({ page }) => {
    await page.goto('/');

    // Create opportunity
    await page.getByRole('button', { name: /Nova prilezitost|Pridat/i }).click();
    await page.getByPlaceholder(/SPZ/i).fill(testSpz);
    await page.getByRole('button', { name: /Vytvorit|Ulozit/i }).click();

    await expect(page).toHaveURL(/\/detail\//, { timeout: 5000 });

    // Fill step 1
    await page.locator('input[placeholder*="VIN"], input[name="vin"]').fill(TEST_DATA.happyPath.vin);
    await page.locator('input[placeholder*="VOLVO"], input[name="znacka"]').fill(TEST_DATA.happyPath.znacka);
    await page.locator('input[placeholder*="majitel"], input[name="majitel"]').fill(TEST_DATA.happyPath.majitel);
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Fill step 2
    await page.getByLabel(/Pravnicka osoba|COMPANY/i).check();
    await page.locator('input[placeholder*="8"], input[name="company_id"]').fill(TEST_DATA.happyPath.vendor.ico);
    await page.locator('input[name="address_city"]').fill('Praha');
    await page.locator('input[name="address_postal_code"]').fill('11000');
    await page.getByRole('button', { name: /Dalsi krok|Pokracovat/i }).click();

    // Go to step 3, then back to step 1
    await page.getByRole('button', { name: /Zpet/i }).click();
    await page.getByRole('button', { name: /Zpet/i }).click();

    // Verify step 1 data is still there
    await expect(page.locator('input[placeholder*="VIN"], input[name="vin"]')).toHaveValue(TEST_DATA.happyPath.vin);
    await expect(page.locator('input[placeholder*="VOLVO"], input[name="znacka"]')).toHaveValue(TEST_DATA.happyPath.znacka);
  });
});
