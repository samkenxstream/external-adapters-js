import { Requester, Validator } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig, Config, InputParameters } from '@chainlink/ea-bootstrap'

export const supportedEndpoints = ['bandwidth']

export const inputParameters: InputParameters = {}

export const execute: ExecuteWithConfig<Config> = async (request, _, config) => {
  const validator = new Validator(request)

  const jobRunID = validator.validated.id

  const options = {
    ...config.api,
  }

  const response = await Requester.request<number>(options)
  const result = Requester.validateResultNumber({ result: response.data }, ['result'])

  return Requester.success(jobRunID, Requester.withResult(response, result), config.verbose)
}
