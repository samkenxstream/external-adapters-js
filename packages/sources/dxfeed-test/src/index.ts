import { expose, ServerInstance } from '@chainlink/external-adapter-framework'
import { Adapter } from '@chainlink/external-adapter-framework/adapter'
import { config } from './config'
import { price } from './endpoint'

export const adapter = new Adapter({
  defaultEndpoint: price.name,
  name: 'DXFEED',
  config,
  endpoints: [price],
})

export const server = (): Promise<ServerInstance | undefined> => expose(adapter)

export default { config }
export * from './endpoint'
