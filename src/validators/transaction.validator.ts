import { body, query } from 'express-validator';

export const createTransactionValidator = [
  body('eventId')
    .trim()
    .notEmpty()
    .withMessage('Event ID is required')
    .isUUID()
    .withMessage('Event ID must be a valid UUID'),

  body('items')
    .exists()
    .withMessage('Items are required')
    .isArray({ min: 1 })
    .withMessage('At least one ticket item is required'),

  body('items.*.ticketTypeId')
    .trim()
    .notEmpty()
    .withMessage('Ticket type ID is required')
    .isUUID()
    .withMessage('Ticket type ID must be a valid UUID'),

  body('items.*.quantity')
    .exists()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
    .toInt(),

  body('usePoints')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('usePoints must be a boolean')
    .toBoolean(),

  body('userCouponId')
    .optional({ checkFalsy: true })
    .trim()
    .isUUID()
    .withMessage('User coupon ID must be a valid UUID'),

  body('eventVoucherId')
    .optional({ checkFalsy: true })
    .trim()
    .isUUID()
    .withMessage('Event voucher ID must be a valid UUID')
];

export const getCustomerTransactionsValidator = [
  query('status').optional().isString(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

export const getOrganizerTransactionsValidator = [
  query('status').optional().isString(),

  query('eventId')
    .optional()
    .isUUID()
    .withMessage('Event ID must be a valid UUID'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];
