import type { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  updateStoresWorkflow,
} from '@medusajs/medusa/core-flows'

export default async function seedCommerceFoundation({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeService = container.resolve(Modules.STORE)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const regionService = container.resolve(Modules.REGION)

  const [store] = await storeService.listStores()
  let [salesChannel] = await salesChannelService.listSalesChannels({ name: 'Grassigrosso B2C' })
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: 'Grassigrosso B2C' }] },
    })
    salesChannel = result[0]
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: salesChannel.id,
        supported_currencies: [{ currency_code: 'rub', is_default: true }],
      },
    },
  })

  const existingRegions = await regionService.listRegions({ name: 'Россия' })
  if (!existingRegions.length) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: 'Россия',
            currency_code: 'rub',
            countries: ['ru'],
            payment_providers: ['pp_system_default'],
          },
        ],
      },
    })
  }
  logger.info('Grassigrosso commerce foundation is seeded')
}
