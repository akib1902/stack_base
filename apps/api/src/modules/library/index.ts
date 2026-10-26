import type { FastifyInstance } from 'fastify';
import type { Db } from '../../database/db';
import { registerFileRoutes } from './files-routes';
import { registerFolderRoutes } from './folders-routes';
import { registerSummaryRoutes } from './summary-routes';
import { registerTagRoutes } from './tags-routes';
import { registerTrashRoutes } from './trash-routes';

/** Metadata milestone routes: files, folders, tags, trash, search and summary. */
export function registerLibraryRoutes(app: FastifyInstance, deps: { db: Db }): void {
  registerFileRoutes(app, deps);
  registerFolderRoutes(app, deps);
  registerTagRoutes(app, deps);
  registerTrashRoutes(app, deps);
  registerSummaryRoutes(app, deps);
}
