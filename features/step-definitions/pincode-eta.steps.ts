import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import {
  navigateToSangeethaHome,
  handleCookiePromptIfPresent,
  openLocationFlowAndTypeManually,
  enterPincode,
  clickCheckAndTriggerETA,
} from '../../tests/helpers/pincode-flow.helper';

Given('I am on the Sangeetha website', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await navigateToSangeethaHome(this.page);
  await handleCookiePromptIfPresent(this.page);
});

When('I enter the pincode {string}', async function (this: CustomWorld, pincode: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await openLocationFlowAndTypeManually(this.page);
  await enterPincode(this.page, pincode);
  this.pincodeEntered = pincode;
});

When('I check the delivery ETA', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  this.etaResponse = await clickCheckAndTriggerETA(this.page);
});

Then('the delivery ETA should be {string}', async function (this: CustomWorld, expectedEta: string) {
  if (!this.etaResponse) {
    throw new Error('No ETA response received from Sangeetha API');
  }

  // Verify response status and data
  expect(this.etaResponse.status).toBe(200);
  expect(this.etaResponse.body.http_code).toBe(200);
  expect(this.etaResponse.body.data).toBeDefined();
  expect(this.etaResponse.body.data.header_eta).toBe(expectedEta);
  console.log(`[Cucumber] Verified delivery ETA is "${expectedEta}" (Status: ${this.etaResponse.status})`);
});
