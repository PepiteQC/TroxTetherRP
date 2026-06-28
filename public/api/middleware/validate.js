// C:\troxtetherworld\public\api\middleware\validate.js
// Validation avec Zod

import { z } from 'zod';

// Schémas
export const schemas = {
  player: z.object({
    identifier: z.string().min(3).max(32),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    }).optional(),
    rotation: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    }).optional()
  }),

  adminCommand: z.object({
    prompt: z.string().min(4).max(1200),
    params: z.record(z.any()).optional()
  }),

  punishment: z.object({
    targetId: z.string(),
    type: z.enum(['warn', 'mute', 'kick', 'ban', 'tempban', 'permban']),
    reason: z.string().min(5).max(500),
    duration: z.number().optional()
  }),

  economy: z.object({
    playerId: z.string(),
    amount: z.number().positive().max(10000000),
    type: z.enum(['money', 'bank', 'item']),
    reason: z.string().optional()
  }),

  faction: z.object({
    name: z.string().min(2).max(50),
    type: z.enum(['gang', 'police', 'ems', 'government', 'corporation']),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    maxMembers: z.number().min(1).max(200).optional()
  }),

  message: z.object({
    message: z.string().min(1).max(500),
    type: z.enum(['global', 'faction', 'whisper', 'radio']).optional(),
    targetId: z.string().optional()
  })
};

export function validate(schema) {
  return async (req, res, next) => {
    try {
      const data = await schema.parseAsync(req.body);
      req.validatedData = data;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Données invalides',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}