import { AdapterRequest, Execute, MakeWSHandler, Middleware } from '@chainlink/types'
import { Store } from 'redux'
import { withMiddleware } from '../../../index'
import { logger } from '../../modules'
import { getFeedId } from '../../metrics/util'
import * as util from '../../util'
import { getWSConfig } from '../ws/config'
import { getSubsId, RootState as WSState } from '../ws/reducer'
import { separateBatches } from '../ws/utils'
import * as actions from './actions'
import { CacheWarmerState } from './reducer'
import { getSubscriptionKey } from './util'
import { DEFAULT_CACHE_ENABLED } from '../cache'

export * as actions from './actions'
export * as epics from './epics'
export * as reducer from './reducer'

export const DEFAULT_WARMUP_ENABLED = true

interface WSInput {
  store: Store<WSState>
  makeWSHandler?: MakeWSHandler
}

export const withCacheWarmer =
  (warmerStore: Store<CacheWarmerState>, middleware: Middleware[], ws: WSInput) =>
  (rawExecute: Execute): Middleware =>
  async (execute, context) =>
  async (input: AdapterRequest) => {
    const isWarmerActive =
      util.parseBool(util.getEnv('CACHE_ENABLED') ?? DEFAULT_CACHE_ENABLED) &&
      util.parseBool(util.getEnv('WARMUP_ENABLED') ?? DEFAULT_WARMUP_ENABLED)
    if (!isWarmerActive) return await execute(input, context)

    const wsConfig = getWSConfig(input.data.endpoint)
    const warmupSubscribedPayload: actions.WarmupSubscribedPayload = {
      ...input,
      // We need to initilialize the middleware on every beat to open a connection with the cache
      // Wrapping `rawExecute` as `execute` is already wrapped with the default middleware. Warmer doesn't need every default middleware
      executeFn: async (input: AdapterRequest) =>
        await (
          await withMiddleware(rawExecute, context, middleware)
        )(input, context),
      // Dummy result
      result: {
        jobRunID: '1',
        statusCode: 200,
        data: {},
        result: 1,
      },
    }

    if (wsConfig.enabled && ws.makeWSHandler) {
      // If WS is available, and there is an active subscription, warmer should not be active
      const wsHandler = await ws.makeWSHandler()

      let batchMemberHasActiveWSSubscription = false
      await separateBatches(input, async (singleInput: AdapterRequest) => {
        const wsSubscriptionKey = getSubsId(wsHandler.subscribe(singleInput))
        const cacheWarmerKey = getSubscriptionKey(warmupSubscribedPayload)

        // Could happen that a subscription is still loading. If that's the case, warmer will open a subscription. If the WS becomes active, on next requests warmer will be unsubscribed
        const isActiveWSSubscription =
          ws.store.getState().subscriptions.all[wsSubscriptionKey]?.active
        // If there is a WS subscription active, warmup subscription (if exists) should be removed, and not play for the moment
        const isActiveCWSubsciption = warmerStore.getState().subscriptions[cacheWarmerKey]
        if (isActiveWSSubscription) {
          if (isActiveCWSubsciption) {
            logger.info(
              `Active WS feed detected: disabling cache warmer for ${getFeedId(singleInput)}`,
            )
            // If there is a Batch WS subscription active, warmup subscription should be removed
            if (isActiveCWSubsciption.parent && isActiveCWSubsciption.batchablePropertyPath)
              warmerStore.dispatch(
                actions.warmupLeaveGroup({
                  parent: isActiveCWSubsciption.parent,
                  childLastSeenById: { [cacheWarmerKey]: Date.now() },
                  batchablePropertyPath: isActiveCWSubsciption.batchablePropertyPath,
                }),
              )
            const isBatched =
              !!warmerStore.getState().subscriptions[cacheWarmerKey]?.childLastSeenById
            warmerStore.dispatch(
              actions.warmupUnsubscribed({
                key: cacheWarmerKey,
                isBatched,
                reason: 'Turning off Cache Warmer to use WS.',
              }),
            )
          }
          batchMemberHasActiveWSSubscription = true
        }
      })
      if (batchMemberHasActiveWSSubscription) {
        return await execute(input, context)
      }
    }

    // In case WS is not available, or WS has no active subscription, warmer should be active
    // Dispatch subscription only if execute was succesful
    const result = await execute(input, context)

    const warmupExecutePayload: actions.WarmupExecutePayload = {
      ...input,
      executeFn: async (input: AdapterRequest) =>
        await (
          await withMiddleware(rawExecute, context, middleware)
        )(input, context),
      result,
    }
    warmerStore.dispatch(actions.warmupExecute(warmupExecutePayload))

    return result
  }
