import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loaded - updated for Orderly branding
    await expect(page).toHaveTitle(/Orderly/i);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Check that login form elements exist
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('sign up page is accessible', async ({ page }) => {
    await page.goto('/auth/sign-up');
    
    // Check that sign up form elements exist
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    // Sign up has both password and repeat-password fields, check for the first one
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Look for any navigation links
    const navLinks = page.locator('nav a, header a');
    const linkCount = await navLinks.count();
    
    // Should have at least one navigation link
    expect(linkCount).toBeGreaterThan(0);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors (like third-party scripts)
    const criticalErrors = errors.filter(
      (error) => !error.includes('third-party') && !error.includes('analytics')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
