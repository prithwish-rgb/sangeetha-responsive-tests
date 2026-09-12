@production @mobile @homepage @regression
Feature: Sangeetha Production Mobile Homepage Feature-Level Regression
  As a mobile customer on the newly launched Sangeetha production website (https://www.sangeetha.com/)
  I want to interact with all homepage features including header navigation, hyperlocal delivery location selector,
  hero banner carousels, category navigation strip, promotional product rails, brand directories, newsletter subscription,
  and expandable footer accordions
  So that I have a flawless, high-performance, and responsive mobile shopping experience.

  Background:
    Given the customer opens the Sangeetha mobile homepage

  # --- 1. GENERAL & INITIAL LOAD ---
  @HOME-001 @load @title
  Scenario: HOME-001 - Customer opens mobile homepage and verifies page load and title
    Then the mobile homepage should finish loading with HTTP status 200
    And the page title should reflect "Buy Mobile Phones & Accessories Online | Sangeetha Mobiles"

  # --- 2. HYPERLOCAL LOCATION SELECTOR ---
  @HOME-002 @location @modal
  Scenario: HOME-002 - Customer observes hyperlocal location bottom sheet on fresh visit
    Then the location bottom sheet modal should prompt for delivery location selection

  @HOME-003 @location @pincode @boundary
  Scenario: HOME-003 - Customer selects Type Manually and observes initial disabled CTA state
    When the customer clicks Type Manually in the location modal
    Then the pincode input field should be visible with placeholder "Enter Pincode"
    And the Check Delivery Availability button should initially be disabled

  @HOME-004 @location @negative @boundary
  Scenario: HOME-004 - Customer enters incomplete pincode (< 6 digits)
    When the customer enters 4 digits "5600" in the pincode input
    Then the Check Delivery Availability button should remain disabled

  @HOME-005 @location @negative @unserviceable
  Scenario: HOME-005 - Customer enters unserviceable pincode "999999"
    When the customer enters pincode "999999"
    And the customer submits the delivery availability check
    Then the application should indicate delivery unserviceability

  @HOME-006 @location @positive @eta
  Scenario: HOME-006 - Customer enters valid delivery pincode "560078"
    When the customer enters pincode "560078"
    And the customer submits the delivery availability check
    Then the delivery location should be confirmed and header location badge updated to "560078"

  # --- 3. HEADER INTERACTION ---
  @HOME-007 @header @logo
  Scenario: HOME-007 - Customer verifies brand logo in mobile header
    Then the mobile header should display the Sangeetha brand logo

  @HOME-008 @header @cart
  Scenario: HOME-008 - Customer verifies header cart icon and accessibility target
    Then the header cart icon button should be visible with valid aria-label

  @HOME-009 @header @search @voice @camera
  Scenario: HOME-009 - Customer verifies integrated search bar and action triggers
    Then the search bar area should provide search input, voice microphone, and camera scan triggers

  # --- 4. HERO BANNERS & CAROUSELS ---
  @HOME-010 @banner @carousel @hero
  Scenario: HOME-010 - Customer interacts with top hero banner carousel bullets
    Then the top hero banner carousel should display promotional slides with interactive pagination bullets
    When the customer taps on hero banner slide 2
    Then the active banner slide should transition smoothly

  # --- 5. CATEGORY NAVIGATION ---
  @HOME-011 @categories @navigation
  Scenario: HOME-011 - Customer explores Popular Categories navigation strip
    When the customer scrolls to the "Popular Categories" section
    Then category icon items should be rendered with horizontal scroll capability

  # --- 6. PRODUCT RAILS & CARDS ---
  @HOME-012 @product-rail @promotions
  Scenario: HOME-012 - Customer views "Hurry Up! Get Up to 50% Off" promotional rail
    When the customer scrolls to the "Hurry Up! Get Up to 50% Off" product rail
    Then product cards should display item image, product title, and discount pricing

  @HOME-013 @product-card @cta @add-to-cart @buy-now
  Scenario: HOME-013 - Customer validates product card CTA buttons
    Then every product card in promotional rails should render "Add to Cart" and "Buy Now" CTAs

  @HOME-014 @brands @directory
  Scenario: HOME-014 - Customer browses "Shop Phones by Brands" rail
    When the customer scrolls to the "Shop Phones by Brands" section
    Then top smartphone brand logos should be displayed in interactive cards

  @HOME-015 @product-rail @best-sellers
  Scenario: HOME-015 - Customer browses "Best Selling Phones" dark-themed rail
    When the customer scrolls to the "Best Selling Phones" section
    Then curated bestselling smartphone cards should be rendered

  @HOME-016 @promos @carousel
  Scenario: HOME-016 - Customer verifies secondary promotional banner modules
    Then secondary promotional carousels should render campaign graphics with indicator dots

  @HOME-017 @brands @audio
  Scenario: HOME-017 - Customer browses "Explore Top Audio Brands" section
    When the customer scrolls to the "Explore Top Audio Brands" section
    Then audio brand cards should be displayed

  # --- 7. NEWSLETTER & FOOTER ACCORDIONS ---
  @HOME-018 @newsletter @subscribe
  Scenario: HOME-018 - Customer interacts with newsletter subscription form
    When the customer scrolls to the "Get updates from us" newsletter section
    And the customer enters email "qa.regression@sangeethatest.com"
    Then the newsletter subscribe button should be clickable

  @HOME-019 @footer @accordions @mobile-ui
  Scenario: HOME-019 - Customer expands mobile footer accordions
    When the customer scrolls to the footer section
    And the customer taps the "Sangeetha" footer accordion
    Then the accordion should expand to reveal corporate and legal links

  # --- 8. MOBILE VIEWPORT LAYOUT ---
  @HOME-020 @layout @overflow @responsiveness
  Scenario: HOME-020 - Customer verifies mobile layout bounds and zero horizontal overflow
    Then the mobile homepage should fit within the 393px mobile viewport with zero horizontal scroll overflow
