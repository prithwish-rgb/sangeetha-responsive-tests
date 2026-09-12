/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FIGMA RIGOROUS PARITY ENGINE & ASSERTION MODEL
 * Source: Sangeetha Figma Design Systems
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { Page } from '@playwright/test';

export type AssertionProperty =
  | 'visibility'
  | 'content'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'lineHeight'
  | 'letterSpacing'
  | 'color'
  | 'backgroundColor'
  | 'width'
  | 'height'
  | 'padding'
  | 'borderRadius'
  | 'shadow'
  | 'asset'
  | 'position'
  | 'responsive';

export type AssertionStatus = 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'DYNAMIC_VARIATION';

export interface PropertyAssertion {
  property: AssertionProperty;
  expected: unknown;
  actual: unknown;
  status: AssertionStatus;
  toleranceApplied?: string;
  difference?: string;
}

export type NodeClassification =
  | 'PASS'
  | 'MISSING'
  | 'STYLE_MISMATCH'
  | 'TYPOGRAPHY_MISMATCH'
  | 'LAYOUT_MISMATCH'
  | 'CONTENT_MISMATCH'
  | 'RESPONSIVE_MISMATCH'
  | 'DYNAMIC_CONTENT_VARIATION'
  | 'MAPPING_UNCERTAIN';

export interface NodeEvaluationResult {
  figmaNodeId: string;
  name: string;
  category: 'TEXT' | 'SECTION' | 'IMAGE' | 'CARD' | 'BUTTON';
  contentType: 'STATIC_DESIGN_CONTENT' | 'DYNAMIC_CONTENT';
  stagingSelector: string | null;
  overallStatus: 'PASS' | 'FAIL' | 'DYNAMIC_CONTENT_VARIATION' | 'MAPPING_UNCERTAIN';
  classification: NodeClassification;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  assertions: PropertyAssertion[];
  developerAction?: string;
}

export interface ParitySummaryMetrics {
  totalFigmaNodes: number;
  nodesMapped: number;
  nodesEvaluated: number;
  passedCount: number;
  missingCount: number;
  designMismatchCount: number;
  dynamicContentVariationCount: number;
  mappingUncertainCount: number;
  totalFailures: number;
  inventoryCoverage: string;
  rawFigmaParity: string;
  designParityExcludingDynamic: string;
  byClassification: {
    MISSING: number;
    TYPOGRAPHY_MISMATCH: number;
    STYLE_MISMATCH: number;
    LAYOUT_MISMATCH: number;
    CONTENT_MISMATCH: number;
    RESPONSIVE_MISMATCH: number;
    DYNAMIC_CONTENT_VARIATION: number;
    MAPPING_UNCERTAIN: number;
  };
  totalAssertionsExecuted: number;
  assertionsPassed: number;
  assertionsFailed: number;
}

export class RigorousFigmaParityEngine {
  private results: Map<string, NodeEvaluationResult> = new Map();
  private extraOnStaging: Array<{ name: string; description: string }> = [];

  recordNodeResult(result: NodeEvaluationResult) {
    this.results.set(result.figmaNodeId, result);
  }

  recordExtraOnStaging(name: string, description: string) {
    this.extraOnStaging.push({ name, description });
  }

