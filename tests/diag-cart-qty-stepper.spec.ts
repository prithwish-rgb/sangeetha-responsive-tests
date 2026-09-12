import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const CART_URL = 'https://smpl-new.bangalore2.com/cart';
const PRODUCT_1_URL = 'https://smpl-new.bangalore2.com/product-details/myed3hn-a/17871'; // Apple iPhone 16 128GB Teal
const PRODUCT_2_URL = 'https://smpl-new.bangalore2.com/product-details/product/19250';  // Nothing Phone (3) 12GB 256GB Black
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

interface ItemRowInspection {
  productTitle: string;
  itemCardHtml: string;
  hasPlusButton: boolean;
  hasMinusButton: boolean;
  hasNumberInput: boolean;
  allButtonsOnItemRow: Array<{
    text: string;
    ariaLabel: string;
    className: string;
    isVisible: boolean;
    isEnabled: boolean;
  }>;
  quantityValueBefore: string | null;
  quantityValueAfterPlus: string | null;
  quantityValueAfterMinus: string | null;
  quantityValueAfterSecondMinus: string | null;
  actionabilityPlus: { visible: boolean; enabled: boolean; clickable: boolean; error?: string };
  actionabilityMinus: { visible: boolean; enabled: boolean; clickable: boolean; error?: string };
  observation: string;
}

