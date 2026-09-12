@mobile @checkout @production
Feature: Mobile Checkout & Payment Flow Feature-Level Regression (Pixel 5 — 393x851)
  As a customer on the live Sangeetha production mobile PWA
  I want a robust, secure, and intuitive checkout experience
  So that I can review my order, confirm delivery address, select payment methods, and complete purchase seamlessly

  Background:
    Given the user is on the Sangeetha production mobile site with authenticated session
    And the viewport is configured for mobile Pixel 5 with width 393 and height 851

  # ─── SECTION 1: CHECKOUT ACCESS & MOBILE LAYOUT (CHECKOUT-001 to CHECKOUT-004) ───
  @CHECKOUT-001 @smoke
  Scenario: CHECKOUT-001: Customer enters Checkout from Cart via Proceed to Buy
    Given the user has active items in the shopping cart
    When the user navigates to "/cart"
    And the user taps "Proceed to Buy"
    Then the user is transitioned to the checkout payment page at "/checkout-payment"
    And the checkout page title contains "Checkout Payment" or "Sangeetha"

  @CHECKOUT-002
  Scenario: CHECKOUT-002: Mobile layout stability and zero horizontal overflow at 393px width
    When the user navigates to "/checkout-payment"
    Then the checkout mobile viewport width is exactly 393 pixels
    And the document scroll width does not exceed 394 pixels
    And no horizontal scrollbar or element overflow is present

  @CHECKOUT-003
  Scenario: CHECKOUT-003: Checkout stepper navigation renders Cart, Address, and Payment states
    When the user navigates to "/checkout-payment"
    Then the checkout stepper is visible with "Cart", "Address", and "Payment"
    And "Payment" is highlighted as the active step in the checkout flow

  @CHECKOUT-004
  Scenario: CHECKOUT-004: Header back navigation preserves checkout context
    When the user navigates to "/checkout-payment"
    Then the checkout header displays the back navigation control
    And the header displays the "Payment" section title

  # ─── SECTION 2: DELIVERY ADDRESS & HYPERLOCAL CONTEXT (CHECKOUT-005 to CHECKOUT-008) ───
  @CHECKOUT-005
  Scenario: CHECKOUT-005: Delivery address summary displays recipient, address, and tag
    When the user navigates to "/checkout-payment"
    Then the delivery address card displays "Deliver to"
    And the delivery address card displays customer name and valid pincode "560076"
    And the address tag "Home" or "Work" is rendered

  @CHECKOUT-006
  Scenario: CHECKOUT-006: Address change control opens saved address management modal
    When the user navigates to "/cart"
    And the user taps the "Change" address control
    Then the address selection modal is displayed
    And the user can view saved delivery addresses

  @CHECKOUT-007
  Scenario: CHECKOUT-007: Pincode propagation is verified in checkout network request payload
    When the user navigates to "/checkout-payment"
    Then the checkout initialization API "/b/api/payment-page-details-v4" receives "pinCode" with "560076"
    And the request payload includes a valid "address_id"

  @CHECKOUT-008
  Scenario: CHECKOUT-008: Hyperlocal delivery fee indicates Free or calculated charge
    When the user navigates to "/cart"
    Then the order delivery charges display "Delivery Charges"
    And the delivery fee indicates "Free!" or valid calculated fee

  # ─── SECTION 3: ORDER SUMMARY & ARITHMETIC INTEGRITY (CHECKOUT-009 to CHECKOUT-012) ───
  @CHECKOUT-009
  Scenario: CHECKOUT-009: Total Payable Amount card displays consistent order total
    When the user navigates to "/checkout-payment"
    Then the checkout page displays "Total Payable Amount"
    And the payable price contains the currency symbol "₹" with non-zero amount

  @CHECKOUT-010
  Scenario: CHECKOUT-010: Order summary accordion expands and collapses on tap
    When the user navigates to "/checkout-payment"
    When the user taps the "Total Payable Amount" summary button
    Then the order summary expands to display "Item Total"
    And the expanded item total matches the total payable amount

  @CHECKOUT-011
  Scenario: CHECKOUT-011: Item quantity and product list consistency between Cart and Checkout
    Given the user observes item total on "/cart"
    When the user navigates to "/checkout-payment"
    Then the item count and total payable amount are consistent with the Cart

  @CHECKOUT-012
  Scenario: CHECKOUT-012: Saved for later items are excluded from checkout total
    When the user navigates to "/cart"
    Then any items in "Saved For Later" are kept separate from the active checkout item total

  # ─── SECTION 4: OFFERS & BANK PROMOTIONS (CHECKOUT-013 to CHECKOUT-016) ───
  @CHECKOUT-013
  Scenario: CHECKOUT-013: Available offers card displays promotional count and View CTA
    When the user navigates to "/checkout-payment"
    Then the offers section displays "Offers" with offer count
    And the "View" offers button is visible and actionable

  @CHECKOUT-014
  Scenario: CHECKOUT-014: Tapping View offers opens the bottom sheet drawer
    When the user navigates to "/checkout-payment"
    When the user taps the "View" offers button
    Then the offers slide-over drawer is displayed
    And the drawer displays "Apply for maximum savings"

  @CHECKOUT-015
  Scenario: CHECKOUT-015: Bank Offers tab renders discount calculations for partner credit cards
    When the user navigates to "/checkout-payment"
    When the user opens the offers drawer
    Then the offers drawer displays "Bank Offers"
    And bank discount options display savings calculation such as "Save ₹"

  @CHECKOUT-016
  Scenario: CHECKOUT-016: EMI Plans tab renders multi-bank installment schedules
    When the user navigates to "/checkout-payment"
    When the user opens the offers drawer
    Then the offers drawer displays "EMI Plans" tab with financing options

  # ─── SECTION 5: PAYMENT METHOD SELECTION & SWITCHING (CHECKOUT-017 to CHECKOUT-021) ───
  @CHECKOUT-017
  Scenario: CHECKOUT-017: Credit/Debit Card and EMI payment method is present and selected by default
    When the user navigates to "/checkout-payment"
    Then the "Pay with Card or EMI" payment method is rendered
    And the card details form is visible with Card Number, Expiry, CVV, and Name fields

  @CHECKOUT-018
  Scenario: CHECKOUT-018: Card number formatting and input placeholder verification
    When the user navigates to "/checkout-payment"
    Then the card number input displays placeholder "0000 - 0000 - 0000 - 0000"
    And the expiry input displays placeholder "MM / 20YY"
    And the CVV input displays placeholder "000"

  @CHECKOUT-019
  Scenario: CHECKOUT-019: RBI Guideline card tokenization consent checkbox is present
    When the user navigates to "/checkout-payment"
    Then the RBI compliance text "Secure your card with Visa as per RBI guidelines" is visible
    And the card security consent checkbox is present and checked by default

  @CHECKOUT-020
  Scenario: CHECKOUT-020: Switching payment method from Card to UPI dynamically expands UPI providers
    When the user navigates to "/checkout-payment"
    When the user taps the "UPI" payment method option
    Then the UPI options expand to show "Google Pay", "Paytm", and "Phonepe"
    And the card details form collapses

  @CHECKOUT-021
  Scenario: CHECKOUT-021: Switching back from UPI to Card restores the card entry form
    When the user navigates to "/checkout-payment"
    When the user taps the "UPI" payment method option
    And the user taps the "Pay with Card or EMI" option
    Then the card entry form is restored with input fields

  # ─── SECTION 6: BOUNDARY, SECURITY & API INTEGRITY (CHECKOUT-022 to CHECKOUT-025) ───
  @CHECKOUT-022
  Scenario: CHECKOUT-022: Unauthenticated checkout access redirects safely to authentication or homepage
    Given the user is in an unauthenticated guest session
    When the user attempts to access "/checkout-payment" directly
    Then the user is safely redirected to "/" or a login prompt without crashing

  @CHECKOUT-023
  Scenario: CHECKOUT-023: Production CRM Customer Address API contract verification
    When the customer addresses are retrieved
    Then the API endpoint "/b/api/crm/getCustomerAddress" returns HTTP 200
    And the response contains customer mobile and address objects

  @CHECKOUT-024
  Scenario: CHECKOUT-024: Production Payment Page Details V4 API contract verification
    When the checkout payment page details are requested
    Then the API endpoint "/b/api/payment-page-details-v4" returns HTTP 200
    And the response includes cart details, total amount, and delivery address ID

  @CHECKOUT-025
  Scenario: CHECKOUT-025: Production Offers All V4 API contract verification
    When the offers are requested for the checkout cart
    Then the API endpoint "/b/customer/api/offers/allV4" returns HTTP 200
    And the response includes eligible bank offers and EMI partner tiers
