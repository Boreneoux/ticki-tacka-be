import { body } from 'express-validator';

export const createTicketTypeValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Ticket type name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Ticket type name must be between 2 and 100 characters'),

  body('description').optional({ checkFalsy: true }).trim(),

  body('price')
    .exists()
    .withMessage('Ticket price is required')
    .isInt({ min: 0 })
    .withMessage('Ticket price must be 0 or greater')
    .toInt(),

  body('quota')
    .exists()
    .withMessage('Ticket quota is required')
    .isInt({ min: 1 })
    .withMessage('Ticket quota must be at least 1')
    .toInt()
];

export const updateTicketTypeValidator = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ticket type name must be between 2 and 100 characters'),

  body('description').optional({ checkFalsy: true }).trim(),

  body('price')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Ticket price must be 0 or greater')
    .toInt(),

  body('quota')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Ticket quota must be at least 1')
    .toInt()
];
