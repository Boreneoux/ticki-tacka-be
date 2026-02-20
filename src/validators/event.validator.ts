import { body, query } from 'express-validator';

export const createEventValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Event name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Event name must be between 3 and 255 characters'),

  body('categoryId')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),

  body('eventDate')
    .trim()
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Event date must be a valid date'),

  body('eventTime').trim().notEmpty().withMessage('Event time is required'),

  body('endDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601()
    .withMessage('End date must be a valid date'),

  body('endTime').optional({ checkFalsy: true }).trim(),

  body('cityId')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isUUID()
    .withMessage('City ID must be a valid UUID'),

  body('venueName')
    .trim()
    .notEmpty()
    .withMessage('Venue name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Venue name must be between 2 and 255 characters'),

  body('venueAddress')
    .trim()
    .notEmpty()
    .withMessage('Venue address is required')
    .isLength({ min: 5 })
    .withMessage('Venue address must be at least 5 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),

  body('ticketTypes').exists().withMessage('Ticket types are required')
];

export const updateEventValidator = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Event name must be between 3 and 255 characters'),

  body('categoryId')
    .optional({ checkFalsy: true })
    .trim()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),

  body('eventDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601()
    .withMessage('Event date must be a valid date'),

  body('eventTime').optional({ checkFalsy: true }).trim(),

  body('endDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601()
    .withMessage('End date must be a valid date'),

  body('endTime').optional({ checkFalsy: true }).trim(),

  body('cityId')
    .optional({ checkFalsy: true })
    .trim()
    .isUUID()
    .withMessage('City ID must be a valid UUID'),

  body('venueName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Venue name must be between 2 and 255 characters'),

  body('venueAddress')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5 })
    .withMessage('Venue address must be at least 5 characters'),

  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters')
];

export const getAllEventsValidator = [
  query('search').optional().isString(),

  query('category')
    .optional()
    .isUUID()
    .withMessage('Category must be a valid UUID'),

  query('city').optional().isUUID().withMessage('City must be a valid UUID'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

export const createVoucherValidator = [
  body('voucherCode')
    .trim()
    .notEmpty()
    .withMessage('Voucher code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Voucher code must be between 3 and 20 characters'),

  body('voucherName')
    .trim()
    .notEmpty()
    .withMessage('Voucher name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Voucher name must be between 3 and 255 characters'),

  body('discountType')
    .trim()
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be either percentage or fixed'),

  body('discountValue')
    .exists()
    .withMessage('Discount value is required')
    .isInt({ min: 1 })
    .withMessage('Discount value must be at least 1')
    .toInt(),

  body('maxUsage')
    .exists()
    .withMessage('Max usage is required')
    .isInt({ min: 1 })
    .withMessage('Max usage must be at least 1')
    .toInt(),

  body('maxDiscount')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Max discount must be 0 or greater')
    .toInt(),

  body('startDate')
    .trim()
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  body('expiredAt')
    .trim()
    .notEmpty()
    .withMessage('Expiration date is required')
    .isISO8601()
    .withMessage('Expiration date must be a valid date')
];
