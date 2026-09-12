import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType
} from 'docx';

async function generateCardDetailsReportSourceDoc() {
  const primaryColor = '0B74B8'; // Sangeetha Blue
  const darkNavy = '1E293B';
  const lightGray = 'F1F5F9';
  const borderColor = 'CBD5E1';
  const highlightBg = 'E2E8F0';

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          // 1. Title & Subtitle
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Regression BDD Module: Card Details Payment Form',
                bold: true,
                size: 32,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Feature-Level Regression Validation using Cucumber + Playwright + Postman',
                italics: true,
                size: 22,
                color: darkNavy,
              }),
            ],
          }),

          // 2. Feature / Application Context
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: '1. Feature & Application Context',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Application Under Test', bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Sangeetha Mobiles Web Application (Production / Live)' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Target URL / Endpoint', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'https://www.sangeethamobiles.com/checkout-payment' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Feature Tested', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Checkout Payment — Card Details Form (Credit / Debit Card)' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Testing Type', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Automated Feature-Level Regression & Boundary Validation' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Testing Architecture', bold: true })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Cucumber BDD → Playwright UI → Real Sangeetha Browser Network → Postman CLI Capture/Matching → Postman Assertions',
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Specification Source', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'features/card-payment-validation.feature' })] })],
                  }),
                ],
              }),
            ],
          }),

          // 3. Core Test Case
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '2. Core Test Case Definition',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'Core Test Case: Card Details / Payment Form Regression Validation',
                bold: true,
                size: 22,
                color: darkNavy,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'All granular scenarios within this regression module map to this single Core Test Case, structured systematically across 8 distinct verification areas:',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                shading: { fill: darkNavy, type: ShadingType.CLEAR, color: 'auto' },
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Verification Area', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Scenario Coverage & IDs', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Core Objective & Focus', bold: true, color: 'FFFFFF' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'A. Card Number', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-001 to PAY-007' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '16-digit valid, 15-digit boundary, >16 overlength, empty, alpha filtering, mixed character sanitization, backspace dynamic state' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'B. Expiry Month', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-010 to PAY-014' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Empty month, month 00->01 auto-normalization, month >12->12 auto-normalization, full valid month spectrum (01, 09, 10, 11, 12)' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'C. Expiry Year', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-015 to PAY-018' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Incomplete 2-digit year blocking, Year 0000 client acceptance, Expired year (2020) client acceptance, Valid future years (2026, 2027, 2030, 2099)' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'D. CVV Validation', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-019 to PAY-024' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '1-digit CVV acceptance, 2-digit CVV acceptance, 3-digit standard, >3 digit truncation, alpha filtering, dynamic deletion/restoration' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'E. Cardholder Name', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-025 to PAY-028' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Empty name blocking, single character boundary blocking, special char & digit stripping, multi-word whitespace handling' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'F. Form & Pay Now State', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cross-field state logic' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Real-time validation enabling Pay Now ONLY when all field criteria are satisfied simultaneously' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'G. Dynamic Interactions', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-007, PAY-024' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Re-evaluation of submit button enabled/disabled state upon single-digit keystroke/backspace modifications' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'H. Network / API Behavior', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Payment details v4, summary, auth' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Client-side isolation verification: no premature authorization/charge calls until intentional Pay Now submission' })] })] }),
                ],
              }),
            ],
          }),

          // 4. Complete Scenario Inventory Matrix
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '3. Complete Scenario Inventory & Verification Matrix',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'The following matrix details every scenario extracted directly from features/card-payment-validation.feature, including inputs, expected assertions, observed behavior, and automation status:',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                shading: { fill: darkNavy, type: ShadingType.CLEAR, color: 'auto' },
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ID', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Scenario Name & Category', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Input / Condition', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expected Assertion', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Actual Observed Behavior', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF' })] })] }),
                ],
              }),
              // PAY-001
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-001', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Valid 16-digit card (Baseline)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card: 4375467100366475\nExp: 12/2028\nCVV: 123\nName: John Doe' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now button active & clickable' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-002
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-002', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '15-digit card (Boundary)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card: 437546710036647 (15 digits)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now disabled; submission blocked' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-003
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-003', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Over-length >16 digits (Boundary)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card: 437546710036647599 (18 digits)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Form accepts typing >16 digits but suppresses Pay Now' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-004
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-004', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Empty card number (Negative)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card: [empty]\nExp: 12/2028, CVV: 123' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now disabled' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-005
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-005', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Alpha input (Sanitization)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card: "abcdefghijklmnop"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Field empty & Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Letters rejected on keystroke; field stays empty' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-006
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-006', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mixed alphanumeric (Sanitization)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card: "4375abcd1003%^&*"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Displays "4375 1003", Pay DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Non-digits stripped; formatted with space' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-007
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-007', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Dynamic digit backspace (Interaction)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '16-digit -> Backspace 1 -> Retype digit' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Enabled -> Disabled -> Enabled' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Instant state recalculation on keystroke' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-010
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-010', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Empty expiry field (Negative)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card: 16 digits, Expiry: [empty]' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now disabled' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-012
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-012', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Month 00 auto-normalization' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expiry typed: "00 / 2028"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Field displays "01 / 2028"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '00 automatically coerced to valid month 01' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-013
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-013', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Month >12 auto-normalization' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expiry typed: "15 / 2028"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Field displays "12 / 2028"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Months >12 capped/coerced to month 12' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-014
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-014', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Valid calendar months (5 examples)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Months: 01, 09, 10, 11, 12' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED for all valid months' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'All 5 valid calendar month boundaries enable Pay Now' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-015
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-015', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Incomplete 2-digit year (Negative)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expiry typed: "12 / 20"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Error msg shown; Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Displays "Enter valid Month(MM) / Year(YYYY)"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-016
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-016', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expiry year 0000 (Req Validation)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expiry typed: "12 / 0000"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED (Observed)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Form accepts 0000 without client-side blocking' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS*', bold: true, color: 'D97706' })] })] }),
                ],
              }),
              // PAY-017
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-017', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Past expired year 2020 (Req Validation)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expiry typed: "12 / 2020"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED (Observed)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Form accepts past year without client validation error' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS*', bold: true, color: 'D97706' })] })] }),
                ],
              }),
              // PAY-018
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-018', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Valid future years (4 examples)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Years: 2026, 2027, 2030, 2099' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED for all valid years' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'All 4 future year variations enable Pay Now' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-019
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-019', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Single-digit CVV "1" (Req Validation)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CVV typed: "1"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED (Observed)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '1-digit CVV satisfies client-side required rule' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS*', bold: true, color: 'D97706' })] })] }),
                ],
              }),
              // PAY-020
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-020', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Two-digit CVV "12" (Req Validation)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CVV typed: "12"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED (Observed)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '2-digit CVV satisfies client-side required rule' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS*', bold: true, color: 'D97706' })] })] }),
                ],
              }),
              // PAY-021
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-021', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Standard 3-digit CVV "123"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CVV typed: "123"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Standard 3-digit CVV enables Pay Now' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-022
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-022', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Over-length CVV >3 digits' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CVV typed: "1234"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Field displays "123"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '4th digit truncated; field enforces 3-char max' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-023
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-023', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Non-numeric CVV (Sanitization)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CVV typed: "abc"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Field empty & Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Letters rejected on keystroke; field stays empty' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-024
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-024', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Dynamic CVV backspace (Interaction)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CVV 123 -> Backspace 3 -> Retype 123' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Enabled -> Disabled -> Enabled' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Instant state recalculation on keystroke' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-025
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-025', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Empty cardholder name (Negative)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name: [empty], other fields valid' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now disabled' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-026
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-026', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Single character name (Boundary)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name: "A"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now DISABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Single character fails min-length check' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-027
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-027', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Special char stripping (Sanitization)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name: "John 123!@# Doe"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Field displays "John  Doe"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Numbers and special symbols filtered on input' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
              // PAY-028
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAY-028', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Multi-word with spaces (Baseline)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name: "   John Michael Doe   "' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pay Now ENABLED' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Leading/trailing whitespace trimmed; enables Pay' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PASS', bold: true, color: '16A34A' })] })] }),
                ],
              }),
            ],
          }),

          // 5. Actual Execution Results
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '4. Actual Execution Metrics & Results Breakdown',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'The table below isolates the execution metrics of the Card Details Regression Suite from the combined workspace test runs:',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                shading: { fill: darkNavy, type: ShadingType.CLEAR, color: 'auto' },
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card Details Suite (Isolated)', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Combined Regression Run Total', bold: true, color: 'FFFFFF' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Defined Scenarios', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '25 distinct scenario blocks' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '39 feature scenarios' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Scenario Executions (with Outlines)', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '33 scenario executions (incl. 9 Outline examples)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '47 total scenario executions' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Steps Executed', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '211 steps' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '364 steps' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Passed Scenarios', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '33 / 33 passed (100% assertion reproduction)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '44-45 / 47 passed' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Execution Duration', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '6m 42s' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '12m 06s' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Included Feature Suites', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card Payment Validation only' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card Details (33) + Pincode ETA (1) + Shopping Cart (13)' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Postman Requests Captured', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '180+ network requests' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '454 captured (304 deduplicated)' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Postman Requests Matched', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Matched against local Seller API collection' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '2 matched (auth & pincode eta check)' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Postman Assertions Status', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '4 / 4 passed (100%)' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '4 / 4 passed (0 failed)' })] })] }),
                ],
              }),
            ],
          }),

          // 6. Confirmed Observations & Findings
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '5. Confirmed Observations & Findings',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'During live test execution against the Sangeetha Mobiles checkout payment page, the following concrete field behaviors were confirmed:',
              }),
            ],
          }),

          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: '16-Digit Card Rule: ', bold: true }),
              new TextRun({ text: 'Exactly 16 digits enable the Pay Now button when expiry, CVV, and name are present.' }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: '15-Digit Boundary: ', bold: true }),
              new TextRun({ text: '15 digits keep Pay Now disabled. No inline validation message appears until submission attempt.' }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: 'Overlength Card Behavior (>16 digits): ', bold: true }),
              new TextRun({ text: 'The card input field does NOT restrict typing to 16 digits (allows typing 17, 18, or more digits), but the client state logic immediately suppresses / disables Pay Now once digit count exceeds 16.' }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: 'Expiry Month Normalization: ', bold: true }),
              new TextRun({ text: 'Entering month "00" is automatically corrected to "01". Entering any month > 12 (e.g., "15") is automatically clamped to "12".' }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: 'Expiry Year Permissiveness: ', bold: true }),
              new TextRun({ text: 'Entering year "0000" or an expired year like "2020" enables Pay Now without any client-side block.' }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: 'CVV Length Permissiveness: ', bold: true }),
              new TextRun({ text: 'Entering 1 digit (e.g. "1") or 2 digits (e.g. "12") enables Pay Now. Typing >3 digits is truncated to 3 digits.' }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: 'Cardholder Name Sanitization: ', bold: true }),
              new TextRun({ text: 'Single-character names keep Pay Now disabled (minimum 2 characters required). Numbers and special characters are stripped in real time.' }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: 'Dynamic State Recalculation: ', bold: true }),
              new TextRun({ text: 'Deleting any single required character immediately flips Pay Now to disabled without requiring form blur or page refresh.' }),
            ],
          }),

          // 7. Classification of Findings
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '6. Classification of Findings',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                shading: { fill: darkNavy, type: ShadingType.CLEAR, color: 'auto' },
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Finding / Behavior Description', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Risk / Recommendation', bold: true, color: 'FFFFFF' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Expected Behavior', bold: true, color: '16A34A' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '• 16-digit card validation\n• Alpha filtering in card/CVV\n• Real-time Pay Now enabling/disabling\n• 3-digit CVV max enforcement' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Standard ecommerce payment flow behavior functioning as intended.' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Potential Defect / UX Discrepancy', bold: true, color: 'DC2626' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '• Overlength card input allowed (>16 digits typed) without maxLength attribute on input element.' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Add `maxlength="19"` (16 digits + 3 spaces) to prevent user confusion when Pay Now disables.' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Requirement Validation Needed', bold: true, color: 'D97706' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '• Expiry year 0000 accepted on client side\n• Past expired years (e.g. 2020) accepted on client side\n• 1-digit and 2-digit CVV accepted on client side' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Product team must confirm if client-side validation should block expired dates and short CVVs before payment gateway submission.' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Observation Only', bold: true, color: '2563EB' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '• Auto-normalization of month 00 -> 01 and 15 -> 12\n• Space formatting "4375 1003"' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Built-in UI convenience features providing smooth user experience.' })] })] }),
                ],
              }),
            ],
          }),

          // 8. API / Network Evidence
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '7. API & Network Evidence',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'Real network traffic captured by Postman Playwright network proxy during checkout payment interaction (all sensitive credentials and auth tokens masked):',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                shading: { fill: darkNavy, type: ShadingType.CLEAR, color: 'auto' },
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'UI Trigger / Action', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Endpoint & Method', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Request / Purpose', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Postman Matching', bold: true, color: 'FFFFFF' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Page Load / Checkout' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'POST /b/api/payment-page-details-v4' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fetches payment options, bank offers, BIN discount matrices' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '200 OK' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Captured by Proxy' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Summary Calculation' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'POST /b/cart-summary' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Calculates subtotal, delivery charges, discounts' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '200 OK' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Captured by Proxy' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Session Auth Verification' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'POST /b/api/generate-auth' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Validates customer active bearer authentication' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '200 OK' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Matched & Verified' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Card Input Typing' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '[Client-Side Isolated]' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No premature authorization API calls fired during form input' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'N/A' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Correct Isolation' })] })] }),
                ],
              }),
            ],
          }),

          // 9. Representative BDD Evidence
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '8. Representative BDD Gherkin Specification',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'Exact Gherkin syntax from features/card-payment-validation.feature demonstrating the business-readable specification layer:',
              }),
            ],
          }),

          new Paragraph({
            shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({
                text: `Feature: Card Payment Form Validation & State Verification\n\n` +
                  `  Background:\n` +
                  `    Given I am on the checkout payment page\n\n` +
                  `  @regression @card-number @PAY-001 @baseline\n` +
                  `  Scenario: Valid 16-digit card with valid expiry and 3-digit CVV enables Pay Now\n` +
                  `    When I enter a card number "4375467100366475"\n` +
                  `    And I enter an expiry date "12 / 2028"\n` +
                  `    And I enter a CVV "123"\n` +
                  `    And I enter the cardholder name "John Doe"\n` +
                  `    Then the Pay Now button should be enabled\n\n` +
                  `  @regression @card-number @PAY-007 @interaction\n` +
                  `  Scenario: Deleting digits from a valid 16-digit card dynamically disables Pay Now\n` +
                  `    When I enter a card number "4375467100366475"\n` +
                  `    And I enter an expiry date "12 / 2028"\n` +
                  `    And I enter a CVV "123"\n` +
                  `    And I enter the cardholder name "John Doe"\n` +
                  `    Then the Pay Now button should be enabled\n` +
                  `    When I delete 1 digit from the card number\n` +
                  `    Then the Pay Now button should be disabled\n` +
                  `    When I enter a card number "4375467100366475"\n` +
                  `    Then the Pay Now button should be enabled\n\n` +
                  `  @regression @expiry-month @PAY-013 @normalization\n` +
                  `  Scenario: Expiry month greater than 12 is auto-normalized to month 12\n` +
                  `    When I enter an expiry date "15 / 2028"\n` +
                  `    Then the expiry date field should display "12 / 2028"\n\n` +
                  `  @regression @expiry-year @PAY-016 @observation @requirement-validation-needed\n` +
                  `  Scenario: Expiry year 0000 is currently accepted and enables Pay Now\n` +
                  `    When I enter a card number "4375467100366475"\n` +
                  `    And I enter an expiry date "12 / 0000"\n` +
                  `    And I enter a CVV "123"\n` +
                  `    And I enter the cardholder name "John Doe"\n` +
                  `    Then the Pay Now button should be enabled\n\n` +
                  `  @regression @cvv @PAY-019 @observation @requirement-validation-needed\n` +
                  `  Scenario: Single digit CVV is currently accepted and enables Pay Now\n` +
                  `    When I enter a card number "4375467100366475"\n` +
                  `    And I enter an expiry date "12 / 2028"\n` +
                  `    And I enter a CVV "1"\n` +
                  `    And I enter the cardholder name "John Doe"\n` +
                  `    Then the Pay Now button should be enabled\n`,
                font: 'Consolas',
                size: 18,
              }),
            ],
          }),

          // 10. Integration Architecture
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '9. Integration Architecture Overview',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'The test execution strictly adheres to the established non-destructive multi-layer framework:',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            shading: { fill: lightGray, type: ShadingType.CLEAR, color: 'auto' },
            spacing: { before: 100, after: 150 },
            children: [
              new TextRun({
                text: 'Cucumber BDD (.feature)\n' +
                  '       ↓\n' +
                  'Playwright Step Definitions & Helpers\n' +
                  '       ↓\n' +
                  'Real Chromium Browser (Sangeetha UI)\n' +
                  '       ↓\n' +
                  'Real Browser Network Traffic Capture\n' +
                  '       ↓\n' +
                  'Postman CLI & Seller API Collection Matching\n' +
                  '       ↓\n' +
                  'Postman pm.test Assertions → PASS / FAIL\n',
                bold: true,
                font: 'Consolas',
                size: 20,
              }),
            ],
          }),

          // 11. Important Distinction & Quality Notice
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: '10. Important Engineering & Quality Distinction',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            shading: { fill: highlightBg, type: ShadingType.CLEAR, color: 'auto' },
            spacing: { before: 100, after: 200 },
            children: [
              new TextRun({
                text: 'IMPORTANT QA DISTINCTION:\n',
                bold: true,
                color: 'B91C1C',
                size: 22,
              }),
              new TextRun({
                text: 'A passing automation result means the test successfully reproduced and asserted the observed application behavior. It does NOT automatically mean the observed application behavior is correct or conforms to ideal banking/ecommerce specifications.\n\n',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: 'Specifically, scenarios PAY-016 (year 0000 enabling Pay Now), PAY-017 (expired year 2020 enabling Pay Now), and PAY-019/PAY-020 (1-digit and 2-digit CVV enabling Pay Now) pass because the automation accurately verifies that the current client-side application allows these inputs. These cases are flagged for formal Product Requirement Validation rather than silent acceptance.',
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(process.cwd(), 'Card_Details_Regression_Report_Source.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`[Report Source] Successfully generated ${outputPath} (${buffer.length} bytes)`);
}

generateCardDetailsReportSourceDoc().catch(err => {
  console.error('[Report Source] Error generating docx:', err);
  process.exit(1);
});
