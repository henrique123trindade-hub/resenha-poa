import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');

test('firestore.rules enforces rules_version 2 and global deny-all fallback', () => {
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules covers every collection in firebase-blueprint.json', () => {
  const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));
  const collections = Object.keys(blueprint.firestore);
  assert.ok(collections.length >= 9);
  for (const pathPattern of collections) {
    const seg = pathPattern.split('/').filter(Boolean)[0];
    assert.match(rules, new RegExp(`match /${seg}/`), `Missing rule block for ${seg}`);
  }
});

test('firestore.rules prevents self-admin escalation and organizer auto-publish', () => {
  assert.match(rules, /incoming\(\)\.role == 'user'/);
  assert.match(rules, /incoming\(\)\.status in \['draft', 'pending'\]/);
  assert.match(rules, /incoming\(\)\.isVerified == false/);
  assert.match(rules, /incoming\(\)\.isSponsored == false/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
});

test('firestore.rules avoids get() or exists() inside allow list blocks', () => {
  const listLines = rules
    .split('\n')
    .filter((line) => line.includes('allow list:') || line.includes('allow get, list:'));
  for (const line of listLines) {
    assert.equal(line.includes('exists('), false, `allow list must not call exists(): ${line}`);
    assert.equal(line.includes('get('), false, `allow list must not call get(): ${line}`);
  }
});

test('firestore.rules allows admin and active-filtered list queries on categories and neighborhoods', () => {
  const matches = rules.match(/allow list: if resource\.data\.active == true \|\| isAdmin\(\);/g) || [];
  assert.equal(matches.length, 2, 'Both categories and neighborhoods must allow active == true || isAdmin()');
});

