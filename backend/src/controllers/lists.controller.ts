import type { Request, Response } from 'express';

/** GET /api/v1/lists/me */
export async function getMyLists(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/lists */
export async function createList(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/lists/:id */
export async function getListById(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** PUT /api/v1/lists/:id */
export async function updateList(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/lists/:id */
export async function deleteList(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/lists/:id/items */
export async function addListItem(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/lists/:id/items/:itemId */
export async function removeListItem(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/lists/:id/save */
export async function saveList(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/lists/:id/save */
export async function unsaveList(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
