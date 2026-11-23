import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSafePublicUrl,
  extractProspectsFromDuckDuckGoHtml,
  extractProspectsFromOverpassElements,
} from './webCrawler';

test('extractProspectsFromOverpassElements maps OSM tags to verified business records and drops fake/empty records', () => {
  const prospects = extractProspectsFromOverpassElements(
    [
      {
        id: 1,
        tags: {
          name: 'Victoria Dental Clinic',
          website: 'https://www.victoriadental.ug',
          phone: '+256 772 800 100',
          email: 'info@victoriadental.ug',
          'addr:street': 'Plot 12 Kampala Rd',
          'addr:city': 'Kampala',
        },
      },
      {
        id: 2,
        tags: {
          name: 'Missing Contact Record',
        },
      },
      {
        id: 3,
        tags: {
          name: 'Acme Dental Clinic',
          website: 'https://example.com',
          phone: '+1 512 555 0100',
        },
      },
    ],
    'Dental Clinics',
    'Kampala, Uganda'
  );

  assert.equal(prospects.length, 1);
  assert.equal(prospects[0].business_name, 'Victoria Dental Clinic');
  assert.equal(prospects[0].domain, 'victoriadental.ug');
  assert.deepEqual(prospects[0].pre_found_phones, ['+256772800100']);
  assert.deepEqual(prospects[0].pre_found_emails, ['info@victoriadental.ug']);
  assert.equal(prospects[0].address, 'Plot 12 Kampala Rd Kampala');
});

test('extractProspectsFromDuckDuckGoHtml filters aggregators/fakes and extracts phones + decision makers', () => {
  const html = `
    <div class="result">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.facebook.com%2Fclinic">Facebook Page</a>
      <a class="result__snippet">Social page</a>
    </div>
    <div class="result">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.clutch.co%2Fprofile%2Fpanache">Clutch Directory</a>
      <a class="result__snippet">Aggregator</a>
    </div>
    <div class="result">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fpanacheclinic.co.uk%2F">Panache Dental — London</a>
      <a class="result__snippet">Founded by Dr. Elena Rostova, Managing Director. Call us at +44 20 7946 0011 for cosmetic dentistry in Mayfair.</a>
    </div>
  `;

  const prospects = extractProspectsFromDuckDuckGoHtml(html, 'Dental Clinics', 'London, UK');
  assert.equal(prospects.length, 1);
  assert.equal(prospects[0].business_name, 'Panache Dental');
  assert.equal(prospects[0].domain, 'panacheclinic.co.uk');
  assert.ok((prospects[0].pre_found_phones?.length ?? 0) > 0);
  assert.equal(prospects[0].pre_found_decision_maker?.name, 'Dr. Elena Rostova');
});

test('assertSafePublicUrl blocks loopback, localhost, private IPs, and non-HTTP schemes', async () => {
  await assert.rejects(() => assertSafePublicUrl('http://127.0.0.1:3000/test'));
  await assert.rejects(() => assertSafePublicUrl('http://localhost/admin'));
  await assert.rejects(() => assertSafePublicUrl('http://169.254.169.254/latest/meta-data/'));
  await assert.rejects(() => assertSafePublicUrl('http://10.0.0.5/internal'));
  await assert.rejects(() => assertSafePublicUrl('file:///etc/passwd'));
});
