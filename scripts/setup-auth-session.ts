import * as fs from 'fs';
import * as path from 'path';

/**
 * setup-auth-session.ts
 * Safely initializes auth-state-sangeetha.json from CI secret environment variable (AUTH_STATE_JSON or AUTH_STATE_BASE64)
 * without committing credentials to Git or leaking sensitive data in logs.
 */
function setupAuthSession() {
  const targetPath = path.resolve(process.cwd(), 'auth-state-sangeetha.json');

  if (fs.existsSync(targetPath)) {
    const stats = fs.statSync(targetPath);
    if (stats.size > 10) {
      console.log('ℹ️  Local auth-state-sangeetha.json is present on disk.');
      return;
    }
  }

  const rawJson = process.env.AUTH_STATE_JSON;
  const base64Json = process.env.AUTH_STATE_BASE64;

  if (rawJson && rawJson.trim().length > 0) {
    try {
      // Validate valid JSON structure
      const parsed = JSON.parse(rawJson);
      fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log('✅ Stored auth session initialized securely from AUTH_STATE_JSON secret.');
      return;
    } catch (e: any) {
      console.error('❌ Failed to parse AUTH_STATE_JSON secret as valid JSON.');
      process.exit(1);
    }
  }

  if (base64Json && base64Json.trim().length > 0) {
    try {
      const decoded = Buffer.from(base64Json, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log('✅ Stored auth session initialized securely from AUTH_STATE_BASE64 secret.');
      return;
    } catch (e: any) {
      console.error('❌ Failed to decode/parse AUTH_STATE_BASE64 secret.');
      process.exit(1);
    }
  }

  console.warn('⚠️  Neither AUTH_STATE_JSON nor AUTH_STATE_BASE64 secret found, and auth-state-sangeetha.json is not present on disk.');
  console.warn('   GitHub Actions repository secret AUTH_STATE_BASE64/AUTH_STATE_JSON is missing.');
  console.warn('   Authenticated tests will rely on session-health probe to validate precondition.');
}

setupAuthSession();
