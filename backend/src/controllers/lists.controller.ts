import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as listsService from '../services/lists.service';
import { AppError } from '../utils/app-error';
import {
  createListSchema,
  updateListSchema,
  addListItemSchema,
  createFolderSchema,
} from '../validators/list.validators';
import type { AuthPayload } from '../types/auth.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Attempts to decode the Bearer token from the Authorization header without
 * throwing. Returns the userId if the token is valid, or undefined otherwise.
 * Used for routes that are public but can optionally use auth context.
 * @param req - The Express request object.
 * @returns The authenticated userId, or undefined.
 */
function tryDecodeUserId(req: Request): number | undefined {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  const token = authHeader.slice(7);
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) return undefined;
  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    return decoded.userId;
  } catch {
    return undefined;
  }
}

/**
 * Parses a numeric ID from a route parameter string, throwing 400 if invalid.
 * @param value - The raw string from req.params.
 * @param label - Human-readable label used in the error message.
 * @returns The parsed integer ID.
 */
function parseId(value: string, label: string): number {
  const id = Number(value);
  if (isNaN(id)) throw new AppError(`Invalid ${label}`, 400);
  return id;
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/** GET /api/v1/lists/me */
export async function getMyLists(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const limit = Math.min(Number(req.query['limit'] ?? 20) || 20, 100);
  const page = Math.max(Number(req.query['page'] ?? 1) || 1, 1);
  const result = await listsService.getMyLists(userId, page, limit);
  res.status(200).json(result);
}

/** GET /api/v1/lists/user/:userId */
export async function getListsByUserId(req: Request, res: Response): Promise<void> {
  const targetUserId = parseId(String(req.params['userId']), 'user ID');
  const rows = await listsService.getUserLists(targetUserId);
  res.status(200).json({ data: rows });
}

/** POST /api/v1/lists */
export async function createList(req: Request, res: Response): Promise<void> {
  const data = createListSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await listsService.createList(userId, data);
  res.status(201).json({ data: result, message: 'List created' });
}

/** POST /api/v1/lists/:id/pin */
export async function pinList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;
  await listsService.pinListService(userId, listId);
  res.status(200).json({ message: 'List pinned' });
}

/** DELETE /api/v1/lists/:id/pin */
export async function unpinList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;
  await listsService.unpinListService(userId, listId);
  res.status(200).json({ message: 'List unpinned' });
}
export async function getFolderContents(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const rawFolderId = req.query['folder_id'];
  const folderId =
    rawFolderId === undefined || rawFolderId === ''
      ? null
      : parseId(String(rawFolderId), 'folder ID');
  const result = await listsService.getFolderContentsService(userId, folderId);
  res.status(200).json({
    data: { folders: result.folders, lists: result.lists },
    currentFolder: result.currentFolder,
  });
}

/** GET /api/v1/lists/folders/tree */
export async function getFolderTree(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await listsService.getFolderTreeService(userId);
  res
    .status(200)
    .json({ data: { folders: result.folders, rootListsCount: result.rootListsCount } });
}

/** POST /api/v1/lists/folders */
export async function createFolder(req: Request, res: Response): Promise<void> {
  const data = createFolderSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await listsService.createFolderService(
    userId,
    data.name,
    data.parent_folder_id ?? null,
  );
  res.status(201).json({ data: result, message: 'Folder created' });
}

/** GET /api/v1/lists/:id */
export async function getListById(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  // This route has no auth middleware; manually attempt token decode so
  // private list ownership can be verified.
  const requestingUserId = req.user?.userId ?? tryDecodeUserId(req);
  const result = await listsService.getListById(listId, requestingUserId);
  res.status(200).json({ data: result });
}

/** PUT /api/v1/lists/:id */
export async function updateList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const data = updateListSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await listsService.updateList(listId, userId, data);
  res.status(200).json({ data: result, message: 'List updated' });
}

/** DELETE /api/v1/lists/:id */
export async function deleteList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;
  await listsService.deleteList(listId, userId);
  res.status(200).json({ message: 'List deleted' });
}

/** POST /api/v1/lists/:id/items */
export async function addListItem(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const data = addListItemSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await listsService.addListItem(listId, userId, data);
  res.status(201).json({ data: result, message: 'Added to list' });
}

/** DELETE /api/v1/lists/:id/items/:itemId */
export async function removeListItem(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const itemId = parseId(String(req.params['itemId']), 'item ID');
  const userId = req.user!.userId;
  await listsService.removeListItem(listId, itemId, userId);
  res.status(200).json({ message: 'Removed from list' });
}

/** POST /api/v1/lists/:id/save */
export async function saveList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;
  await listsService.saveList(listId, userId);
  res.status(200).json({ message: 'List saved' });
}

/** DELETE /api/v1/lists/:id/save */
export async function unsaveList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;
  await listsService.unsaveList(listId, userId);
  res.status(200).json({ message: 'List unsaved' });
}

/** POST /api/v1/lists/:id/like */
export async function likeList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;
  await listsService.likeList(listId, userId);
  res.status(200).json({ message: 'List liked' });
}

/** DELETE /api/v1/lists/:id/like */
export async function unlikeList(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;
  await listsService.unlikeList(listId, userId);
  res.status(200).json({ message: 'List unliked' });
}

/** POST /api/v1/lists/:id/icon (multipart/form-data, field: `icon`) */
export async function uploadListIcon(req: Request, res: Response): Promise<void> {
  const listId = parseId(String(req.params['id']), 'list ID');
  const userId = req.user!.userId;

  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  const result = await listsService.uploadListIconService(
    listId,
    userId,
    req.file.buffer,
    req.file.mimetype,
  );

  res.status(200).json({
    data: result,
    message: 'List icon updated',
  });
}
