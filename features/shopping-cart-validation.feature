@cart @regression
Feature: Shopping Cart & Item Management Validation
  As a customer of Sangeetha Mobiles
  I want to view, manage, and modify my shopping cart items, coupons, and delivery location
  So that I can verify my order summary and proceed smoothly to checkout

  Background:
    Given I am on the Sangeetha website with an active user session

  # --- CART ACCESS & ITEM DISPLAY ---
  @CART-001 @CART-004 @smoke
  Scenario: Populated cart loads with accurate line item details
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    Then the cart page should display the active item list
    And the item card should display the product image, title, and selling price
    And the item card should display the delivery ETA and action buttons

  @CART-006
  Scenario: Multi-item cart displays distinct isolated line cards
    Given my shopping cart contains at least 2 items
    When I navigate to the Shopping Cart page
    Then each product should render in an isolated item card
    And each item card should have its own individual Remove and Save For Later controls

  # --- ITEM REMOVAL & EMPTY CART ---
  @CART-010 @CART-026
  Scenario: Selective item removal from multi-item cart updates subtotal dynamically
    Given my shopping cart contains at least 2 items
    When I navigate to the Shopping Cart page
    And I record the initial cart subtotal and item count
    When I remove the first item from the cart
    Then the active cart item count should decrement by 1
    And the order summary subtotal should recalculate to reflect the remaining items

  @CART-011 @CART-041 @smoke
  Scenario: Removing the final remaining item transitions cart to empty state and disables checkout
    Given my shopping cart contains exactly 1 item
    When I navigate to the Shopping Cart page
    And I remove the first item from the cart
    Then the cart should transition to the empty state
    And the Proceed to Buy button should not be available for checkout

  @CART-012
  Scenario: Rapid double click on Remove is safely debounced
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    And I rapidly double-click the Remove button on the first item
    Then the item should be removed cleanly without unhandled errors

  # --- SAVE FOR LATER & RESTORE ---
  @CART-013 @CART-014
  Scenario: Moving an item to Save For Later updates active and saved counts
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    And I click Save For Later on the first item
    Then the item should disappear from the active shopping cart
    And the Saved for later section should display the updated saved count

  @CART-015
  Scenario: Restoring an item from Saved For Later adds it back to the active cart
    Given my shopping cart page displays items in the Saved for later list
    When I click Add to cart on the first saved item
    Then the item should be restored to the active shopping cart
    And the active cart item count should increment by 1

  # --- COUPONS & PROMO CODES ---
  @CART-017 @CART-018 @smoke
  Scenario: Coupon Apply button toggles state based on input presence
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    Then the coupon Apply button should be disabled when the field is empty
    When I enter the coupon code "DISCOUNT10"
    Then the coupon Apply button should become enabled

  @CART-020 @CART-021
  Scenario: Submitting an invalid coupon code shows an error modal that can be dismissed
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    And I enter the coupon code "INVALIDPROMO99"
    And I click the Apply coupon button
    Then a coupon validation error modal should be displayed
    When I dismiss the coupon error modal
    Then the error modal should close and the cart should remain fully interactable

  @CART-022
  Scenario: Clicking View Coupon opens the available coupons drawer
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    When I click the View Coupon button
    Then the available coupons drawer should be displayed

  # --- PRICING & ORDER SUMMARY ---
  @CART-024
  Scenario: Order summary accurately aggregates selling prices across items
    Given my shopping cart contains at least 2 items
    When I navigate to the Shopping Cart page
    Then the order summary subtotal should equal the exact sum of all line item selling prices
    And the cart header count should match the number of active item cards

  # --- PINCODE & DELIVERY REALLOCATION ---
  @CART-030
  Scenario: Changing pincode inside Cart updates delivery location and item ETA badges
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    And I open the location change modal from the cart header
    And I update the delivery pincode to "560078" inside the cart
    Then the cart location header should display the updated pincode "560078"
    And the delivery ETA badges on items should update accordingly

  # --- PERSISTENCE ACROSS SESSIONS & RELOAD ---
  @CART-034
  Scenario: Cart contents and order summary persist across hard browser reload
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    And I record the initial cart subtotal and item count
    When I reload the cart page
    Then the active cart item count should remain unchanged
    And the order summary subtotal should remain identical to the pre-reload value

  # --- CHECKOUT HANDOFF ---
  @CART-037 @smoke
  Scenario: Proceed to Buy initiates checkout handoff
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    When I click the Proceed to Buy button
    Then the application should initiate the checkout transition
