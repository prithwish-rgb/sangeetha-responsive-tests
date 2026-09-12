@pdp @mobile @regression
Feature: Product Details Page (PDP) Mobile Regression Suite
  As a mobile customer on Sangeetha Mobile PWA (Pixel 5: 393x851)
  I want to view comprehensive product information, select variants, check delivery ETA, and initiate purchase actions
  So that I can confidently evaluate products and seamlessly proceed to checkout.

  Background:
    Given the customer opens the Sangeetha mobile application on Pixel 5 viewport

  # -------------------------------------------------------------
  # 1. PDP ACCESS, HEADER & MOBILE LAYOUT (PDP-001 - PDP-004)
  # -------------------------------------------------------------
  @smoke @pdp-access
  Scenario: PDP-001 - Customer navigates to PDP from Product Listing Page and verifies product context
    When the customer navigates to the PLP for "category-smartphones-308"
    And the customer taps on the first product card
    Then the application should navigate to the corresponding PDP
    And the PDP should display the product title, sale price, and product gallery

  @pdp-layout
  Scenario: PDP-002 - Mobile viewport 393x851 layout stability and zero horizontal overflow
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP content and sticky elements should fit cleanly within 393px width
    And the page should have zero horizontal scroll overflow

  @pdp-header
  Scenario: PDP-003 - Header navigation controls and back button functionality
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP header should contain the back button, search control, and cart icon
    When the customer taps the back button
    Then the browser should navigate back to the previous page

  @pdp-share
  Scenario: PDP-004 - Product Share CTA presence and accessibility
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP should display an interactive Share button with compliant touch target

  # -------------------------------------------------------------
  # 2. IMAGE GALLERY & CAROUSEL (PDP-005 - PDP-007)
  # -------------------------------------------------------------
  @pdp-gallery
  Scenario: PDP-005 - Product gallery renders high-resolution CDN images
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the primary product gallery should display valid Gumlet CDN images
    And none of the gallery images should be broken

  @pdp-gallery-swipe
  Scenario: PDP-006 - Product image gallery carousel swipe and pagination
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the product gallery should support swipe gestures and indicator pagination

  @pdp-gallery-zoom
  Scenario: PDP-007 - Gallery image preview interaction maintains product identity
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    When the customer inspects the primary product image
    Then the product image context should match the selected variant

  # -------------------------------------------------------------
  # 3. PRICING, DISCOUNTS & OFFERS (PDP-008 - PDP-010)
  # -------------------------------------------------------------
  @pdp-pricing
  Scenario: PDP-008 - Price, MRP strike-through, and savings calculation consistency
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP should display a bold sale price, strike-through MRP, and savings badge
    And the calculated savings should equal MRP minus sale price

  @pdp-offers
  Scenario: PDP-009 - Bank offers and promotional discounts API correlation
    When the application fetches PDP offers for product "21266" with amount 26999
    Then the offers API should respond with HTTP 200 and available promotional schemes

  @pdp-emi
  Scenario: PDP-010 - EMI and payment messaging visibility
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP should display transparent pricing information and payment options

  # -------------------------------------------------------------
  # 4. VARIANT SELECTION & DYNAMIC STATE (PDP-011 - PDP-014)
  # -------------------------------------------------------------
  @pdp-variants-color
  Scenario: PDP-011 - Color variant selection updates product title and image context
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    When the customer selects the "Eternal Orange" color variant
    Then the selected color variant should be highlighted as active
    And the product title should update to reflect "Eternal Orange"

  @pdp-variants-storage
  Scenario: PDP-012 - Storage and RAM variant switching updates pricing and SKU
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    When the customer selects the "6GB + 128GB" configuration variant
    Then the selected configuration variant should show active state
    And the displayed price should update to reflect "₹23,999"

  @pdp-variants-restore
  Scenario: PDP-013 - Returning to original variant restores original pricing and SKU
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    When the customer selects the "6GB + 128GB" configuration variant
    And the customer re-selects the "8GB + 128GB" configuration variant
    Then the displayed price should restore to "₹26,999"

  @pdp-variants-dependency
  Scenario: PDP-014 - Multi-dimensional variant matrix consistency
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then all available color and storage pills should display clear pricing badges

  # -------------------------------------------------------------
  # 5. LOCATION, PINCODE & DELIVERY ETA (PDP-015 - PDP-017)
  # -------------------------------------------------------------
  @pdp-pincode-valid
  Scenario: PDP-015 - Valid pincode displays delivery ETA and store availability
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the delivery section should display active delivery status for pincode "560078"

  @pdp-pincode-api
  Scenario: PDP-016 - Product ETA API telemetry verification
    When the application queries product ETA for product "21266" with pincode "560078"
    Then the ETA API should respond with HTTP 200 and valid delivery turnaround

  @pdp-pincode-change
  Scenario: PDP-017 - Location change updates sticky action bar delivery chip
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the sticky bottom bar should display the "Deliver to 560078" location chip

  # -------------------------------------------------------------
  # 6. CART & PURCHASE ACTIONS (PDP-018 - PDP-020)
  # -------------------------------------------------------------
  @pdp-add-to-cart
  Scenario: PDP-018 - Add to Cart CTA triggers cart addition and updates state
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    When the customer taps the sticky "Add to Cart" button
    Then the application should trigger the cart addition process
    And the user should remain in the purchase workflow

  @pdp-buy-now
  Scenario: PDP-019 - Buy Now CTA initiates direct checkout navigation
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    When the customer taps the sticky "Buy Now" button
    Then the application should transition towards the checkout or authentication flow

  @pdp-sticky-bar
  Scenario: PDP-020 - Sticky mobile CTA bar remains accessible during scroll
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    When the customer scrolls down through the PDP content
    Then the sticky bottom CTA bar containing Add to Cart and Buy Now should remain visible

  # -------------------------------------------------------------
  # 7. PRODUCT DETAILS, SPECS & REVIEWS (PDP-021 - PDP-023)
  # -------------------------------------------------------------
  @pdp-specs
  Scenario: PDP-021 - Product Specifications and Highlights sections rendering
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP should display the "Specs" and "Highlights" tabs or sections
    And the specifications content should render detailed technical attributes

  @pdp-reviews
  Scenario: PDP-022 - Ratings & Reviews section and Write a Review CTA
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP should display the "Ratings & Reviews" section with "Write a Review" button

  @pdp-faq
  Scenario: PDP-023 - Customer FAQ and Post Question interaction
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP should display the "FAQ's" section with "Post your Question" button

  # -------------------------------------------------------------
  # 8. INTEGRATED TELEMETRY & BOUNDARY STATES (PDP-024 - PDP-025)
  # -------------------------------------------------------------
  @pdp-ratings-api
  Scenario: PDP-024 - Ratings API telemetry contract validation
    When the application queries product ratings for product "21266"
    Then the product ratings API should respond with HTTP 200

  @pdp-state-persistence
  Scenario: PDP-025 - Direct PDP access handles cold session gracefully
    When the customer opens the PDP for product "redmi-17-5g-8gb-128gb-absolute-black/21266"
    Then the PDP should render full product information without crashing
