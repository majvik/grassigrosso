#!/usr/bin/env node
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { applyDomainGuardrails, createCatalogSmartSelect, normalizeFilters } = require('../lib/catalog-smart-select.cjs')
const smartSelectorExamples = require('../src/components/catalog-page/smart-selector-examples.json')

function assertIncludes(actual, expected) {
  for (const [group, values] of Object.entries(expected)) {
    assert.ok(Array.isArray(actual[group]), `missing ${group} in ${JSON.stringify(actual)}`)
    values.forEach((value) => assert.ok(actual[group].includes(value), `missing ${group}:${value} in ${JSON.stringify(actual)}`))
  }
}

assert.deepEqual(normalizeFilters({
  firmness: ['medium', 'invented', 'medium'],
  loadRange: ['upTo160', 'upTo180'],
  malicious: ['anything'],
}), { firmness: ['medium'], loadRange: ['upTo160'] })

assertIncludes(applyDomainGuardrails({ heightRange: ['high'] }, 'высокий спортсмен, сплю на спине'), {
  size: ['140x200', '160x200', '180x200'], firmness: ['hard', 'medium'], fillings: ['orthoFoam', 'latex'], type: ['spring', 'nospring'],
})
assertIncludes(applyDomainGuardrails({ heightRange: ['high'] }, 'нужен высокий матрас'), {
  heightRange: ['high'], type: ['spring', 'nospring'], fillings: ['orthoFoam'],
})
assertIncludes(applyDomainGuardrails({}, 'молодая девушка спит с ребенком'), {
  size: ['160x200'], firmness: ['medium'], fillings: ['orthoFoam', 'coir'], features: ['removableCover', 'edgeSupport'],
})
assertIncludes(applyDomainGuardrails({}, 'мужчина 105 кг, сплю на боку'), {
  firmness: ['medium'], loadRange: ['upTo160'], fillings: ['memoryEffect', 'latex'], features: ['edgeSupport'], heightRange: ['high', 'mid'], type: ['doubleSided'],
})
assertIncludes(applyDomainGuardrails({}, 'женщина 55 кг, сплю на животе'), {
  firmness: ['hard'], loadRange: ['upTo120'], fillings: ['orthoFoam', 'coir'], type: ['spring', 'nospring'],
})
assertIncludes(applyDomainGuardrails({}, 'пара, вес 60 и 110 кг, один спит на боку, другой на спине'), {
  size: ['160x200'], firmness: ['dualFirmness', 'medium'], loadRange: ['upTo160'], fillings: ['memoryEffect', 'latex'], features: ['dualFirmness', 'edgeSupport'], heightRange: ['mid', 'high'],
})
assertIncludes(applyDomainGuardrails({}, 'высокий мужчина рост 195 см вес 90 кг спит на спине'), {
  size: ['140x200', '160x200', '180x200'], firmness: ['hard', 'medium'], loadRange: ['upTo120'], fillings: ['orthoFoam', 'latex'],
})

assertIncludes(applyDomainGuardrails({}, 'болит поясница после сна'), {
  collection: ['relax'], firmness: ['medium', 'dualFirmness'], heightRange: ['mid', 'high'], fillings: ['memoryEffect', 'latex', 'orthoFoam'], features: ['edgeSupport'],
})
assertIncludes(applyDomainGuardrails({}, 'нужен невысокий матрас на диван'), {
  collection: ['topper'], type: ['topper'], heightRange: ['low'],
})
assertIncludes(applyDomainGuardrails({}, 'хочу матрас с эффектом памяти'), {
  firmness: ['medium'], fillings: ['memoryEffect'], heightRange: ['mid', 'high'],
})

assert.equal(smartSelectorExamples.length, 32)
smartSelectorExamples.forEach((example) => {
  const filters = applyDomainGuardrails({}, example.replace(/^Например:\s*/i, ''))
  assert.ok(Object.keys(filters).length >= 3, `${example}: expected at least 3 populated filter groups, got ${JSON.stringify(filters)}`)
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
assertIncludes(result.filters, {
  size: ['160x200'], firmness: ['hard'], type: ['spring', 'nospring'], fillings: ['memoryEffect', 'latex', 'nanoFoam'],
})
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
assertIncludes((await fallbackSelector.select('средняя жёсткость')).filters, {
  firmness: ['medium'], type: ['spring', 'nospring'], fillings: ['orthoFoam', 'latex'],
})
assert.equal(attemptedModels.length, 2)
assert.ok(attemptedModels[1].includes('gemini-3.5-flash-lite'))

console.log('Catalog smart select API contract ok')