async function inspectCartItemRow(page: Page, productLabel: string): Promise<ItemRowInspection> {
  console.log(`\n================ INSPECTING CART FOR [${productLabel}] ================`);
  
  // Wait for loading spinner to dismiss
  await page.locator('text=Please Wait').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // Detailed DOM query specifically on the cart items container
  const inspectionData = await page.evaluate(() => {
    // Look for cart item container
    const allElements = Array.from(document.querySelectorAll<HTMLElement>('*'));
    
    // Find buttons first, then find their closest container
    const removeBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => /remove/i.test((b.innerText || '').trim()));
    const saveLaterBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => /save for later/i.test((b.innerText || '').trim()));

    let mainCard: HTMLElement | null = null;
    if (removeBtn) {
      mainCard = removeBtn.closest('div.border, div.rounded, div[class*="border"], div[class*="rounded"], div[class*="card"], div[class*="item"]') as HTMLElement
        || removeBtn.parentElement?.parentElement as HTMLElement;
    } else if (saveLaterBtn) {
      mainCard = saveLaterBtn.closest('div.border, div.rounded, div[class*="border"], div[class*="rounded"], div[class*="card"], div[class*="item"]') as HTMLElement
        || saveLaterBtn.parentElement?.parentElement as HTMLElement;
    }

    // Also look for class-based item containers
    if (!mainCard) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(
        '[class*="cart-item"], [class*="cartItem"], [class*="cart_item"], [class*="CartItem"], [class*="productCard"]'
      )).filter(el => el.innerText && el.innerText.includes('₹') && el.offsetParent !== null);
      if (candidates.length > 0) mainCard = candidates[0];
    }

    const cardText = mainCard ? mainCard.innerText : document.body.innerText;
    const cardHtml = mainCard ? mainCard.outerHTML.slice(0, 2000) : 'CARD_NOT_ISOLATED';

    // Buttons on the item card (or all buttons in the My Cart section)
    const searchScope = mainCard || document.querySelector('body')!;
    const buttons = Array.from(searchScope.querySelectorAll<HTMLButtonElement>('button'))
      .filter(b => b.offsetParent !== null)
      .map(b => ({
        text: (b.innerText || '').trim(),
        ariaLabel: b.getAttribute('aria-label') || '',
        className: b.className || '',
        isVisible: b.offsetParent !== null,
        isEnabled: !b.disabled,
      }));

    // Find any stepper / quantity elements
    const plusBtn = Array.from(searchScope.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => /^(\+|\+1|plus|inc|increase)$/i.test((b.innerText || '').trim()) || /increase|plus/i.test(b.getAttribute('aria-label') || ''));

    const minusBtn = Array.from(searchScope.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => /^(\-|\−|\-1|minus|dec|decrease)$/i.test((b.innerText || '').trim()) || /decrease|minus/i.test(b.getAttribute('aria-label') || ''));

    const numberInput = searchScope.querySelector<HTMLInputElement>('input[type="number"], input[name*="qty"], input[name*="quantity"]');

    // Look for quantity badge/text near plus/minus or "Qty:"
    const qtyTextMatch = cardText.match(/qty[:\s]*(\d+)|quantity[:\s]*(\d+)|(\d+)\s*(?:item|nos|qty)/i);
    const qtyValue = numberInput ? numberInput.value : (qtyTextMatch ? (qtyTextMatch[1] || qtyTextMatch[2] || qtyTextMatch[3]) : null);

    return {
      cardText,
      cardHtml,
      buttons,
      hasPlus: !!plusBtn,
      plusSelector: plusBtn ? (plusBtn.id ? `#${plusBtn.id}` : plusBtn.className ? `button.${plusBtn.className.split(' ').join('.')}` : 'button') : null,
      hasMinus: !!minusBtn,
      minusSelector: minusBtn ? (minusBtn.id ? `#${minusBtn.id}` : minusBtn.className ? `button.${minusBtn.className.split(' ').join('.')}` : 'button') : null,
      hasNumberInput: !!numberInput,
      numberInputValue: numberInput ? numberInput.value : null,
      qtyValue,
    };
  });

  console.log(`[Inspection] Item Card isolated: ${inspectionData.cardHtml !== 'CARD_NOT_ISOLATED'}`);
  console.log(`[Inspection] Card Text Snippet:\n${inspectionData.cardText.slice(0, 300)}`);
  console.log(`[Inspection] Buttons on Item card:`, JSON.stringify(inspectionData.buttons));
  console.log(`[Inspection] Has Plus Button: ${inspectionData.hasPlus}, Has Minus Button: ${inspectionData.hasMinus}, Has Number Input: ${inspectionData.hasNumberInput}`);
  console.log(`[Inspection] Initial detected Quantity Value: ${inspectionData.qtyValue}`);

  const result: ItemRowInspection = {
    productTitle: productLabel,
    itemCardHtml: inspectionData.cardHtml,
    hasPlusButton: inspectionData.hasPlus,
    hasMinusButton: inspectionData.hasMinus,
    hasNumberInput: inspectionData.hasNumberInput,
    allButtonsOnItemRow: inspectionData.buttons,
    quantityValueBefore: inspectionData.qtyValue,
    quantityValueAfterPlus: null,
    quantityValueAfterMinus: null,
    quantityValueAfterSecondMinus: null,
    actionabilityPlus: { visible: false, enabled: false, clickable: false },
    actionabilityMinus: { visible: false, enabled: false, clickable: false },
    observation: '',
  };

  // Check actionability if plus button exists
  if (inspectionData.hasPlus) {
    const plusLocator = page.locator('button').filter({ hasText: /^(\+|\+1|plus)$/i }).first();
    const isVis = await plusLocator.isVisible().catch(() => false);
    const isEn = await plusLocator.isEnabled().catch(() => false);
    let clickable = false;
    let clickError: string | undefined;

    if (isVis && isEn) {
      try {
        console.log(`[Stepper Action] Tapping + button (natural click)...`);
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
          plusLocator.click({ timeout: 5000 }),
        ]);
        clickable = true;
        await page.waitForTimeout(2000);

        // Read quantity after +
        const afterPlusQty = await page.evaluate(() => {
          const input = document.querySelector<HTMLInputElement>('input[type="number"]');
          if (input) return input.value;
          const text = document.body.innerText;
          const m = text.match(/qty[:\s]*(\d+)|quantity[:\s]*(\d+)/i);
          return m ? (m[1] || m[2]) : null;
        });
        result.quantityValueAfterPlus = afterPlusQty;
        console.log(`[Stepper Action] Quantity after + tap: ${afterPlusQty}`);
      } catch (err: any) {
        clickError = err.message;
        console.log(`[Stepper Action] + Click failed: ${err.message}`);
      }
    }
    result.actionabilityPlus = { visible: isVis, enabled: isEn, clickable, error: clickError };
  }

  // Check actionability if minus button exists
  if (inspectionData.hasMinus) {
    const minusLocator = page.locator('button').filter({ hasText: /^(\-|\−|\-1|minus)$/i }).first();
    const isVis = await minusLocator.isVisible().catch(() => false);
    const isEn = await minusLocator.isEnabled().catch(() => false);
    let clickable = false;
    let clickError: string | undefined;

    if (isVis && isEn) {
      try {
        console.log(`[Stepper Action] Tapping - button (natural click)...`);
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
          minusLocator.click({ timeout: 5000 }),
        ]);
        clickable = true;
        await page.waitForTimeout(2000);

        // Read quantity after -
        const afterMinusQty = await page.evaluate(() => {
          const input = document.querySelector<HTMLInputElement>('input[type="number"]');
          if (input) return input.value;
          const text = document.body.innerText;
          const m = text.match(/qty[:\s]*(\d+)|quantity[:\s]*(\d+)/i);
          return m ? (m[1] || m[2]) : null;
        });
        result.quantityValueAfterMinus = afterMinusQty;
        console.log(`[Stepper Action] Quantity after - tap: ${afterMinusQty}`);

        // Tap minus second time from 1
        console.log(`[Stepper Action] Tapping - button second time (from qty 1)...`);
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
          minusLocator.click({ timeout: 5000 }).catch(() => {}),
        ]);
        await page.waitForTimeout(2000);

        const afterSecondMinus = await page.evaluate(() => {
          const text = document.body.innerText;
          const input = document.querySelector<HTMLInputElement>('input[type="number"]');
          return {
            isEmpty: /your cart is empty|my cart\s*\(\s*0\s*\)/i.test(text),
            qtyVal: input ? input.value : null,
            textSnippet: text.slice(0, 200),
          };
        });
        result.quantityValueAfterSecondMinus = afterSecondMinus.isEmpty ? 'ITEM_REMOVED (Cart is 0)' : afterSecondMinus.qtyVal;
        console.log(`[Stepper Action] State after second - tap:`, JSON.stringify(afterSecondMinus));
      } catch (err: any) {
        clickError = err.message;
        console.log(`[Stepper Action] - Click failed: ${err.message}`);
      }
    }
    result.actionabilityMinus = { visible: isVis, enabled: isEn, clickable, error: clickError };
  }

  if (!inspectionData.hasPlus && !inspectionData.hasMinus && !inspectionData.hasNumberInput) {
    result.observation = 'GENUINELY_ABSENT: No +/- stepper buttons or quantity inputs exist on the cart item row. Item card uses single-item model with direct [Remove] and [Save for later] actions.';
  } else if (result.actionabilityPlus.clickable && result.quantityValueBefore !== result.quantityValueAfterPlus) {
    result.observation = `FUNCTIONALLY_WORKING: Stepper changed quantity from ${result.quantityValueBefore} to ${result.quantityValueAfterPlus}.`;
  } else if (inspectionData.hasPlus && !result.actionabilityPlus.clickable) {
    result.observation = 'PRESENT_BUT_INERT_OR_UNCLICKABLE: Buttons rendered in DOM but actionability/click failed.';
  } else {
    result.observation = 'EVALUATED: See detailed attributes.';
  }

  return result;
}

