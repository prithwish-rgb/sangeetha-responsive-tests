import { Page } from '@playwright/test';

// CONFIRMED against a live modal captured after clicking a checkout "proceed"
// action on an account with an existing saved address:
//   <div class="modal show add_ddr__new" ...>
//     <h2>Saved Address</h2>
//     <input name="addressSelection" type="radio" ... />
//     <button class="btn-custom-outline">Add New Address</button>
//     <button class="btn-dark-custom" disabled>Select and Proceed</button>
//   </div>
// "Select and Proceed" is disabled by default — it only becomes clickable
// once an addressSelection radio is checked. A test that clicks proceed
// without selecting a radio first will silently no-op here: that is the
// leading suspect for the "POST /cart/update returns 200 but router never
// fires" Buy Now stall, since the earlier version of this suite only knew
// about the "no saved address" panel below, not this one.

const SAVED_ADDRESS_MODAL = '.modal.show.add_ddr__new, .modal.show:has-text("Saved Address")';
const ADDRESS_RADIO = 'input[name="addressSelection"]';
const SELECT_AND_PROCEED_BTN = 'button:has-text("Select and Proceed")';
const ADD_NEW_ADDRESS_BTN = 'button:has-text("Add New Address")';

export interface AddressStepResult {
    modalHandled: 'saved-address' | 'add-new-address' | 'none';
    navigated: boolean;
    errorMessage?: string;
}

/**
 * Handles the "Saved Address" modal: selects the first available saved
 * address radio, then clicks "Select and Proceed" once it becomes enabled.
 * Returns false (without throwing) if the modal never appeared, so callers
 * can fall through to other address-step handling.
 */
export async function handleSavedAddressModalIfPresent(page: Page, timeoutMs = 8000): Promise<boolean> {
    const modal = page.locator(SAVED_ADDRESS_MODAL).first();
    const visible = await modal.isVisible({ timeout: timeoutMs }).catch(() => false);
    console.log(`[address-step] "Saved Address" modal visible: ${visible}`);
    if (!visible) return false;

    const radio = modal.locator(ADDRESS_RADIO).first();
    const radioVisible = await radio.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`[address-step] address radio visible: ${radioVisible}`);

    if (radioVisible) {
        const alreadyChecked = await radio.isChecked().catch(() => false);
        if (!alreadyChecked) {
            await radio.check({ timeout: 3000 }).catch((e) => {
                console.log(`[address-step] radio.check() failed: ${e.message}`);
            });
        }
    }

    const proceedBtn = modal.locator(SELECT_AND_PROCEED_BTN).first();
    const proceedVisible = await proceedBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!proceedVisible) {
        console.log('[address-step] "Select and Proceed" button not found in modal.');
        return false;
    }

    // Give the disabled -> enabled transition a moment to happen after the radio check
    await page.waitForTimeout(400);
    const enabled = await proceedBtn.isEnabled().catch(() => false);
    console.log(`[address-step] "Select and Proceed" enabled after selecting address: ${enabled}`);

    if (!enabled) {
        console.log('[address-step] Proceed button still disabled after selecting an address radio — not clicking a disabled control.');
        return false;
    }

    await proceedBtn.click().catch((e) => {
        console.log(`[address-step] click on "Select and Proceed" failed: ${e.message}`);
    });
    await page.waitForTimeout(1200);
    return true;
}

/**
 * On an account with NO saved address, checkout opens an "Add New Address"
 * panel instead. Fills House No / Building Name (the two fields confirmed
 * required via inline validation) and submits. Best-effort — logs clearly
 * rather than silently no-op'ing if the panel layout doesn't match.
 */
export async function fillAddressFormIfPresent(page: Page): Promise<boolean> {
    const panel = page.locator(`${ADD_NEW_ADDRESS_BTN}, *:has-text("Add New Address")`).first();
    const panelVisible = await panel.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[address-form] "Add New Address" panel/button visible: ${panelVisible}`);
    if (!panelVisible) return false;

    const houseNoByXpath = page.locator('xpath=//*[contains(text(), "House No")]/following::input[1]').first();
    const buildingNameByXpath = page.locator('xpath=//*[contains(text(), "Building Name")]/following::input[1]').first();

    const houseNoVisible = await houseNoByXpath.isVisible({ timeout: 2000 }).catch(() => false);
    if (houseNoVisible) await houseNoByXpath.fill('89');

    const buildingNameVisible = await buildingNameByXpath.isVisible({ timeout: 2000 }).catch(() => false);
    if (buildingNameVisible) await buildingNameByXpath.fill('Test Building');

    if (!houseNoVisible && !buildingNameVisible) {
        console.log('[address-form] Neither known required field was found — not attempting submit.');
        return false;
    }

    await page.mouse.wheel(0, 600).catch(() => { });
    await page.waitForTimeout(300);

    const submitBtn = page.locator(
        'button:has-text("Save Address"), button:has-text("Save address"), button:has-text("Continue"), ' +
        'button:has-text("Submit"), button:has-text("Add Address"), button:has-text("Use this address"), ' +
        'button:has-text("Confirm Address"), button[type="submit"]'
    ).first();
    const submitVisible = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (submitVisible) {
        await submitBtn.click().catch((e) => console.log(`[address-form] submit click failed: ${e.message}`));
        await page.waitForTimeout(1500);
        return true;
    }

    console.log('[address-form] Filled available fields but found no submit button candidate.');
    return false;
}

/**
 * Single entry point for the checkout address step. Tries the saved-address
 * modal first (the common case on this suite's reused, logged-in account),
 * falls back to the add-new-address panel if no saved address exists.
 */
export async function resolveAddressStep(page: Page): Promise<AddressStepResult> {
    const startUrl = page.url();

    const savedAddressHandled = await handleSavedAddressModalIfPresent(page);
    if (savedAddressHandled) {
        const navigated = page.url() !== startUrl;
        return { modalHandled: 'saved-address', navigated };
    }

    const addNewHandled = await fillAddressFormIfPresent(page);
    if (addNewHandled) {
        const navigated = page.url() !== startUrl;
        return { modalHandled: 'add-new-address', navigated };
    }

    return { modalHandled: 'none', navigated: false, errorMessage: 'Neither the Saved Address modal nor the Add New Address panel was found.' };
}