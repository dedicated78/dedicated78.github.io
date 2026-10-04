import { launch, newPage, login, shot, check, summary, BASE } from '../lib.mjs';
import { fileURLToPath } from 'node:url';
const SAMPLE = fileURLToPath(new URL('../../docs/sample-prospect-report.md', import.meta.url));
const b = await launch();

// ============================================================ ADMIN uploads research
console.log('\nADMIN: upload research');
const admin = await newPage(b);
await login(admin, 'mehedi@demo.test');
await admin.getByRole('link', { name: 'Leads' }).first().click();
await admin.getByRole('link', { name: 'Upload research' }).first().click();
await admin.locator('input[type=file]').setInputFiles(SAMPLE);
await admin.waitForSelector('text=Review before creating');
await shot(admin, '01-upload-review');
check((await admin.getByLabel('Business name').inputValue()) === 'Demo Roofing Co (Sample)', 'frontmatter business name extracted');
check((await admin.getByLabel('Phone').inputValue()) === '+1 555 010 0199', 'phone extracted');
check((await admin.getByLabel('Talking points').inputValue()).split('\n').length === 4, '4 talking points extracted');
check((await admin.getByLabel('Outreach owner').inputValue()) !== '', 'defaults to the outreach user');
check(await admin.getByText('Ready to Call').first().isVisible(), 'status preview shows Ready to Call');
// correct a value, then create
await admin.getByLabel('Niche').fill('Roofing Contractor (corrected)');
await admin.getByRole('button', { name: 'Create lead' }).click();
await admin.waitForSelector('text=Lead created and ready for outreach');
await shot(admin, '02-upload-done');
await admin.getByRole('button', { name: 'Open Lead' }).click();
await admin.waitForURL(/#\/leads\/[0-9a-f-]{36}$/);
const leadUrl = admin.url();
await admin.waitForSelector('text=Outreach brief');
await shot(admin, '03-admin-lead');
check(await admin.getByText('Roofing Contractor (corrected)').first().isVisible(), 'corrected niche saved on the lead');
check(await admin.getByText('Competitor X ranks in the map pack').isVisible(), 'talking points visible in brief');
// full research drawer
await admin.getByRole('button', { name: 'View full research' }).click();
await admin.waitForSelector('text=Full research');
await shot(admin, '04-research-drawer');
await admin.getByRole('tab', { name: 'Original file' }).click();
check(await admin.locator('.md h1', { hasText: 'Prospect Summary' }).isVisible(), 'original markdown rendered');
check(await admin.locator('.md script').count() === 0, 'no script in rendered markdown');
await admin.keyboard.press('Escape');
// duplicate warning on second upload
await admin.goto(`${BASE}/leads/upload`);
await admin.locator('input[type=file]').setInputFiles(SAMPLE);
await admin.waitForSelector('text=Check these before saving');
check(await admin.getByText('already exists').isVisible(), 'duplicate-name warning shown');
await admin.getByRole('button', { name: 'Choose another file' }).click();
// bad file
await admin.locator('input[type=file]').setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
check(await admin.getByRole('alert').getByText('Markdown file').isVisible(), 'non-.md rejected with message');

// ============================================================ MAJEDA works the lead
console.log('\nMAJEDA: queue → call → handoff');
const maj = await newPage(b);
await login(maj, 'majeda@demo.test');
await maj.waitForSelector('text=Today’s queue');
await shot(maj, '05-majeda-dashboard');
check(await maj.getByText('Ready to call').first().isVisible(), 'queue shows Ready to call group');
check(await maj.getByRole('link', { name: 'Demo Roofing Co (Sample)' }).first().isVisible(), 'lead in her queue');
const navText = (await maj.locator('nav[aria-label=Main]').first().innerText());
check(!/Deals|Clients|Settings/.test(navText), 'outreach nav hides Deals/Clients/Settings');
await maj.goto(`${BASE}/deals`);
await maj.waitForURL(/#\/dashboard/);
check(true, 'outreach redirected away from /deals');
await maj.goto(`${BASE}/leads/upload`);
await maj.waitForURL(/#\/dashboard/);
check(true, 'outreach redirected away from /leads/upload');
await maj.goto(leadUrl);
await maj.waitForSelector('text=Outreach brief');
await shot(maj, '06-majeda-lead');
check(await maj.getByText('Suggested opening').isVisible(), 'brief shows suggested opening');
check(await maj.getByRole('button', { name: 'Edit', exact: true }).count() >= 1, 'next-step edit available');
check((await maj.getByRole('button', { name: /^Archive/ }).count()) === 0, 'no archive button for outreach');
// copy phone
await maj.getByRole('button', { name: 'Copy phone' }).click();
check((await maj.evaluate(() => navigator.clipboard.readText())) === '+1 555 010 0199', 'copy phone puts the number on the clipboard');
// objections collapsible
await maj.getByText('We already have someone doing SEO').click();
check(await maj.getByText('offer a free comparison report').isVisible(), 'objection response expands');
// log: no answer
await maj.getByRole('button', { name: 'Add activity' }).click();
await maj.getByRole('dialog').waitFor();
await maj.getByLabel('Outcome').selectOption('No Answer');
check((await maj.getByLabel('Lead status').inputValue()) === 'Attempted', 'No Answer suggests Attempted');
check((await maj.getByLabel('Follow-up date', { exact: true }).inputValue()) !== '', 'No Answer suggests a follow-up date');
await shot(maj, '07-add-activity');
await maj.getByRole('button', { name: 'Save activity' }).click();
await maj.waitForSelector('text=Activity logged');
await maj.waitForSelector('li:has-text("No Answer")');
check(await maj.locator('li:has-text("No Answer")').first().isVisible(), 'activity appears on timeline');
check(await maj.locator('main').getByText('Attempted').first().isVisible(), 'status moved to Attempted');
// log: interested -> handoff prompt
await maj.getByRole('button', { name: 'Add activity' }).first().click();
await maj.getByRole('radio', { name: 'Call' }).check({ force: true });
await maj.getByLabel('Outcome').selectOption('Interested');
await maj.getByLabel('Short notes').fill('Spoke with Jane. Wants pricing. Free Wednesday pm.');
await maj.getByRole('button', { name: 'Save activity' }).click();
await maj.getByRole('heading', { name: 'Hand off to Business Development' }).waitFor();
await shot(maj, '08-handoff-dialog');
check((await maj.getByLabel('Business developer').inputValue()) !== '', 'handoff defaults to Mostafa');
await maj.getByRole('button', { name: 'Hand off', exact: true }).click();
await maj.getByText('Write a short note').waitFor();
await maj.getByLabel('Handoff note').fill('Owner is interested in Maps visibility. Asked about pricing. Available Wednesday afternoon.');
await maj.getByRole('button', { name: 'Hand off', exact: true }).click();
await maj.waitForSelector('text=Handed to Mostafa');
await maj.waitForSelector('text=Handed to Business Development');
await shot(maj, '09-majeda-after-handoff');
check(await maj.getByText('Owner is interested in Maps visibility').first().isVisible(), 'handoff note shown on lead');
check(await maj.getByText('Mostafa').first().isVisible(), 'BD owner shown');
check((await maj.locator('li:has-text("Spoke with Jane")').count()) === 1, 'both activities preserved in timeline');

await b.close();
process.exit(summary([['admin', admin], ['majeda', maj]]));
