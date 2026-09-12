@production @mobile @search @search-suite @regression
Feature: Sangeetha Production Mobile Search Feature-Level Regression
  As a mobile customer on the newly launched Sangeetha production website (https://www.sangeetha.com/)
  I want to interact with the mobile search bar, voice and camera triggers, trending suggestions,
  product search APIs, keyword variations, and input boundary validations
  So that I can seamlessly discover and search for products in the mobile catalog.

  Background:
    Given the customer opens the Sangeetha mobile homepage

  # --- 1. MOBILE SEARCH BAR UI & CONTROLS ---
  @SEARCH-001 @search @ui @mobile
  Scenario: SEARCH-001 - Customer verifies mobile search bar container and prompt text
    Then the mobile search bar should be visible in the mobile header
    And the search prompt should display an intuitive shopping placeholder

  @SEARCH-002 @search @icon
  Scenario: SEARCH-002 - Customer verifies search icon rendering
    Then the search icon should be rendered with valid icon asset

  @SEARCH-003 @search @camera @lens
  Scenario: SEARCH-003 - Customer verifies Camera search action button
    Then the camera search button should be visible with aria-label "Open camera"
    And the camera icon should be clickable with standard touch target size

  @SEARCH-004 @search @voice @microphone
  Scenario: SEARCH-004 - Customer verifies Voice microphone search action button
    Then the microphone search button should be visible with aria-label "Use microphone"
    And the microphone icon should be clickable with standard touch target size

  @SEARCH-005 @search @layout @overflow
  Scenario: SEARCH-005 - Customer verifies mobile search bar fits 393px viewport without overflow
    Then the search bar container should fit cleanly within the 393px mobile viewport

  # --- 2. SEARCH APIs & TRENDING PRODUCTS ---
  @SEARCH-006 @api @trending
  Scenario: SEARCH-006 - Customer verifies Top Trending Products search API
    When the application fetches top trending search products for pincode "560078"
    Then the trending search API should respond with HTTP 200 and a list of trending products

  # --- 3. CORE SEARCH FUNCTIONAL QUERIES (API & ENGINE VALIDATION) ---
  @SEARCH-007 @api @product @query
  Scenario: SEARCH-007 - Product name search query "iPhone"
    When a customer executes search for product "iPhone" with pincode "560078"
    Then the search API should return HTTP 200 with total records greater than 20
    And the response message should indicate "Product list Fetched Succesfully!.."

  @SEARCH-008 @api @brand @query
  Scenario: SEARCH-008 - Brand name search query "Samsung"
    When a customer executes search for brand "Samsung" with pincode "560078"
    Then the search API should return HTTP 200 with total records greater than 400

  @SEARCH-009 @api @model @network @query
  Scenario: SEARCH-009 - Network & specification search query "5G"
    When a customer executes search for specification "5G" with pincode "560078"
    Then the search API should return HTTP 200 with total records greater than 1000

  @SEARCH-010 @api @category @query
  Scenario: SEARCH-010 - Category keyword search query "Laptops"
    When a customer executes search for category "Laptops" with pincode "560078"
    Then the search API should return HTTP 200 with total records greater than 20

  @SEARCH-011 @api @partial @query
  Scenario: SEARCH-011 - Partial keyword search query "sam"
    When a customer executes search for partial keyword "sam" with pincode "560078"
    Then the search API should return HTTP 200 with total records greater than 500

  @SEARCH-012 @api @case-insensitive @query
  Scenario: SEARCH-012 - Mixed case search query "iPhOnE" parity
    When a customer executes search for mixed case keyword "iPhOnE" with pincode "560078"
    Then the search API should return the same total records as "iPhone"

  @SEARCH-013 @api @numeric @query
  Scenario: SEARCH-013 - Numeric specification search query "128"
    When a customer executes search for numeric query "128" with pincode "560078"
    Then the search API should return HTTP 200 with total records greater than 500

  # --- 4. BOUNDARY, NEGATIVE & SECURITY TESTING ---
  @SEARCH-014 @api @boundary @special-chars
  Scenario: SEARCH-014 - Special character search query "@#$%"
    When a customer executes search with special characters "@#$%"
    Then the search API should return HTTP 200 with message "The keyword format is invalid."

  @SEARCH-015 @api @boundary @empty @whitespace
  Scenario: SEARCH-015 - Empty and whitespace-only search query
    When a customer executes search with whitespace "   "
    Then the search API should return HTTP 200 with message "The keyword field is required."

  @SEARCH-016 @api @security @xss
  Scenario: SEARCH-016 - Script injection and XSS defense
    When a customer sends a malicious search payload "<script>alert(1)</script>"
    Then the application WAF should block the request with HTTP status 403

  # --- 5. REAL MOBILE CUSTOMER SEARCH UI JOURNEY (SEARCH-017 to SEARCH-028) ---
  @SEARCH-017 @ui @journey @open-search
  Scenario: SEARCH-017 - Customer opens Mobile Search Drawer from Homepage
    When the customer taps the search bar on the mobile homepage
    Then the mobile search drawer should open in a full-screen overlay
    And the search input field should be visible and ready for text input
    And the search drawer should display the AI Suggestions section with quick search chips

  @SEARCH-018 @ui @journey @query-input
  Scenario: SEARCH-018 - Customer enters a product query in mobile search drawer
    Given the customer opens the mobile search drawer
    When the customer types "iPhone" into the mobile search input
    Then the search input should display "iPhone" without character truncation
    And the clear search button should become visible

  @SEARCH-019 @ui @journey @autocomplete @suggestions
  Scenario: SEARCH-019 - Customer verifies live autocomplete suggestions and instant product cards
    Given the customer opens the mobile search drawer
    When the customer types "iPhone" into the mobile search input
    Then live search suggestions should appear with relevant category tags
    And instant product preview cards should be displayed with product names and pricing
    And the "See all Products" search action link should be visible

  @SEARCH-020 @ui @journey @submit-search
  Scenario: SEARCH-020 - Customer submits search query through mobile search UI
    Given the customer opens the mobile search drawer
    When the customer types "iPhone" into the mobile search input
    And the customer submits the search query
    Then the application should navigate to the search results page reflecting "iPhone"

  @SEARCH-021 @ui @journey @results-validation
  Scenario: SEARCH-021 - Customer validates Search Results page structure and controls
    Given the customer is on the search results page for "iPhone"
    Then the search result page should display the browsing query title "Continue Browsing for \"iPhone\""
    And the search filter and sort controls should be accessible on mobile
    And the page layout should remain intact within the 393px mobile viewport

  @SEARCH-022 @ui @journey @back-navigation
  Scenario: SEARCH-022 - Customer navigates back from Search Drawer to Homepage
    Given the customer opens the mobile search drawer
    When the customer taps the back or close button in the search drawer
    Then the search drawer should close and return the customer to the mobile homepage

  @SEARCH-023 @ui @journey @clear-search
  Scenario: SEARCH-023 - Customer clears search query using the clear control
    Given the customer opens the mobile search drawer
    When the customer types "iPhone" into the mobile search input
    And the customer taps the clear search button
    Then the search input field should be reset and empty
    And the AI Suggestions section should be restored

  @SEARCH-024 @ui @journey @second-search
  Scenario: SEARCH-024 - Customer executes a second search without page reload
    Given the customer opens the mobile search drawer
    When the customer types "iPhone" into the mobile search input
    And the customer clears the search input
    And the customer types a second query "Samsung" into the search input
    Then live suggestions for "Samsung" should replace previous suggestions
    And the search UI should not display stale "iPhone" suggestions

  @SEARCH-025 @ui @negative @boundary
  Scenario: SEARCH-025 - Customer tests boundary and nonexistent UI search terms
    Given the customer opens the mobile search drawer
    When the customer searches for a nonexistent term "xyznonexistent99999"
    Then the search results page should display a "No products found" empty state message
    And the search results interface should remain functional without crash

  @SEARCH-026 @ui @mobile @layout @overflow
  Scenario: SEARCH-026 - Customer verifies Mobile Search UI layout and touch targets
    Given the customer opens the mobile search drawer
    Then the search drawer container width should not exceed 393px
    And all action buttons in the search header should have minimum touch target sizes
    And there should be zero horizontal viewport overflow

  @SEARCH-027 @ui @camera @voice @drawer
  Scenario: SEARCH-027 - Customer verifies Camera and Voice buttons inside Search Drawer
    Given the customer opens the mobile search drawer
    Then the search drawer should display camera and microphone action triggers
    And tapping the camera or microphone button should trigger standard browser permissions without app crash

  @SEARCH-028 @ui @api @network @telemetry
  Scenario: SEARCH-028 - Correlate Mobile UI search action with live backend network API
    Given the customer opens the mobile search drawer
    When the customer types "iPhone" into the mobile search input
    Then a live network request to "/b/customer/api/search/products" should be captured
    And the backend response should return status 200 with total records greater than 0

