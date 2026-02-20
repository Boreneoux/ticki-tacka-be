import { body } from 'express-validator';

export const updateProfileValidator = [
  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters'),

  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),

  body('phoneNumber')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Phone number must be between 5 and 20 characters'),

  body('organizerName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Organizer name must be between 2 and 255 characters'),

  body('companyAddress')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5 })
    .withMessage('Company address must be at least 5 characters')
];

export const changePasswordValidator = [
  body('oldPassword').trim().notEmpty().withMessage('Old password is required'),

  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];