  calculateMetrics(): ParitySummaryMetrics {
    const all = Array.from(this.results.values());
    const total = all.length;
    const mapped = all.filter(r => r.stagingSelector !== null && r.classification !== 'MAPPING_UNCERTAIN').length;
    const passed = all.filter(r => r.overallStatus === 'PASS').length;
    const missing = all.filter(r => r.classification === 'MISSING').length;
    const dynamicVar = all.filter(r => r.classification === 'DYNAMIC_CONTENT_VARIATION').length;
    const mappingUncertain = all.filter(r => r.classification === 'MAPPING_UNCERTAIN').length;

    const typoMismatch = all.filter(r => r.classification === 'TYPOGRAPHY_MISMATCH').length;
    const styleMismatch = all.filter(r => r.classification === 'STYLE_MISMATCH').length;
    const layoutMismatch = all.filter(r => r.classification === 'LAYOUT_MISMATCH').length;
    const contentMismatch = all.filter(r => r.classification === 'CONTENT_MISMATCH').length;
    const responsiveMismatch = all.filter(r => r.classification === 'RESPONSIVE_MISMATCH').length;

    const designMismatch = typoMismatch + styleMismatch + layoutMismatch + contentMismatch + responsiveMismatch;
    const totalFailures = missing + designMismatch;

    // Strict Mathematical Reconciliations
    const inventoryAuditCoverage = total > 0 ? `${((total / total) * 100).toFixed(1)}%` : '0%';
    const stagingMappingRate = total > 0 ? `${((mapped / total) * 100).toFixed(1)}%` : '0%';
    const rawFigmaParity = total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '0%';
    const staticDenominator = total - dynamicVar;
    const designParityExcludingDynamic = staticDenominator > 0 ? `${((passed / staticDenominator) * 100).toFixed(1)}%` : '0%';

    // Assertion level counts
    let totalAssertions = 0;
    let assertionsPassed = 0;
    let assertionsFailed = 0;
    all.forEach(r => {
      r.assertions.forEach(a => {
        if (a.status !== 'NOT_APPLICABLE') {
          totalAssertions++;
          if (a.status === 'PASS' || a.status === 'DYNAMIC_VARIATION') assertionsPassed++;
          if (a.status === 'FAIL') assertionsFailed++;
        }
      });
    });

    return {
      totalFigmaNodes: total,
      nodesMapped: mapped,
      nodesEvaluated: total,
      passedCount: passed,
      missingCount: missing,
      designMismatchCount: designMismatch,
      dynamicContentVariationCount: dynamicVar,
      mappingUncertainCount: mappingUncertain,
      totalFailures: totalFailures,
      inventoryAuditCoverage,
      stagingMappingRate,
      rawFigmaParity,
      designParityExcludingDynamic,
      byClassification: {
        MISSING: missing,
        TYPOGRAPHY_MISMATCH: typoMismatch,
        STYLE_MISMATCH: styleMismatch,
        LAYOUT_MISMATCH: layoutMismatch,
        CONTENT_MISMATCH: contentMismatch,
        RESPONSIVE_MISMATCH: responsiveMismatch,
        DYNAMIC_CONTENT_VARIATION: dynamicVar,
        MAPPING_UNCERTAIN: mappingUncertain,
      },
      totalAssertionsExecuted: totalAssertions,
      assertionsPassed,
      assertionsFailed,
    };
  }

  generateReport(figmaMetadata: { fileKey: string; rootNodeId: string; rootNodeName: string; viewport: string; stagingUrl: string }) {
    const metrics = this.calculateMetrics();
    const allResults = Array.from(this.results.values());

    return {
      figmaDesign: {
        figmaFile: figmaMetadata.fileKey,
        rootNodeId: figmaMetadata.rootNodeId,
        rootNodeName: figmaMetadata.rootNodeName,
        targetViewport: figmaMetadata.viewport,
        stagingUrl: figmaMetadata.stagingUrl,
      },
      metrics,
      reconciliationCheck: {
        formula: 'PASS + MISSING + DESIGN_MISMATCH + DYNAMIC_CONTENT_VARIATION + MAPPING_UNCERTAIN === TOTAL_FIGMA_NODES',
        sum: metrics.passedCount + metrics.missingCount + metrics.designMismatchCount + metrics.dynamicContentVariationCount + metrics.mappingUncertainCount,
        total: metrics.totalFigmaNodes,
        reconciled: (metrics.passedCount + metrics.missingCount + metrics.designMismatchCount + metrics.dynamicContentVariationCount + metrics.mappingUncertainCount) === metrics.totalFigmaNodes,
      },
      failures: {
        missingNodes: allResults.filter(r => r.classification === 'MISSING'),
        typographyMismatches: allResults.filter(r => r.classification === 'TYPOGRAPHY_MISMATCH'),
        styleMismatches: allResults.filter(r => r.classification === 'STYLE_MISMATCH'),
        layoutMismatches: allResults.filter(r => r.classification === 'LAYOUT_MISMATCH'),
        contentMismatches: allResults.filter(r => r.classification === 'CONTENT_MISMATCH'),
        responsiveMismatches: allResults.filter(r => r.classification === 'RESPONSIVE_MISMATCH'),
        mappingUncertain: allResults.filter(r => r.classification === 'MAPPING_UNCERTAIN'),
      },
      dynamicVariations: allResults.filter(r => r.classification === 'DYNAMIC_CONTENT_VARIATION'),
      passedNodes: allResults.filter(r => r.overallStatus === 'PASS'),
      extraOnStaging: this.extraOnStaging,
    };
  }
}
