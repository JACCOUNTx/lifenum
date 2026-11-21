#!/usr/bin/env node
/**
 * iOS release helper for the LifeNum App Store listing.
 *
 *   node scripts/asc-release.mjs status
 *   node scripts/asc-release.mjs bump 1.2.0
 *   node scripts/asc-release.mjs submit 1.2.0 --whats-new-file store/whats-new-1.2.0.txt
 *   node scripts/asc-release.mjs submit 1.2.0 --dry-run
 *
 * `submit` expects the matching build to be already uploaded by the
 * `.github/workflows/ios.yml` workflow (triggered by pushing
 * `.github/ios-trigger.txt`). It creates the App Store version, copies the
 * previous version's metadata and review details, uploads the screenshots in
 * store/ios-screenshots, attaches the build and submits the app version plus
 * any subscription versions that are not approved yet.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH =
  process.env.ASC_KEY_PATH ?? path.join(ROOT, '.keys', 'ios', 'AuthKey_QND8GYRV9M.p8');
const KEY_ID = process.env.ASC_KEY_ID ?? 'QND8GYRV9M';
const ISSUER = process.env.ASC_ISSUER_ID ?? '9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const APP_ID = process.env.ASC_APP_ID ?? '6825182736';
const SCREENSHOT_DIR = path.join(ROOT, 'store', 'ios-screenshots');
const SCREENSHOT_SETS = [
  { displayType: 'APP_IPHONE_67', files: ['iphone-1.png', 'iphone-2.png', 'iphone-3.png'] },
  { displayType: 'APP_IPAD_PRO_3GEN_129', files: ['ipad-1.png'] },
];

const args = process.argv.slice(2);
const command = args[0];
const hasFlag = (name) => args.includes(`--${name}`);
const flagValue = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const positional = args.filter((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--whats-new-file' && args[index - 1] !== '--build');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function loadKey() {
  if (!fs.existsSync(KEY_PATH)) {
    fail(`App Store Connect API key not found: ${KEY_PATH}\nSet ASC_KEY_PATH to your AuthKey_*.p8 file.`);
  }
  return fs.readFileSync(KEY_PATH, 'utf8');
}

function jwt() {
  const key = loadKey();
  const now = Math.floor(Date.now() / 1000);
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({
    iss: ISSUER,
    iat: now,
    exp: now + 900,
    aud: 'appstoreconnect-v1',
  })}`;
  return `${data}.${crypto
    .sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' })
    .toString('base64url')}`;
}

async function api(pathname, options = {}) {
  const response = await fetch(`https://api.appstoreconnect.apple.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body, ok: response.status < 300 };
}

async function apiOrFail(pathname, options = {}, context = '') {
  const result = await api(pathname, options);
  if (!result.ok) {
    fail(
      `${context || pathname} failed (${result.status}):\n${JSON.stringify(result.body).slice(0, 1200)}`,
    );
  }
  return result.body;
}

async function listVersions() {
  const body = await apiOrFail(
    `/v1/apps/${APP_ID}/appStoreVersions?limit=20&fields[appStoreVersions]=versionString,appStoreState,createdDate`,
    {},
    'read app versions',
  );
  const versions = [];
  for (const version of body.data ?? []) {
    const build = await api(
      `/v1/appStoreVersions/${version.id}/build?fields[builds]=version,processingState`,
    );
    versions.push({
      id: version.id,
      versionString: version.attributes.versionString,
      state: version.attributes.appStoreState,
      createdDate: version.attributes.createdDate,
      build: build.body?.data?.attributes,
    });
  }
  return versions;
}

async function recentBuilds(limit = 20) {
  const body = await apiOrFail(
    `/v1/apps/${APP_ID}/builds?limit=${limit}&fields[builds]=version,processingState,uploadedDate`,
    {},
    'read builds',
  );
  const builds = [];
  for (const build of body.data ?? []) {
    let marketingVersion;
    if (build.relationships?.preReleaseVersion?.data?.id || build.attributes.processingState === 'VALID') {
      const preRelease = await api(`/v1/builds/${build.id}/preReleaseVersion?fields[preReleaseVersions]=version`);
      marketingVersion = preRelease.body?.data?.attributes?.version;
    }
    builds.push({
      id: build.id,
      buildNumber: build.attributes.version,
      processingState: build.attributes.processingState,
      uploadedDate: build.attributes.uploadedDate,
      marketingVersion,
    });
  }
  return builds;
}

async function findBuild(targetVersion) {
  const builds = await recentBuilds(30);
  return builds
    .filter(
      (build) =>
        build.marketingVersion === targetVersion && build.processingState === 'VALID',
    )
    .sort((left, right) => Number(right.buildNumber) - Number(left.buildNumber))[0];
}

async function pendingSubscriptionItems() {
  const items = [];
  const groups = await apiOrFail(
    `/v1/apps/${APP_ID}/subscriptionGroups?limit=20&fields[subscriptionGroups]=referenceName`,
    {},
    'read subscription groups',
  );
  for (const group of groups.data ?? []) {
    const subscriptions = await apiOrFail(
      `/v1/subscriptionGroups/${group.id}/subscriptions?limit=50&fields[subscriptions]=productId,state`,
      {},
      'read subscriptions',
    );
    for (const subscription of subscriptions.data ?? []) {
      const versions = await apiOrFail(
        `/v1/subscriptions/${subscription.id}/versions?limit=10&fields[subscriptionVersions]=version,state`,
        {},
        'read subscription versions',
      );
      const pending = (versions.data ?? []).find(
        (version) => version.attributes.state !== 'APPROVED',
      );
      if (pending) {
        items.push({
          relationship: 'subscriptionVersion',
          type: 'subscriptionVersions',
          id: pending.id,
          label: `${subscription.attributes.productId} v${pending.attributes.version} (${pending.attributes.state})`,
        });
      }
    }
    const groupVersions = await apiOrFail(
      `/v1/subscriptionGroups/${group.id}/versions?limit=10&fields[subscriptionGroupVersions]=version,state`,
      {},
      'read subscription group versions',
    );
    const pendingGroup = (groupVersions.data ?? []).find(
      (version) => version.attributes.state !== 'APPROVED',
    );
    if (pendingGroup) {
      items.push({
        relationship: 'subscriptionGroupVersion',
        type: 'subscriptionGroupVersions',
        id: pendingGroup.id,
        label: `${group.attributes.referenceName} group v${pendingGroup.attributes.version} (${pendingGroup.attributes.state})`,
      });
    }
  }
  return items;
}

function setMarketingVersion(nextVersion) {
  const packagePath = path.join(ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = nextVersion;
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const projectPath = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  const project = fs.readFileSync(projectPath, 'utf8');
  const updated = project.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${nextVersion};`,
  );
  if (updated === project) fail('MARKETING_VERSION not found in project.pbxproj');
  fs.writeFileSync(projectPath, updated);

  const triggerPath = path.join(ROOT, '.github', 'ios-trigger.txt');
  fs.writeFileSync(triggerPath, `${new Date().toISOString()}\n`);
}

async function uploadScreenshots(localizationId, displayType, files) {
  const set = await api('/v1/appScreenshotSets', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: displayType },
        relationships: {
          appStoreVersionLocalization: {
            data: { type: 'appStoreVersionLocalizations', id: localizationId },
          },
        },
      },
    }),
  });
  if (!set.ok) {
    console.log(`   ! screenshot set ${displayType}: ${set.status} ${JSON.stringify(set.body).slice(0, 300)}`);
    return;
  }
  const setId = set.body.data.id;
  for (const file of files) {
    const filePath = path.join(SCREENSHOT_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    const buffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('md5').update(buffer).digest('hex');
    const shot = await api('/v1/appScreenshots', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appScreenshots',
          attributes: { fileSize: buffer.length, fileName: file },
          relationships: {
            appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } },
          },
        },
      }),
    });
    if (!shot.ok) {
      console.log(`   ! screenshot ${file}: ${shot.status} ${JSON.stringify(shot.body).slice(0, 300)}`);
      continue;
    }
    const shotId = shot.body.data.id;
    for (const operation of shot.body.data.attributes.uploadOperations || []) {
      const headers = {};
      (operation.requestHeaders || []).forEach((header) => {
        headers[header.name] = header.value;
      });
      const upload = await fetch(operation.url, {
        method: operation.method,
        headers,
        body: buffer.subarray(operation.offset, operation.offset + operation.length),
      });
      if (!upload.ok) console.log(`   ! upload ${file}: HTTP ${upload.status}`);
    }
    const commit = await api(`/v1/appScreenshots/${shotId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'appScreenshots',
          id: shotId,
          attributes: { uploaded: true, sourceFileChecksum: checksum },
        },
      }),
    });
    console.log(`   · screenshot ${file}: ${commit.ok ? 'uploaded' : `failed ${commit.status}`}`);
  }
}

async function copyMetadata(previousVersionId, newVersionId, whatsNew) {
  const body = await apiOrFail(
    `/v1/appStoreVersions/${previousVersionId}/appStoreVersionLocalizations?limit=20&fields[appStoreVersionLocalizations]=locale,description,keywords,supportUrl,marketingUrl,promotionalText`,
    {},
    'read previous localizations',
  );
  const localizations = body.data ?? [];
  if (localizations.length === 0) fail('Previous version has no localizations to copy.');

  for (const localization of localizations) {
    const attributes = {
      locale: localization.attributes.locale,
      description: localization.attributes.description,
      keywords: localization.attributes.keywords,
      supportUrl: localization.attributes.supportUrl,
    };
    if (localization.attributes.marketingUrl) {
      attributes.marketingUrl = localization.attributes.marketingUrl;
    }
    if (localization.attributes.promotionalText) {
      attributes.promotionalText = localization.attributes.promotionalText;
    }
    if (whatsNew && localization.attributes.locale === 'zh-Hant') {
      attributes.whatsNew = whatsNew;
    }
    const created = await apiOrFail(
      '/v1/appStoreVersionLocalizations',
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'appStoreVersionLocalizations',
            attributes,
            relationships: {
              appStoreVersion: {
                data: { type: 'appStoreVersions', id: newVersionId },
              },
            },
          },
        }),
      },
      `create ${localization.attributes.locale} localization`,
    );
    const localizationId = created.data.id;
    console.log(`   · copied ${localization.attributes.locale} localization`);

    if (localization.attributes.locale === 'zh-Hant') {
      for (const set of SCREENSHOT_SETS) {
        await uploadScreenshots(localizationId, set.displayType, set.files);
      }
    }
  }
}

async function copyReviewDetail(previousVersionId, newVersionId) {
  const detail = await api(`/v1/appStoreVersions/${previousVersionId}/appStoreReviewDetail`);
  if (!detail.ok || !detail.body?.data) {
    console.log('   ! previous review detail not found, add demo account manually');
    return;
  }
  const source = detail.body.data.attributes;
  const created = await api('/v1/appStoreReviewDetails', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appStoreReviewDetails',
        attributes: {
          contactFirstName: source.contactFirstName,
          contactLastName: source.contactLastName,
          contactPhone: source.contactPhone,
          contactEmail: source.contactEmail,
          demoAccountRequired: source.demoAccountRequired,
          ...(source.demoAccountName ? { demoAccountName: source.demoAccountName } : {}),
          ...(source.demoAccountPassword
            ? { demoAccountPassword: source.demoAccountPassword }
            : {}),
          ...(source.notes ? { notes: source.notes } : {}),
        },
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: newVersionId } },
        },
      },
    }),
  });
  console.log(
    `   · review detail copied${created.ok ? '' : ` (failed ${created.status} ${JSON.stringify(created.body).slice(0, 300)})`}`,
  );
}

async function commandStatus() {
  const versions = await listVersions();
  const submissions = await apiOrFail(
    `/v1/apps/${APP_ID}/reviewSubmissions?limit=10&fields[reviewSubmissions]=state,platform,submittedDate`,
    {},
    'read submissions',
  );
  const builds = await recentBuilds(10);
  const pending = await pendingSubscriptionItems();

  console.log('\nApp Store versions');
  for (const version of versions) {
    console.log(
      `  ${version.versionString} | ${version.state} | build ${version.build?.version ?? '—'} (${version.build?.processingState ?? '—'})`,
    );
  }
  console.log('\nReview submissions');
  for (const submission of submissions.data ?? []) {
    console.log(
      `  ${submission.id} | ${submission.attributes.state} | submitted ${submission.attributes.submittedDate ?? '—'}`,
    );
  }
  console.log('\nRecent builds');
  for (const build of builds) {
    console.log(
      `  ${build.marketingVersion ?? '?'} (${build.buildNumber}) | ${build.processingState} | ${build.uploadedDate}`,
    );
  }
  console.log('\nPending subscription items');
  if (pending.length === 0) console.log('  none (all approved)');
  for (const item of pending) console.log(`  ${item.relationship}: ${item.label}`);
  console.log('');
}

async function commandSubmit(targetVersion) {
  const dryRun = hasFlag('dry-run');
  const whatsNew = flagValue('whats-new-file')
    ? fs.readFileSync(path.join(ROOT, flagValue('whats-new-file')), 'utf8').trim()
    : flagValue('whats-new');

  const build = await findBuild(targetVersion);
  if (!build) {
    fail(
      `No VALID build found for ${targetVersion}. Push .github/ios-trigger.txt, wait for the iOS workflow, then retry.`,
    );
  }
  console.log(`Build: ${targetVersion} (${build.buildNumber}) → ${build.id}`);

  const versions = await listVersions();
  let version = versions.find((item) => item.versionString === targetVersion);
  const previous = versions
    .filter((item) => item.versionString !== targetVersion)
    .sort((left, right) => (right.createdDate ?? '').localeCompare(left.createdDate ?? ''))[0];

  if (dryRun) {
    console.log(`Dry run: version ${targetVersion} ${version ? 'exists' : 'would be created'}`);
    if (version) {
      console.log(`  state: ${version.state}`);
    } else if (previous) {
      console.log(`  metadata would be copied from ${previous.versionString}`);
      console.log(`  screenshots from ${SCREENSHOT_DIR}`);
    }
    const pending = await pendingSubscriptionItems();
    console.log(
      `  subscription items: ${pending.length ? pending.map((item) => item.relationship).join(', ') : 'none'}`,
    );
    console.log('Dry run complete.\n');
    return;
  }

  if (!version) {
    if (!previous) fail('No previous App Store version found to copy metadata from.');
    const created = await apiOrFail(
      '/v1/appStoreVersions',
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'appStoreVersions',
            attributes: {
              platform: 'IOS',
              versionString: targetVersion,
              copyright: new Date().getFullYear() + ' MARLLEE CONCEPT LIMITED',
              releaseType: 'AFTER_APPROVAL',
            },
            relationships: { app: { data: { type: 'apps', id: APP_ID } } },
          },
        }),
      },
      'create app store version',
    );
    version = { id: created.data.id, versionString: targetVersion, state: 'PREPARE_FOR_SUBMISSION' };
    console.log(`Created version ${targetVersion} (${version.id})`);
    await copyMetadata(previous.id, version.id, whatsNew);
    await copyReviewDetail(previous.id, version.id);
  } else if (whatsNew) {
    const localizations = await apiOrFail(
      `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=20`,
      {},
      'read localizations',
    );
    const target = (localizations.data ?? []).find(
      (item) => item.attributes.locale === 'zh-Hant',
    );
    if (target) {
      await apiOrFail(
        `/v1/appStoreVersionLocalizations/${target.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            data: {
              type: 'appStoreVersionLocalizations',
              id: target.id,
              attributes: { whatsNew },
            },
          }),
        },
        'update whatsNew',
      );
      console.log('Updated whatsNew');
    }
  }

  const attached = await api(`/v1/appStoreVersions/${version.id}/relationships/build`, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: 'builds', id: build.id } }),
  });
  if (!attached.ok) {
    fail(`attach build failed (${attached.status}): ${JSON.stringify(attached.body).slice(0, 800)}`);
  }
  console.log('Attached build');

  const pending = await pendingSubscriptionItems();
  const submission = await apiOrFail(
    '/v1/reviewSubmissions',
    {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'reviewSubmissions',
          attributes: { platform: 'IOS' },
          relationships: { app: { data: { type: 'apps', id: APP_ID } } },
        },
      }),
    },
    'create review submission',
  );
  const submissionId = submission.data.id;

  const versionItem = await api('/v1/reviewSubmissionItems', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
        },
      },
    }),
  });
  if (!versionItem.ok) {
    console.log(
      `! add version item failed: ${JSON.stringify(versionItem.body).slice(0, 600)}\n  If the version is still attached to an older submission, remove that item first.`,
    );
  }

  for (const item of pending) {
    const added = await api('/v1/reviewSubmissionItems', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'reviewSubmissionItems',
          relationships: {
            reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
            [item.relationship]: { data: { type: item.type, id: item.id } },
          },
        },
      }),
    });
    console.log(
      `   · ${item.relationship} ${item.label}: ${added.ok ? 'added' : `failed ${added.status}`}`,
    );
  }

  if (!versionItem.ok) fail('App version could not be added to the review submission.');

  const submitted = await apiOrFail(
    `/v1/reviewSubmissions/${submissionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'reviewSubmissions',
          id: submissionId,
          attributes: { submitted: true },
        },
      }),
    },
    'submit review submission',
  );
  console.log(`Submitted: ${JSON.stringify(submitted.data?.attributes ?? {})}`);

  const finalState = await api(
    `/v1/appStoreVersions/${version.id}?fields[appStoreVersions]=versionString,appStoreState`,
  );
  console.log(`Version state: ${JSON.stringify(finalState.body?.data?.attributes ?? {})}\n`);
}

async function commandBump(targetVersion) {
  if (!/^\d+\.\d+\.\d+$/.test(targetVersion ?? '')) {
    fail('Usage: node scripts/asc-release.mjs bump 1.2.0');
  }
  setMarketingVersion(targetVersion);
  console.log(`\nVersion set to ${targetVersion}.`);
  console.log('Next:');
  console.log('  git add package.json ios/App/App.xcodeproj/project.pbxproj .github/ios-trigger.txt');
  console.log(`  git commit -m "Release iOS ${targetVersion}"`);
  console.log('  git push');
  console.log('Then wait for the iOS workflow and run:');
  console.log(`  node scripts/asc-release.mjs submit ${targetVersion} --whats-new "..."\n`);
}

async function main() {
  if (!command || command === 'help' || command === '--help') {
    console.log(`LifeNum iOS release helper

  status                              Show versions, submissions, builds and pending subscriptions
  bump <version>                      Update package.json, MARKETING_VERSION and the iOS CI trigger file
  submit <version> [options]          Create/attach the version, copy metadata and submit for review
      --whats-new "text"              What's New text for this update
      --whats-new-file <path>         Read the What's New text from a file
      --dry-run                       Show what would happen without writing anything

Environment overrides: ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID, ASC_APP_ID
`);
    return;
  }
  if (command === 'status') return commandStatus();
  if (command === 'bump') return commandBump(positional[1]);
  if (command === 'submit') {
    const targetVersion = positional[1];
    if (!targetVersion) fail('Usage: node scripts/asc-release.mjs submit <version>');
    return commandSubmit(targetVersion);
  }
  fail(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
