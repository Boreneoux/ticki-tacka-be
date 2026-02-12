import { Router } from "express";
import {
  create,
  getAll,
  getDetail,
  update,
  remove,
} from "../controllers/events.controller";
import { verifyToken, roleGuard } from "../middlewares/auth.middleware";
import { multerUpload } from "../helpers/multer.helper";

const router = Router();

/**
 * PUBLIC ROUTES
 */
router.get("/", getAll);
router.get("/:slug", getDetail);

/**
 * ORGANIZER ROUTES (EO)
 */
router.post(
  "/",
  verifyToken,
  roleGuard("EO"),
  multerUpload("", "IMG-EVENT").array("images", 3),
  create
);

router.put(
  "/:id",
  verifyToken,
  roleGuard("EO"),
  multerUpload("", "IMG-EVENT").array("images", 3),
  update
);

router.delete(
  "/:id",
  verifyToken,
  roleGuard("EO"),
  remove
);

export default router;
