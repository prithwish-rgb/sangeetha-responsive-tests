@production @e2e @journey
Feature: Production Customer Shopping Journey & Design Validation
  As a customer on Sangeetha Mobiles production website (https://www.sangeetha.com/)
  I want to search for products, check location serviceability, explore catalog and product details, configure variants, add items to my cart, and proceed through checkout to payment
  So that I experience a seamless, fully functioning shopping journey with the newly implemented production design

  Background:
    Given I navigate to the Sangeetha production homepage

  # --- STEP 1 & 2: HOMEPAGE & HYPERLOCAL LOCATION ---
  @journey-01 @homepage @location
  Scenario: Customer loads homepage and verifies hyperlocal location and header design
    Then the homepage should load with the brand logo, search bar, and cart icon
    When I open the location selector modal
    And I enter and check the valid delivery pincode "560078"
    Then the header location badge should reflect the delivery pincode "560078"

  @journey-02 @location @negative
  Scenario: Customer enters an invalid pincode and observes serviceability feedback
    When I open the location selector modal
    And I enter and check the unserviceable pincode "999999"
    Then the serviceability response should indicate unserviceable location

  # --- STEP 3 & 4: SEARCH & CATALOG PLP ---
  @journey-03 @search @autocomplete
  Scenario: Customer searches for a product and views live autocomplete suggestions
    When I type "Samsung" in the header search input
    Then the search autocomplete dropdown should render matching top suggestions
    When I submit the search query
    Then the product results or suggestion items should be displayed

  @journey-04 @plp @catalog
  Scenario: Customer navigates to a product collection page
    When I navigate to the product collection "/product-list/google-pixel-11-series-805"
    Then the product listing page should render product cards with images, titles, and pricing

  # --- STEP 5 & 6: PDP, VARIANTS & ADD TO CART ---
  @journey-05 @pdp @variants
  Scenario: Customer views product details and switches product variants
    When I open the product details page "/product-details/oppo-a6-5g-6gb-128gb-sakura-pink-in-smartphones-oppo-a6-6-128-spn/21036"
    Then the product details page should display the product title, image gallery, and selling price
    And the Add to Cart CTA button should be visible and clickable

  @journey-06 @cart @add-to-cart
  Scenario: Customer adds a product to the cart from PDP
    When I open the product details page "/product-details/oppo-a6-5g-6gb-128gb-sakura-pink-in-smartphones-oppo-a6-6-128-spn/21036"
    And I click the Add to Cart button
    Then the product should be added to the cart session

  # --- STEP 7: CART PAGE & REGRESSION ---
  @journey-07 @cart @regression
  Scenario: Customer views the cart page and validates item details, coupon UI, and order summary
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    Then the cart page should display the active item list
    And the coupon section should display the coupon input and Apply control
    And the Order Summary should display the calculated total and the Proceed to Buy CTA

  # --- STEP 8 & 9: CHECKOUT & PAYMENT ---
  @journey-08 @checkout @payment
  Scenario: Customer proceeds from cart to checkout payment page
    Given my shopping cart contains at least 1 item
    When I navigate to the Shopping Cart page
    And I click the Proceed to Buy button
    Then the application should navigate to the checkout payment page

  @journey-09 @payment @card-validation
  Scenario: Customer verifies card payment inputs and dynamic Pay Now state
    Given my shopping cart contains at least 1 item
    When I navigate to the checkout payment page
    Then the card payment form should be displayed with card number, expiry, CVV, and cardholder fields
    And the Pay Now button should initially be disabled
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "Regression Test"
    Then the Pay Now button should be enabled

  # --- STEP 10: COMPLETE CONTINUOUS JOURNEY ---
  @journey-10 @full-flow @smoke
  Scenario: Complete customer journey from Homepage through Search, PDP, Cart, Checkout, and Payment
    When I open the location selector modal
    And I enter and check the valid delivery pincode "560078"
    When I open the product details page "/product-details/oppo-a6-5g-6gb-128gb-sakura-pink-in-smartphones-oppo-a6-6-128-spn/21036"
    Then the product details page should display the product title, image gallery, and selling price
    When I click the Add to Cart button
    When I navigate to the Shopping Cart page
    Then the cart page should display the active item list
    When I click the Proceed to Buy button
    Then the application should navigate to the checkout payment page
    And the card payment form should be ready for payment input without placing a real order
