#!/usr/bin/env node
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { applyDomainGuardrails, createCatalogSmartSelect, normalizeFilters } = require('../lib/catalog-smart-select.cjs')

assert.deepEqual(normalizeFilters({
  firmness: ['medium', 'invented', 'medium'],
  loadRange: ['upTo160', 'upTo180'],
  malicious: ['anything'],
}), { firmness: ['medium'], loadRange: ['upTo160'] })

assert.deepEqual(applyDomainGuardrails({ heightRange: ['high'] }, 'высокий спортсмен, сплю на спине'), {
  size: ['140x200', '160x200', '180x200'],
  firmness: ['hard', 'medium'],
})
assert.deepEqual(applyDomainGuardrails({ heightRange: ['high'] }, 'нужен высокий матрас'), { heightRange: ['high'] })
assert.deepEqual(applyDomainGuardrails({}, 'молодая девушка спит с ребенком'), {
  size: ['160x190', '160x200', '180x190', '180x200'],
  firmness: ['medium'],
})
assert.deepEqual(applyDomainGuardrails({}, 'мужчина 105 кг, сплю на боку'), {
  firmness: ['medium'],
  loadRange: ['upTo160'],
})
assert.deepEqual(applyDomainGuardrails({}, 'женщина 55 кг, сплю на животе'), {
  firmness: ['hard'],
  loadRange: ['upTo120'],
})
assert.deepEqual(applyDomainGuardrails({}, 'пара, вес 60 и 110 кг, один спит на боку, другой на спине'), {
  size: ['160x190', '160x200', '180x190', '180x200'],
  firmness: ['dualFirmness', 'medium'],
  loadRange: ['upTo160'],
})
assert.deepEqual(applyDomainGuardrails({}, 'высокий мужчина рост 195 см вес 90 кг спит на спине'), {
  size: ['140x200', '160x200', '180x200'],
  firmness: ['hard', 'medium'],
  loadRange: ['upTo120'],
})

let capturedRequest
const fakeAxios = {
  async post(url, body, config) {
    capturedRequest = { url, body, config }
    return {
      data: { candidates: [{ content: { parts: [{ text: JSON.stringify({ firmness: ['hard'], size: ['160x200'], features: ['unknown'] }) }] } }] },
    }
  },
}

const selector = createCatalogSmartSelect({
  axios: fakeAxios,
  apiKey: 'server-only-key',
  model: 'test-model',
  baseUrl: 'http://fake-gemini/v1beta/',
  timeoutMs: 1234,
})
const result = await selector.select('сплю на боку, жесткий 160x200')
assert.deepEqual(result, { filters: { size: ['160x200'], firmness: ['hard'] } })
assert.equal(capturedRequest.url, 'http://fake-gemini/v1beta/models/test-model:generateContent')
assert.equal(capturedRequest.config.headers['x-goog-api-key'], 'server-only-key')
assert.equal(capturedRequest.config.timeout, 1234)
assert.equal(capturedRequest.body.generationConfig.responseMimeType, 'application/json')
assert.ok(capturedRequest.body.generationConfig.responseSchema.properties.firmness.items.enum.includes('medium'))
assert.ok(capturedRequest.body.contents[0].parts[0].text.includes('<user_text>'))

await assert.rejects(() => selector.select(''), (error) => error.code === 'INVALID_INPUT')
await assert.rejects(() => selector.select('x'.repeat(1601)), (error) => error.code === 'INPUT_TOO_LONG')
await assert.rejects(
  () => createCatalogSmartSelect({ axios: fakeAxios, apiKey: '' }).select('текст'),
  (error) => error.code === 'NOT_CONFIGURED',
)

const attemptedModels = []
const fallbackSelector = createCatalogSmartSelect({
  axios: {
    async post(url) {
      attemptedModels.push(url)
      if (url.includes('gemini-2.5-flash-lite')) {
        const error = new Error('model unavailable')
        error.response = { status: 404 }
        throw error
      }
      return { data: { candidates: [{ content: { parts: [{ text: '{"firmness":["medium"]}' }] } }] } }
    },
  },
  apiKey: 'server-only-key',
  model: 'gemini-2.5-flash-lite',
})
assert.deepEqual(await fallbackSelector.select('средняя жёсткость'), { filters: { firmness: ['medium'] } })
assert.equal(attemptedModels.length, 2)
assert.ok(attemptedModels[1].includes('gemini-3.5-flash-lite'))

console.log('Catalog smart select API contract ok')
