import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, devices, Browser } from '@playwright/test';
import { CustomWorld } from './world';
import fs from 'fs';
import path from 'path';

setDefaultTimeout(180000);

let globalBrowser: Browser;
const cumulativeSuites = new Map<string, any>();
const runStartTime = new Date().toISOString();
let totalExpected = 0;
let totalUnexpected = 0;

BeforeAll(async () => {
  const isHeadless = process.env.HEADLESS !== 'false' && process.env.HEADED !== 'true';
  globalBrowser = await chromium.launch({
    headless: isHeadless,
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO, 10) : (isHeadless ? 0 : 600),
  });

  // Ensure directories exist
  fs.mkdirSync(path.resolve('reports'), { recursive: true });
  fs.mkdirSync(path.resolve('test-results/cucumber-traces'), { recursive: true });
  fs.mkdirSync(path.resolve('videos/cucumber-demo'), { recursive: true });
  fs.mkdirSync(path.resolve('screenshots/failures'), { recursive: true });
});

AfterAll(async () => {
  if (globalBrowser) {
    await globalBrowser.close();
  }
  console.log(`[Cucumber Hook] Run complete. Total Scenarios: ${totalExpected + totalUnexpected} (Passed: ${totalExpected}, Failed: ${totalUnexpected})`);
});

Before(async function (this: CustomWorld, scenario) {
  this.startTime = Date.now();
  this.browser = globalBrowser;
  const videosDir = path.resolve('videos/cucumber-demo');

  const sangeethaAuthPath = path.resolve('auth-state-sangeetha.json');
  const defaultAuthPath = path.resolve('auth-state.json');
  const authStatePath = fs.existsSync(sangeethaAuthPath) ? sangeethaAuthPath : (fs.existsSync(defaultAuthPath) ? defaultAuthPath : undefined);
  
  this.context = await this.browser.newContext({
    ...devices['Pixel 5'],
    storageState: authStatePath,
    recordVideo: {
      dir: videosDir,
      size: { width: 393, height: 851 },
    },
  });

  // Enable Playwright network trace capture
  await this.context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });

  this.page = await this.context.newPage();

  if (authStatePath && fs.existsSync(authStatePath)) {
    try {
      const authData = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
      if (authData?.origins?.[0]?.localStorage) {
        await this.page.addInitScript((entries) => {
          entries.forEach((item: any) => {
            try { localStorage.setItem(item.name, item.value); } catch (e) {}
          });
        }, authData.origins[0].localStorage);
      }
    } catch (e) {}
  }
});

After(async function (this: CustomWorld, scenario) {
  const duration = this.startTime ? Date.now() - this.startTime : 0;
  const isPassed = scenario.result?.status === 'PASSED';
  const sanitizedName = scenario.pickle.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const traceFileName = `trace_${sanitizedName}_${Date.now()}.zip`;
  const tracePath = path.join(path.resolve('test-results/cucumber-traces'), traceFileName);

  // Capture screenshot on failure
  if (!isPassed && this.page) {
    const failureScreenshotPath = path.join(path.resolve('screenshots/failures'), `fail_${sanitizedName}_${Date.now()}.png`);
    try {
      await this.page.screenshot({ path: failureScreenshotPath, fullPage: true });
      console.log(`[Cucumber Hook] 📸 Failure screenshot captured: ${failureScreenshotPath}`);
    } catch (e) {}
  }

  if (this.context) {
    await this.context.tracing.stop({ path: tracePath }).catch(() => {});
  }

  const pageVideo = this.page ? this.page.video() : null;

  if (this.page) {
    await this.page.close().catch(() => {});
  }
  if (this.context) {
    await this.context.close().catch(() => {});
  }

  let videoFilePath = '';
  if (pageVideo) {
    try {
      videoFilePath = await pageVideo.path();
      if (isPassed && process.env.RETAIN_ALL_VIDEOS !== 'true') {
        // Clean up passing video in scheduled/CI runs to preserve disk space
        try { fs.unlinkSync(videoFilePath); } catch (e) {}
      } else {
        console.log(`[Cucumber Hook] Browser video saved: ${videoFilePath}`);
      }
    } catch (e) {}
  }

  // Update cumulative counters
  if (isPassed) {
    totalExpected++;
  } else {
    totalUnexpected++;
  }

  // Aggregate scenario results cumulatively by feature file
  const featureUri = scenario.gherkinDocument?.uri || 'features/unknown.feature';
  const featureFile = path.basename(featureUri);

  if (!cumulativeSuites.has(featureFile)) {
    cumulativeSuites.set(featureFile, {
      title: featureFile,
      file: featureUri,
      specs: [],
    });
  }

  const suite = cumulativeSuites.get(featureFile);
  suite.specs.push({
    title: scenario.pickle.name,
    ok: isPassed,
    tags: scenario.pickle.tags.map((t) => t.name),
    tests: [
      {
        timeout: 60000,
        expectedStatus: 'passed',
        projectId: 'chromium',
        projectName: 'chromium',
        results: [
          {
            workerIndex: 0,
            status: isPassed ? 'passed' : 'failed',
            duration,
            startTime: new Date(this.startTime || Date.now()).toISOString(),
            attachments: [
              {
                name: 'trace',
                contentType: 'application/zip',
                path: tracePath,
              },
            ],
          },
        ],
        status: isPassed ? 'expected' : 'unexpected',
      },
    ],
  });

  // Write cumulative Playwright report for Postman CLI and reporting ingestion
  const cumulativeReport = {
    config: {
      rootDir: path.resolve('tests'),
      outputDir: path.resolve('test-results'),
      projects: [
        {
          id: 'chromium',
          name: 'chromium',
          outputDir: path.resolve('test-results'),
        },
      ],
    },
    suites: Array.from(cumulativeSuites.values()),
    stats: {
      startTime: runStartTime,
      duration: Date.now() - new Date(runStartTime).getTime(),
      expected: totalExpected,
      unexpected: totalUnexpected,
      flaky: 0,
      skipped: 0,
    },
  };

  fs.writeFileSync(
    path.resolve('test-results/playwright-report.json'),
    JSON.stringify(cumulativeReport, null, 2),
    'utf8'
  );
});
