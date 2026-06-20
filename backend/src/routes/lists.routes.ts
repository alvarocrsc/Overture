import { Router } from 'express';
import {
  getMyLists,
  getListsByUserId,
  createList,
  getListById,
  updateList,
  deleteList,
  addListItem,
  removeListItem,
  saveList,
  unsaveList,
  likeList,
  unlikeList,
  uploadListIcon,
  getFolderContents,
  getFolderTree,
  createFolder,
} from '../controllers/lists.controller';
import { verifyAccessToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// /me and /user/:userId must be before /:id to avoid param collision.
router.get('/me', verifyAccessToken, getMyLists);
router.get('/user/:userId', getListsByUserId);

// Folder routes must be before /:id to avoid param collision.
router.get('/folder-contents', verifyAccessToken, getFolderContents);
router.get('/folders/tree', verifyAccessToken, getFolderTree);
router.post('/folders', verifyAccessToken, createFolder);

router.post('/', verifyAccessToken, createList);
router.get('/:id', getListById);
router.put('/:id', verifyAccessToken, updateList);
router.delete('/:id', verifyAccessToken, deleteList);
router.post('/:id/items', verifyAccessToken, addListItem);
router.delete('/:id/items/:itemId', verifyAccessToken, removeListItem);
router.post('/:id/save', verifyAccessToken, saveList);
router.delete('/:id/save', verifyAccessToken, unsaveList);
router.post('/:id/like', verifyAccessToken, likeList);
router.delete('/:id/like', verifyAccessToken, unlikeList);
router.post('/:id/icon', verifyAccessToken, upload.single('icon'), uploadListIcon);

export default router;
