import types from '@chainlink/types'
import { Requester, Logger } from '@chainlink/ea-bootstrap'
import { util } from '@chainlink/ea-bootstrap'

/**
 * @swagger
 * securityDefinitions:
 *  environment-variables:
 *    API_ENDPOINT:
 *      required: false
 *      default: https://api.s0.t.hmny.io
 *    PRIVATE_KEY:
 *      required: true
 *    CHAIN_ID:
 *      required: false
 *      default: 1
 *    GAS_LIMIT:
 *      required: false
 *      default: 6721900
 */

export const DEFAULT_API_ENDPOINT = 'https://api.s0.t.hmny.io'
export const DEFAULT_CHAIN_ID = 1
export const DEFAULT_GAS_LIMIT = 6721900

const ENV_PRIVATE_KEY = 'PRIVATE_KEY'
const ENV_CHAIN_ID = 'CHAIN_ID'
const ENV_GAS_LIMIT = 'GAS_LIMIT'

export type Config = types.Config & {
  privateKey: string
  chainID: string
  gasLimit: string
}

export const makeConfig = (prefix?: string): Config => {
  const defaultConfig = Requester.getDefaultConfig(prefix)
  defaultConfig.api.baseURL = defaultConfig.api.baseURL || DEFAULT_API_ENDPOINT
  return {
    ...defaultConfig,
    privateKey: util.getRequiredEnv(ENV_PRIVATE_KEY, prefix),
    chainID: util.getEnv(ENV_CHAIN_ID, prefix) || `${DEFAULT_CHAIN_ID}`,
    gasLimit: util.getEnv(ENV_GAS_LIMIT, prefix) || `${DEFAULT_GAS_LIMIT}`,
  }
}

// Config without sensitive data
const redact = (config: Config) => ({ ...config, apiKey: '*****', privateKey: '*****' })

export function logConfig(config: Config): void {
  Logger.debug('Adapter configuration:', { config: config && redact(config) })
}
