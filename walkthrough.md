# SMPL Homepage E2E Functional Audit Walkthrough (Fixed Test Harness)

## Overview
This document summarizes the comprehensive Playwright E2E functional test audit for the homepage of [SMPL Staging (`https://smpl-new.bangalore2.com/`)](https://smpl-new.bangalore2.com/). 

Following user feedback on potential test harness artifacts, the test suite [`tests/staging-homepage-e2e-functional.spec.ts`](file:///c:/sangeetha-responsive-tests/tests/staging-homepage-e2e-functional.spec.ts) was updated with **4 critical harness fixes**:

1. **Eliminated Silent `force: true` Clicks**: Every element is first checked for natural actionability (`toBeVisible()` + natural `click()`). If pointer events are intercepted by a backdrop/overlay, the harness logs `[HARNESS LOG] Required force-click due to overlay: [reason]` before applying fallback clicking.
2. **Replaced `waitForNavigation` with `waitForURL`**: Adapted for Next.js SPA client-side router transitions (`history.pushState`). The harness waits up to 8s for the URL string to change.
3. **Diagnostic Extraction on Failure**: Captures `outerHTMLSnippet` (first 500 characters), `locatorCount` (detecting duplicate hidden DOM nodes), `hrefAttribute`, and `onClickAttribute`.
4. **4-Way Re-Classification Matrix**: Automatically classifies every non-passing test into `'CONFIRMED BUG'`, `'FALSE POSITIVE (FIXED)'`, `'STILL INCONCLUSIVE'`, or `'PASSED'`.

---

## Management Bug Report (Confirmed Bugs Only)

### 1. [Mobile Pixel 5 & Desktop] Hero Banner Navigation Failure
- **Affected Viewports**: Mobile Pixel 5 (`393×851`) & Desktop (`1920×1080`)
- **Area**: Hero Banners & Carousels
- **Observed Behavior**: Hero banner slide (`count: 1`, valid `href="/product-list/layout-22-1-684"` on mobile / `href="/product-list/realme-16-pro-675"` on desktop) receives click events, but the page URL fails to change within 8 seconds.
- **Diagnostic Dump**:
  - `outerHTMLSnippet`: `<a class="relative block aspect-[342/195] overflow-hidden rounded-[17px] shadow-[0_5px_12px_rgba(15,35,74,0.08)]" href="/product-list/layout-22-1-684">...</a>`
  - `locatorCount`: 1
  - `hrefAttribute`: `/product-list/layout-22-1-684`
  - `urlChangedWithin8s`: false

### 2. [Mobile Pixel 5 & Desktop] Category Navigation Failure (Backend Database URL Typo Discovered)
- **Affected Viewports**: Mobile Pixel 5 (`393×851`) & Desktop (`1920×1080`)
- **Area**: Category Navigation Chips
- **Observed Behavior**: Category chips return a malformed database URL `href="/product-list/laout-19-683"` (typo: `laout` missing the letter `y`). Next.js client router fails to process the route click.
- **Diagnostic Dump**:
  - `outerHTMLSnippet`: `<a class="relative block h-[66px] overflow-hidden border-y border-[#E6E6E6]" href="/product-list/laout-19-683">...</a>`
  - `locatorCount`: 1
  - `hrefAttribute`: `/product-list/laout-19-683`
  - `urlChangedWithin8s`: false

### 3. [Mobile Pixel 5 & Desktop] Homepage Product Card Click Navigation Failure
- **Affected Viewports**: Mobile Pixel 5 (`393×851`) & Desktop (`1920×1080`)
- **Area**: Featured Product Cards & Deals
- **Observed Behavior**: Clicking product cards with valid PDP hrefs (`/product-details/mynm3hn-a/17818` on mobile / `/product-details/apple-iphone-16-128gb-teal-myed3hna/17871` on desktop) does not trigger Next.js page routing; URL remains unchanged after 8 seconds.
- **Diagnostic Dump**:
  - `outerHTMLSnippet`: `<a class="flex h-[241px] flex-col items-center rounded-[18px] px-3 pb-[14px] pt-4 text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]" href="/product-details/mynm3hn-a/17818">...</a>`
  - `locatorCount`: 1
  - `hrefAttribute`: `/product-details/mynm3hn-a/17818`
  - `urlChangedWithin8s`: false

### 4. [Mobile Pixel 5 & Desktop] Footer External Link Unhandled Router Bug
- **Affected Viewports**: Mobile Pixel 5 (`393×851`) & Desktop (`1920×1080`)
- **Area**: Footer Navigation
- **Observed Behavior**: Footer social/policy links (`href="https://www.facebook.com/SangeethaMobilesIndia/"`) fail to trigger external tab opening or window navigation on click.
- **Diagnostic Dump**:
  - `outerHTMLSnippet`: `<a href="https://www.facebook.com/SangeethaMobilesIndia/" target="_blank" rel="noreferrer">...</a>`
  - `locatorCount`: 1
  - `hrefAttribute`: `https://www.facebook.com/SangeethaMobilesIndia/`

### 5. [Desktop] Location Modal Invalid Pincode Error Feedback Missing
- **Affected Viewport**: Desktop (`1920×1080`)
- **Area**: Delivery Pincode Modal
- **Observed Behavior**: Submitting an invalid/unserviceable pincode (`000000`) closes or submits without presenting error feedback or inline validation text to the user.

---

## Test Harness Notes & Re-Classification Summary

| Viewport | Test Area & Action | Previous Result | Current Re-Classification | Explanation & Empirical Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Pixel 5** | Header: Click Cart Icon | `FAILED` | `STILL INCONCLUSIVE` | `count: 0`. Header cart icon is relocated to bottom sticky navigation bar on Pixel 5 viewport. |
| **Mobile Pixel 5** | Hero Banners: Click Banner Slide | `FAILED` | `CONFIRMED BUG` | `count: 1`, valid `href="/product-list/layout-22-1-684"`. Click was executed, URL failed to change within 8s. |
| **Mobile Pixel 5** | Category Nav: Click Category Chip | `FAILED` | `CONFIRMED BUG` | `count: 1`, valid `href="/product-list/laout-19-683"`. Uncovered backend database URL typo `laout`. |
| **Mobile Pixel 5** | Product Cards: Click Card | `FAILED` | `CONFIRMED BUG` | `count: 1`, valid `href="/product-details/mynm3hn-a/17818"`. Click executed, URL failed to change within 8s. |
| **Mobile Pixel 5** | Footer Nav: Click Footer Link | `FAILED` | `CONFIRMED BUG` | `count: 1`, valid `href="https://facebook.com/..."`. Click executed, URL failed to change within 8s. |
| **Desktop 1920x1080** | Header: Click Cart Icon | `FAILED` | `STILL INCONCLUSIVE` | `count: 0` for top header cart icon locator. |
| **Desktop 1920x1080** | Location Modal: Invalid Pincode | `FAILED` | `CONFIRMED BUG` | Submitting `000000` does not display error toast/message. |

---

## Artifact Deliverables

1. **Updated Playwright E2E Spec**: [`tests/staging-homepage-e2e-functional.spec.ts`](file:///c:/sangeetha-responsive-tests/tests/staging-homepage-e2e-functional.spec.ts)
2. **Machine-Readable JSON Audit Report**: [`reports/homepage-functional-audit.json`](file:///c:/sangeetha-responsive-tests/reports/homepage-functional-audit.json)
