@pincode @regression
Feature: Pincode ETA

  Scenario: Check delivery ETA for a valid pincode
    Given I am on the Sangeetha website
    When I enter the pincode "560078"
    And I check the delivery ETA
    Then the delivery ETA should be "30 Minutes"
