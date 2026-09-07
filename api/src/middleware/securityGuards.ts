import { NextFunction, Response } from 'express'
import { AuthenticatedRequest } from './auth'
import { errorResponse } from '../types/express'
import { isKillSwitchEnabled, KillSwitchKey } from '../utils/killSwitch'
import { isCapabilityRestricted, AccountCapability } from '../utils/accountRestrictions'

export function killSwitchGuard(key: KillSwitchKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.isAdmin) return next()
    if (await isKillSwitchEnabled(key)) {
      return errorResponse(res, `This feature is temporarily disabled by PickAmGo. Please try again later.`, 503, 'FEATURE_DISABLED')
    }
    next()
  }
}

export function capabilityGuard(capability: AccountCapability) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return errorResponse(res, 'Authentication required', 401)
    if (req.user.isAdmin) return next()

    if (await isCapabilityRestricted(req.user.id, capability)) {
      return errorResponse(res, `Your account has restricted access to ${capability}. Contact support for assistance.`, 403, 'CAPABILITY_RESTRICTED')
    }
    next()
  }
}