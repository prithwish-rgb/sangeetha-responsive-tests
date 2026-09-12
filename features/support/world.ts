import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from '@playwright/test';

export interface CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  etaResponse?: { status: number; body: any };
  pincodeEntered?: string;
  cardEntered?: string;
  expiryEntered?: string;
  cvvEntered?: string;
  nameEntered?: string;
  startTime?: number;
}

export class CustomWorldImpl extends World implements CustomWorld {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  etaResponse?: { status: number; body: any };
  pincodeEntered?: string;
  cardEntered?: string;
  expiryEntered?: string;
  cvvEntered?: string;
  nameEntered?: string;
  startTime?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorldImpl);
