import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIntent, parseDemo } from '../services/intent.js';

const catalog = [
  { name: 'Rice', unit: 'kg' },
  { name: 'బియ్యం', unit: 'kg' },
  { name: 'Sugar', unit: 'kg' }
];
const parsed = (transcript, product = 'Rice') => parseDemo(transcript, catalog.filter(item => item.name !== 'బియ్యం' || product === 'బియ్యం'));

test('demo parser preserves existing English stock commands and word order', () => {
  assert.deepEqual(parsed('add 5 kg rice'), { intent: 'ADD_STOCK', product: 'Rice', quantity: 5, unit: 'kg', price: null, needsClarification: false });
  assert.deepEqual(parsed('add 5 kg rice to inventory'), { intent: 'ADD_STOCK', product: 'Rice', quantity: 5, unit: 'kg', price: null, needsClarification: false });
  assert.deepEqual(parsed('remove 2 kg rice'), { intent: 'REMOVE_STOCK', product: 'Rice', quantity: 2, unit: 'kg', price: null, needsClarification: false });
  assert.equal(parsed('check rice stock').intent, 'CHECK_STOCK');
});

test('demo parser removes natural English connectors around the product name', () => {
  const result = parseDemo('add 5 kgs of coke', [{ name: 'Coke', unit: 'kg' }]);
  assert.deepEqual(result, { intent: 'ADD_STOCK', product: 'Coke', quantity: 5, unit: 'kg', price: null, needsClarification: false });
});

test('demo parser recognizes Telugu and mixed-language stock changes', () => {
  for (const transcript of ['5 kg బియ్యం యాడ్ చేయి', '5 kg బియ్యం ప్యాకెట్లు యాడ్ చేయి', 'బియ్యం 5 kg add చేయి']) {
    assert.deepEqual(parsed(transcript), { intent: 'ADD_STOCK', product: 'Rice', quantity: 5, unit: 'kg', price: null, needsClarification: false });
  }
  assert.deepEqual(parsed('2 kg బియ్యం తీసివేయి'), { intent: 'REMOVE_STOCK', product: 'Rice', quantity: 2, unit: 'kg', price: null, needsClarification: false });
});

test('demo parser recognizes English and Telugu stock queries', () => {
  for (const transcript of ['rice stock ఎంత ఉంది', 'బియ్యం stock ఎంత ఉంది', 'check rice stock', 'బియ్యం stock చెక్ చేయి']) {
    const result = parsed(transcript);
    assert.equal(result.intent, 'CHECK_STOCK', transcript);
    assert.equal(result.product, 'Rice', transcript);
    assert.equal(result.quantity, null, transcript);
  }
});

test('Telugu product names remain intact when the catalog uses Telugu names', () => {
  const result = parsed('2 kg బియ్యం తీసివేయి', 'బియ్యం');
  assert.equal(result.product, 'బియ్యం');
  assert.equal(result.intent, 'REMOVE_STOCK');
});

test('live mode uses deterministic parsing for recognized Telugu commands before Gemini', async () => {
  const result = await extractIntent('5 kg బియ్యం ప్యాకెట్లు యాడ్ చేయి', catalog.filter(item => item.name !== 'బియ్యం'), { demo: false, geminiKey: 'configured' }, async () => {
    throw new Error('Gemini should not be called for a deterministically recognized command.');
  });
  assert.equal(result.intent, 'ADD_STOCK');
  assert.equal(result.product, 'Rice');
  assert.equal(result.quantity, 5);
});

test('demo parser normalizes supported unit aliases and retains explicit add price', () => {
  const result = parseDemo('add 3 pcs Apples at 12', [{ name: 'Apples', unit: 'piece' }]);
  assert.deepEqual(result, { intent: 'ADD_STOCK', product: 'Apples', quantity: 3, unit: 'piece', price: 12, needsClarification: false });
});

test('ambiguous, unsupported, and incomplete commands request clarification', () => {
  for (const transcript of ['add 5 kg rice and remove 1 kg sugar', '5 g rice add', 'add rice', 'stock ఎంత ఉంది']) {
    assert.equal(parseDemo(transcript, catalog).intent, 'UNKNOWN', transcript);
    assert.equal(parseDemo(transcript, catalog).needsClarification, true, transcript);
  }
});
