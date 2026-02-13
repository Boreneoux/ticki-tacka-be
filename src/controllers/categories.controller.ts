import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { categoryService } from '../services/categories.service';

export const categoryController = {
    getAllCategories: catchAsync(async (_req: Request, res: Response) => {
        const result = await categoryService.getAllCategories();

        res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            data: result
        });
    })
};
