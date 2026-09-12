@plp-suite
Feature: Product Listing Page (PLP) Mobile Regression Suite

  As a mobile customer on Sangeetha PWA
  I want to browse category product listing pages, apply filters and sorting, inspect product cards, and navigate to PDPs
  So that I can effortlessly discover and purchase products in the mobile viewport (393x851)

  Background:
    Given the mobile customer opens the Sangeetha application on Pixel 5 viewport

  # --- 1. PLP ACCESS & HEADER STRUCTURE ---
  @PLP-001 @plp @navigation @header
  Scenario: PLP-001 - Customer navigates to Category PLP from Homepage
    When the customer taps the "Smartphones" category on the homepage
    Then the application should navigate to the category PLP "/product-list/category-smartphones-308"
    And the PLP header should display the category title "Smartphones"

  @PLP-002 @plp @layout @overflow
  Scenario: PLP-002 - Mobile PLP layout conforms to 393px viewport without horizontal overflow
    Given the customer is on the PLP for "category-smartphones-308"
    Then the PLP container and product grid should fit cleanly within the 393px mobile viewport
    And the page should have zero horizontal scroll overflow

  @PLP-003 @plp @buttons @sticky
  Scenario: PLP-003 - Filter and Sort controls are prominently accessible on mobile PLP
    Given the customer is on the PLP for "category-smartphones-308"
    Then the "Filters" action button should be visible
    And the "Sort" action button should be visible

  # --- 2. BACKEND API & DATA CONTRACT ---
  @PLP-004 @api @plp @products
  Scenario: PLP-004 - Product list retrieval API returns active category products
    When the application retrieves the PLP product list for category "308" with pincode "560078"
    Then the product list API should respond with HTTP 200 and a non-empty products catalog

  @PLP-005 @api @filter @options
  Scenario: PLP-005 - Filter options API provides dynamic facet groups and counts
    When the application fetches filter options for category "308"
    Then the filter options API should respond with HTTP 200 containing "Price" and "Brands" facets

  @PLP-006 @api @sort @options
  Scenario: PLP-006 - Sort options API returns all 5 supported sorting criteria
    When the application fetches sort options for category "308"
    Then the sort API should return HTTP 200 with 5 sort options including "Price - Low to High" and "Price - High to Low"

  # --- 3. PRODUCT CARDS & PDP NAVIGATION ---
  @PLP-007 @plp @card @rendering
  Scenario: PLP-007 - Product cards render image, title, pricing, and savings badge
    Given the customer is on the PLP for "category-smartphones-308"
    Then the product grid should display product cards with images, titles, and rupee prices
    And eligible product cards should display savings or discount badges

  @PLP-008 @plp @card @pdp-navigation
  Scenario: PLP-008 - Tapping a product card navigates to the matching PDP
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer taps on the first product card
    Then the application should navigate to the corresponding product details page "/product-details/"

  # --- 4. FILTERING SYSTEM ---
  @PLP-009 @plp @filter @drawer
  Scenario: PLP-009 - Customer opens and inspects the mobile Filter drawer
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer taps the "Filters" button
    Then the slide-up filter drawer should open displaying filter categories
    And the filter drawer should contain "Clear filters" and "Price" options

  @PLP-010 @plp @filter @price
  Scenario: PLP-010 - Customer applies Price range filter and verifies product updates
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer opens filters and selects the price range "₹1,000 - ₹5,000"
    And the customer applies the filter
    Then the product list should update to show only products within "₹1,000 - ₹5,000"
    And the filter button should display an active badge "Filters (1)"

  @PLP-011 @plp @filter @brand
  Scenario: PLP-011 - Customer filters products by Brand
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer opens filters and navigates to the "Brands" facet
    And the customer selects the first available brand and applies filters
    Then the filtered product list should reflect the selected brand

  @PLP-012 @plp @filter @clear
  Scenario: PLP-012 - Customer clears applied filters to restore original catalog
    Given the customer is on the PLP with an active filter
    When the customer opens filters and taps "Clear filters"
    And the customer applies the cleared filters
    Then the full category product catalog should be restored
    And the filter button should reset to "Filters" without count badge

  # --- 5. SORTING SYSTEM ---
  @PLP-013 @plp @sort @drawer
  Scenario: PLP-013 - Customer opens and inspects the mobile Sort drawer
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer taps the "Sort" button
    Then the slide-up sort drawer should open displaying 5 sort options

  @PLP-014 @plp @sort @low-to-high
  Scenario: PLP-014 - Customer sorts products by Price Low to High
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer opens sort and selects "Price - Low to High"
    Then the product listing should be ordered by price in ascending order

  @PLP-015 @plp @sort @high-to-low
  Scenario: PLP-015 - Customer sorts products by Price High to Low
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer opens sort and selects "Price - High to Low"
    Then the product listing should be ordered by price in descending order

  @PLP-016 @plp @sort @newest-first
  Scenario: PLP-016 - Customer sorts products by Newest First
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer opens sort and selects "Newest First"
    Then the product listing should update to reflect the newest releases

  # --- 6. STATE COMBINATIONS & PERSISTENCE ---
  @PLP-017 @plp @filter @sort @combination
  Scenario: PLP-017 - Customer applies Filter then Sort sequentially
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer opens filters and selects the price range "₹5,000 - ₹10,000"
    And the customer applies the filter
    And the customer opens sort and selects "Price - Low to High"
    Then the product list should reflect both the applied price filter and ascending sort order

  @PLP-018 @plp @sort @filter @combination
  Scenario: PLP-018 - Customer applies Sort then Filter sequentially
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer opens sort and selects "Price - High to Low"
    And the customer opens filters and selects the price range "₹10,000 - ₹15,000"
    And the customer applies the filter
    Then the product list should reflect both the applied filter and descending sort order

  @PLP-019 @plp @navigation @back-persistence
  Scenario: PLP-019 - Back navigation from PDP preserves or gracefully restores PLP state
    Given the customer is on the PLP with an active sort option
    When the customer taps on a product card to open PDP
    And the customer navigates back to the PLP
    Then the PLP should reload without crashing or broken layout

  # --- 7. PAGINATION / INFINITE SCROLL ---
  @PLP-020 @plp @pagination @infinite-scroll
  Scenario: PLP-020 - Customer scrolls to bottom to trigger infinite scroll product loading
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer scrolls down to the bottom of the product listing
    Then additional products should load dynamically into the product grid

  # --- 8. EMPTY & BOUNDARY STATES ---
  @PLP-021 @plp @empty-state
  Scenario: PLP-021 - Customer encounters clean empty state when no products match criteria
    Given the customer navigates to a non-existent PLP category
    Then the PLP should display a clean empty state message without UI crashes

  # --- 9. LOCATION & HYPERLOCAL AVAILABILITY ---
  @PLP-022 @plp @location @hyperlocal
  Scenario: PLP-022 - PLP products reflect hyperlocal delivery availability for pincode 560078
    Given the customer has location set to pincode "560078"
    When the customer browses the Smartphones PLP
    Then the product cards should render with live pricing and availability

  # --- 10. MOBILE VIEWPORT & TOUCH TARGET AUDIT ---
  @PLP-023 @plp @touch-targets @mobile
  Scenario: PLP-023 - All interactive buttons and touch targets meet minimum 44px standard
    Given the customer is on the PLP for "category-smartphones-308"
    Then all filter, sort, and navigation buttons should satisfy mobile touch target standards

  @PLP-024 @plp @image @assets
  Scenario: PLP-024 - Product thumbnail images load properly without broken image icons
    Given the customer is on the PLP for "category-smartphones-308"
    Then all visible product thumbnail images should have valid source URLs and load successfully

  # --- 11. END-TO-END NETWORK TELEMETRY CORRELATION ---
  @PLP-025 @api @network @telemetry
  Scenario: PLP-025 - Live PLP interactions correlate directly with backend network requests
    Given the customer is on the PLP for "category-smartphones-308"
    When the customer triggers filter and sort actions
    Then the network telemetry should record corresponding POST and GET requests with HTTP 200
