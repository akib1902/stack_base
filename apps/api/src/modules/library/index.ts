import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { registerFileRoutes } from './files-routes';
import { registerFolderRoutes } from './folders-routes';
import { registerInsightsRoutes } from './insights-routes';
import { registerSummaryRoutes } from './summary-routes';
import { registerTagRoutes } from './tags-routes';
import { registerTrashRoutes } from './trash-routes';

/** Metadata milestone routes: files, folders, tags, trash, search, summary, insights. */
export function registerLibraryRoutes(
  app: FastifyInstance,
  deps: { db: Db; config: Config },
): void {
  registerFileRoutes(app, deps);
  registerFolderRoutes(app, deps);
  registerTagRoutes(app, deps);
  registerTrashRoutes(app, deps);
  registerSummaryRoutes(app, deps);
  registerInsightsRoutes(app, deps);
}
