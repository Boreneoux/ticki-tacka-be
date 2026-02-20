import { query } from 'express-validator';

export const getEventsValidator = [
  query('status').optional().isString(),

  query('search').optional().isString(),

  query('category').optional().isString(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

export const getAttendeesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

export const getStatisticsValidator = [
  query('filterBy')
    .optional()
    .isIn(['year', 'month', 'day'])
    .withMessage('filterBy must be one of: year, month, day'),

  query('year').optional().isInt().withMessage('Year must be a valid integer'),

  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12')
];
