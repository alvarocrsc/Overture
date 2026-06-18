import { Router } from 'express';
import {
  getMyLists,
  createList,
  getListById,
  updateList,
  deleteList,
  addListItem,
  removeListItem,
  saveList,
  unsaveList,
  uploadListIcon,
} from '../controllers/lists.controller';
import { verifyAccessToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// /me must be before /:id
router.get('/me', verifyAccessToken, getMyLists);

router.post('/', verifyAccessToken, createList);
router.get('/:id', getListById);
router.put('/:id', verifyAccessToken, updateList);
router.delete('/:id', verifyAccessToken, deleteList);
router.post('/:id/items', verifyAccessToken, addListItem);
router.delete('/:id/items/:itemId', verifyAccessToken, removeListItem);
router.post('/:id/save', verifyAccessToken, saveList);
router.delete('/:id/save', verifyAccessToken, unsaveList);
router.post('/:id/icon', verifyAccessToken, upload.single('icon'), uploadListIcon);

export default router;
