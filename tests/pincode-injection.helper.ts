import { Page, BrowserContext } from '@playwright/test';

/**
 * Injects a working delivery pincode directly into localStorage
 * BEFORE any page script runs, using addInitScript.
 */
export async function setPincodeViaLocalStorage(
  page: Page,
  pincode: string = '560078',
  locationLabel: string = 'Bengaluru'
): Promise<void> {
  await page.addInitScript(
    ({ pincode, locationLabel }) => {
      window.localStorage.setItem(
        'setDefault',
        JSON.stringify({
          pincode: pincode,
          location: locationLabel,
          setmanual: 1,
        })
      );
      window.localStorage.setItem('setDefaultPincode', '1');
      window.localStorage.setItem(
        'setDefaultLatLng',
        JSON.stringify({ lat: '12.898773', lng: '77.576408' })
      );
    },
    { pincode, locationLabel }
  );
}

/**
 * Verifies the pincode was actually picked up by the app after navigation,
 * by reading back localStorage AND checking the visible pincode button in
 * the header (e.g. "560078" next to the delivery ETA).
 */
export async function verifyPincodeApplied(
  page: Page,
  expectedPincode: string
): Promise<{ localStorageOk: boolean; uiOk: boolean }> {
  const storedValue = await page.evaluate(() => {
    const raw = window.localStorage.getItem('setDefault');
    if (!raw) return null;
    try {
      return JSON.parse(raw).pincode ?? null;
    } catch {
      return null;
    }
  });

  const localStorageOk = storedValue === expectedPincode;

  const uiOk = await page
    .getByText(expectedPincode, { exact: false })
    .first()
    .isVisible()
    .catch(() => false);

  return { localStorageOk, uiOk };
}

/**
 * Apply the pincode at the BrowserContext level so it's
 * automatically present for every page opened in that context.
 */
export async function setPincodeForContext(
  context: BrowserContext,
  pincode: string = '560078',
  locationLabel: string = 'Bengaluru'
): Promise<void> {
  await context.addInitScript(
    ({ pincode, locationLabel }) => {
      window.localStorage.setItem(
        'setDefault',
        JSON.stringify({
          pincode: pincode,
          location: locationLabel,
          setmanual: 1,
        })
      );
      window.localStorage.setItem('setDefaultPincode', '1');
      window.localStorage.setItem(
        'setDefaultLatLng',
        JSON.stringify({ lat: '12.898773', lng: '77.576408' })
      );
    },
    { pincode, locationLabel }
  );
}
