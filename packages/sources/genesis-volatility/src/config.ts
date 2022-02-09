import { Requester } from '@chainlink/ea-bootstrap'
import { Config } from '@chainlink/types'

export const NAME = 'GENESIS_VOLATILITY'

export const DEFAULT_BASE_URL = 'https://app.pinkswantrading.com'
export const DEFAULT_ENDPOINT = 'volatility'

export const makeConfig = (prefix?: string): Config => {
  const config = Requester.getDefaultConfig(prefix, true)
  config.api.baseURL = config.api.baseURL || DEFAULT_BASE_URL
  config.defaultEndpoint = DEFAULT_ENDPOINT
  return config
}
