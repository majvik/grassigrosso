import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'

import { syncCatalog, type CatalogImport } from './index'
import { MedusaCatalogRepository } from './medusa-repository'

const syncCatalogStep = createStep('grassigrosso-sync-catalog-step', async (input: CatalogImport, { container }) => {
  const report = await syncCatalog(input, new MedusaCatalogRepository(container))
  return new StepResponse(report)
})

export const syncCatalogWorkflow = createWorkflow('grassigrosso-sync-catalog', (input: CatalogImport) => {
  return new WorkflowResponse(syncCatalogStep(input))
})