test.describe('Targeted Diagnostic: Cart Quantity Stepper Audit (Pixel 5 Mobile)', () => {
  test.setTimeout(240000);

  test('Diagnostic: Exact Stepper Presence, Actionability & State-Change Verification', async ({ page }) => {
    fs.mkdirSync('screenshots/mod5-diag', { recursive: true });
    fs.mkdirSync('reports', { recursive: true });

    // ──────────────────────────────────────────────────────────────────────────
    // PRODUCT 1 AUDIT
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n>>> STEP 1: Add Product 1 (${PRODUCT_1_URL}) to Cart...`);
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(PRODUCT_1_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);

    const atc1 = page.locator('button').filter({ hasText: /^Add to Cart$/i }).first();
    await atc1.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await atc1.isVisible()) {
      await atc1.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'screenshots/mod5-diag/01-prod1-pdp.png' });

    console.log(`>>> STEP 2: Navigate to /cart and inspect Product 1...`);
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/mod5-diag/02-prod1-cart.png', fullPage: true });

    const prod1Report = await inspectCartItemRow(page, 'Product 1: Apple iPhone 16 Teal');

    // ──────────────────────────────────────────────────────────────────────────
    // PRODUCT 2 AUDIT (Different SKU / Brand)
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n>>> STEP 3: Add Product 2 (${PRODUCT_2_URL}) to Cart...`);
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(PRODUCT_2_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);

    const atc2 = page.locator('button').filter({ hasText: /^Add to Cart$/i }).first();
    await atc2.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await atc2.isVisible()) {
      await atc2.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'screenshots/mod5-diag/03-prod2-pdp.png' });

    console.log(`>>> STEP 4: Navigate to /cart and inspect Product 2...`);
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/mod5-diag/04-prod2-cart.png', fullPage: true });

    const prod2Report = await inspectCartItemRow(page, 'Product 2: Nothing Phone (3) Black');

    // ──────────────────────────────────────────────────────────────────────────
    // COMPILE AND SAVE DIAGNOSTIC REPORT
    // ──────────────────────────────────────────────────────────────────────────
    const fullDiagnostic = {
      timestamp: new Date().toISOString(),
      viewport: 'Mobile Pixel 5 (393x851)',
      pincode: PINCODE,
      environment: 'Staging (smpl-new.bangalore2.com)',
      authMode: 'Authenticated (auth-staging-fresh.json)',
      productsTested: [prod1Report, prod2Report],
      finalConclusion: (prod1Report.hasPlusButton || prod2Report.hasPlusButton)
        ? (prod1Report.actionabilityPlus.clickable ? 'FUNCTIONALLY_WORKING' : 'PRESENT_BUT_INERT')
        : 'GENUINELY_ABSENT',
    };

    fs.writeFileSync('reports/cart-qty-stepper-diagnostic.json', JSON.stringify(fullDiagnostic, null, 2));

    console.log('\n\n================ FINAL DIAGNOSTIC SUMMARY ================');
    console.log(`Product 1 Result: ${prod1Report.observation}`);
    console.log(`Product 2 Result: ${prod2Report.observation}`);
    console.log(`Final Stepper Conclusion: [${fullDiagnostic.finalConclusion}]`);
    console.log('Saved report to reports/cart-qty-stepper-diagnostic.json');
  });
});
