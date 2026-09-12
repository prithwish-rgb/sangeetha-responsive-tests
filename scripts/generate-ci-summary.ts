import * as fs from 'fs';
import * as path from 'path';

interface StepResult {
  status: string;
  duration?: number;
}

interface ScenarioElement {
  keyword: string;
  name: string;
  steps: Array<{
    result?: StepResult;
  }>;
}

interface FeatureReport {
  name: string;
  elements: ScenarioElement[];
}

function generateCiSummary() {
  const tier = process.argv[2] || 'Automated Regression';
  const timestampUtc = new Date().toISOString();
  const timestampIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().replace('Z', '+05:30');

  const cucumberReportPath = path.resolve(process.cwd(), 'reports/cucumber-report.json');
  const playwrightReportPath = path.resolve(process.cwd(), 'test-results/playwright-report.json');

  let totalScenarios = 0;
  let passedScenarios = 0;
  let failedScenarios = 0;
  let skippedScenarios = 0;
  let totalSteps = 0;
  let passedSteps = 0;
  let failedSteps = 0;
  let skippedSteps = 0;
  let totalDurationMs = 0;
  const suiteSummaries: Array<{ name: string; total: number; passed: number; failed: number }> = [];

  if (fs.existsSync(cucumberReportPath)) {
    try {
      const data: FeatureReport[] = JSON.parse(fs.readFileSync(cucumberReportPath, 'utf-8'));
      for (const feature of data) {
        let featPassed = 0;
        let featFailed = 0;
        let featTotal = 0;

        for (const el of feature.elements || []) {
          if (el.keyword === 'Scenario') {
            featTotal++;
            totalScenarios++;
            let scenarioPassed = true;
            let scenarioFailed = false;

            for (const st of el.steps || []) {
              if (st.result) {
                totalSteps++;
                totalDurationMs += (st.result.duration || 0) / 1000000;
                if (st.result.status === 'passed') {
                  passedSteps++;
                } else if (st.result.status === 'failed') {
                  failedSteps++;
                  scenarioFailed = true;
                  scenarioPassed = false;
                } else {
                  skippedSteps++;
                  scenarioPassed = false;
                }
              }
            }

            if (scenarioFailed) {
              failedScenarios++;
              featFailed++;
            } else if (scenarioPassed) {
              passedScenarios++;
              featPassed++;
            } else {
              skippedScenarios++;
            }
          }
        }
        suiteSummaries.push({
          name: feature.name || 'Unnamed Feature',
          total: featTotal,
          passed: featPassed,
          failed: featFailed
        });
      }
    } catch (e: any) {
      console.error('Error parsing cucumber-report.json:', e.message);
    }
  } else if (fs.existsSync(playwrightReportPath)) {
    try {
      const pwData = JSON.parse(fs.readFileSync(playwrightReportPath, 'utf-8'));
      totalScenarios = pwData.stats?.expected + pwData.stats?.unexpected + pwData.stats?.skipped || 0;
      passedScenarios = pwData.stats?.expected || 0;
      failedScenarios = pwData.stats?.unexpected || 0;
      skippedScenarios = pwData.stats?.skipped || 0;
      totalDurationMs = pwData.stats?.duration || 0;
    } catch (e: any) {
      console.error('Error parsing playwright-report.json:', e.message);
    }
  }

  const durationSec = (totalDurationMs / 1000).toFixed(1);
  const statusEmoji = failedScenarios === 0 && totalScenarios > 0 ? '✅ PASSED' : (totalScenarios === 0 ? '⚠️ NO TESTS' : '❌ FAILED');

  const summaryMarkdown = `
# 🚀 Regression Execution Summary — ${tier}

| Property | Value |
| :--- | :--- |
| **Execution Tier** | **${tier}** |
| **Status** | **${statusEmoji}** |
| **UTC Timestamp** | \`${timestampUtc}\` |
| **IST Timestamp** | \`${timestampIst}\` |
| **Duration** | \`${durationSec}s\` |
| **Total Scenarios** | **${totalScenarios}** |
| **Passed Scenarios** | 🟢 **${passedScenarios}** |
| **Failed Scenarios** | 🔴 **${failedScenarios}** |
| **Skipped Scenarios** | 🟡 **${skippedScenarios}** |
| **Total Steps** | **${totalSteps}** (Passed: ${passedSteps}, Failed: ${failedSteps}, Skipped: ${skippedSteps}) |

### 📦 Preserved Build Artifacts
- ✅ **Cucumber HTML Report**: \`reports/cucumber-report.html\`
- ✅ **Cucumber JSON Data**: \`reports/cucumber-report.json\`
- ✅ **Playwright Trace/Results**: \`test-results/playwright-report.json\`
- ✅ **Failure Evidence**: \`screenshots/failures/\` (on scenario failure) & \`videos/\` (on failure)
- ✅ **Postman Integration**: \`pm-results/\` (for extended tier)

${suiteSummaries.length > 0 ? `
### 📊 Feature Suite Breakdown
| Feature Suite | Total | Passed | Failed |
| :--- | :---: | :---: | :---: |
${suiteSummaries.map(s => `| ${s.name} | ${s.total} | ${s.passed} | ${s.failed} |`).join('\n')}
` : ''}
`;

  console.log(summaryMarkdown);

  const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryPath) {
    try {
      fs.appendFileSync(stepSummaryPath, summaryMarkdown, 'utf-8');
      console.log('✅ Successfully wrote to GITHUB_STEP_SUMMARY');
    } catch (err: any) {
      console.error('Failed writing to GITHUB_STEP_SUMMARY:', err.message);
    }
  }
}

generateCiSummary();
