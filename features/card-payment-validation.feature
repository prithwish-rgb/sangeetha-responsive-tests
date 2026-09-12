@card @payment
Feature: Card Payment Form Validation & State Verification
  As a QA engineer validating the checkout card payment flow
  I want to verify card number, expiry date, CVV, and cardholder name behaviors against observed application logic
  So that regression defects, input sanitization rules, and unconfirmed boundary behaviors are systematically verified

  Background:
    Given I am on the checkout payment page

  # ==========================================
  # A. CARD NUMBER SCENARIOS
  # ==========================================

  @regression @card-number @PAY-001 @baseline
  Scenario: Valid 16-digit card with valid expiry and 3-digit CVV enables Pay Now
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

  @regression @card-number @PAY-002 @boundary
  Scenario: Incomplete 15-digit card keeps Pay Now disabled
    When I enter a card number "437546710036647"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be disabled

  @regression @card-number @PAY-003 @boundary @observation
  Scenario: Over-length card number with more than 16 digits keeps Pay Now disabled
    # Observation: Form accepts typing >16 digits but suppresses Pay Now.
    When I enter a card number "437546710036647599"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be disabled

  @regression @card-number @PAY-004 @negative
  Scenario: Empty card number keeps Pay Now disabled
    When I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be disabled

  @regression @card-number @PAY-005 @sanitization
  Scenario: Non-numeric alphabetic input in card number field is filtered out
    When I enter a card number "abcdefghijklmnop"
    Then the card number field should be empty
    And the Pay Now button should be disabled

  @regression @card-number @PAY-006 @sanitization
  Scenario: Mixed alphanumeric and special characters in card number field retain only digits
    When I enter a card number "4375abcd1003%^&*"
    Then the card number field should display "4375 1003"
    And the Pay Now button should be disabled

  @regression @card-number @PAY-007 @interaction
  Scenario: Deleting digits from a valid 16-digit card dynamically disables Pay Now
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled
    When I delete 1 digit from the card number
    Then the Pay Now button should be disabled
    When I enter a card number "4375467100366475"
    Then the Pay Now button should be enabled

  # ==========================================
  # B. EXPIRY MONTH SCENARIOS
  # ==========================================

  @regression @expiry-month @PAY-010 @negative
  Scenario: Empty expiry field keeps Pay Now disabled
    When I enter a card number "4375467100366475"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be disabled

  @regression @expiry-month @PAY-012 @normalization
  Scenario: Expiry month 00 is auto-normalized to month 01
    When I enter an expiry date "00 / 2028"
    Then the expiry date field should display "01 / 2028"

  @regression @expiry-month @PAY-013 @normalization
  Scenario: Expiry month greater than 12 is auto-normalized to month 12
    When I enter an expiry date "15 / 2028"
    Then the expiry date field should display "12 / 2028"

  @regression @expiry-month @PAY-014 @baseline
  Scenario Outline: Valid calendar months enable Pay Now when all other details are valid
    When I enter a card number "4375467100366475"
    And I enter an expiry date "<month> / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

    Examples:
      | month |
      | 01    |
      | 09    |
      | 10    |
      | 11    |
      | 12    |

  # ==========================================
  # C. EXPIRY YEAR SCENARIOS
  # ==========================================

  @regression @expiry-year @PAY-015 @negative
  Scenario: Incomplete 2-digit expiry year keeps Pay Now disabled
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 20"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the expiry validation error message should be displayed
    And the Pay Now button should be disabled

  @regression @expiry-year @PAY-016 @observation @requirement-validation-needed
  Scenario: Expiry year 0000 is currently accepted and enables Pay Now
    # Observed reproduction: Year 0000 is accepted by the client form and enables Pay Now.
    # Requirement validation needed: Confirm whether year 0000 should be rejected by client validation.
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 0000"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

  @regression @expiry-year @PAY-017 @observation @requirement-validation-needed
  Scenario: Past expired year is currently accepted by client form and enables Pay Now
    # Observed reproduction: Year 2020 is accepted without client-side blocking.
    # Requirement validation needed: Confirm whether client should block expired card years before gateway submission.
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2020"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

  @regression @expiry-year @PAY-018 @baseline
  Scenario Outline: Valid future years enable Pay Now
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / <year>"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

    Examples:
      | year |
      | 2026 |
      | 2027 |
      | 2030 |
      | 2099 |

  # ==========================================
  # D. CVV SCENARIOS
  # ==========================================

  @regression @cvv @PAY-019 @observation @requirement-validation-needed
  Scenario: Single digit CVV is currently accepted and enables Pay Now
    # Observed reproduction: 1-digit CVV is accepted and enables Pay Now.
    # Requirement validation needed: Confirm whether minimum 3-digit CVV should be strictly enforced.
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "1"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

  @regression @cvv @PAY-020 @observation @requirement-validation-needed
  Scenario: Two digit CVV is currently accepted and enables Pay Now
    # Observed reproduction: 2-digit CVV is accepted and enables Pay Now.
    # Requirement validation needed: Confirm whether minimum 3-digit CVV should be strictly enforced.
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "12"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

  @regression @cvv @PAY-021 @baseline
  Scenario: Standard 3-digit CVV enables Pay Now
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled

  @regression @cvv @PAY-022 @boundary
  Scenario: Attempting to enter more than 3 CVV digits is truncated to 3 digits
    When I enter a CVV "1234"
    Then the CVV field should display "123"

  @regression @cvv @PAY-023 @sanitization
  Scenario: Non-numeric characters in CVV field are filtered out
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "abc"
    And I enter the cardholder name "John Doe"
    Then the CVV field should be empty
    And the Pay Now button should be disabled

  @regression @cvv @PAY-024 @interaction
  Scenario: Deleting all CVV digits dynamically disables Pay Now and restoring enables Pay Now
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the Pay Now button should be enabled
    When I delete 3 digits from the CVV
    Then the Pay Now button should be disabled
    When I enter a CVV "123"
    Then the Pay Now button should be enabled

  # ==========================================
  # E. CARDHOLDER NAME SCENARIOS
  # ==========================================

  @regression @cardholder-name @PAY-025 @negative
  Scenario: Empty cardholder name keeps Pay Now disabled
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    Then the Pay Now button should be disabled

  @regression @cardholder-name @PAY-026 @boundary
  Scenario: Single character cardholder name keeps Pay Now disabled
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "A"
    Then the Pay Now button should be disabled

  @regression @cardholder-name @PAY-027 @sanitization
  Scenario: Numeric and special characters in cardholder name are stripped
    When I enter a cardholder name "John 123!@# Doe"
    Then the cardholder name field should display "John  Doe"

  @regression @cardholder-name @PAY-028 @baseline
  Scenario: Multi-word cardholder name with leading and trailing spaces enables Pay Now
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "   John Michael Doe   "
    Then the Pay Now button should be enabled

  # ==========================================
  # F. POST-LAUNCH MULTI-PAYMENT & CROSS-FEATURE
  # ==========================================

  @regression @payment-methods @PAY-POST-001
  Scenario: Multi-option payment accordions render on mobile checkout
    Then the payment page should display the Card or EMI, UPI, and Loans payment options
    And the page layout should have zero horizontal overflow at 393 width

  @regression @payment-offers @PAY-POST-002
  Scenario: Card number entry triggers auto brand detection and bank offers
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    Then the card brand should be detected as "HDFC"
    And applicable instant bank discount offers should be rendered
    And the Pay with EMI button should become visible

  @regression @payment-switch @PAY-POST-003
  Scenario: Switching payment methods toggles payment UI without state corruption
    When I switch to the "UPI" payment method
    Then the UPI payment options should be displayed
    When I switch to the "Loans" payment method
    Then the Loans payment options should be displayed
    When I switch back to the "Card" payment method
    Then the card payment form should be restored with input controls

  @regression @emi @PAY-POST-004
  Scenario: Pay with EMI opens installment options drawer with tenure breakdown
    When I enter a card number "4375467100366475"
    And I enter an expiry date "12 / 2028"
    And I enter a CVV "123"
    And I enter the cardholder name "John Doe"
    When I click the Pay with EMI button
    Then the EMI plans drawer should open displaying No Cost and Low Cost tenures

