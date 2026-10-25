import { Type, type Static } from '@sinclair/typebox';
import { ERROR_CODES, type ErrorCode } from './errors';

export const ThemeSchema = Type.Union([Type.Literal('amber'), Type.Literal('graphite')]);
export type Theme = Static<typeof ThemeSchema>;

export const DefaultViewSchema = Type.Union([Type.Literal('grid'), Type.Literal('list')]);
export type DefaultView = Static<typeof DefaultViewSchema>;

export const ErrorCodeSchema = Type.Unsafe<ErrorCode>(
  Type.Union(ERROR_CODES.map((code) => Type.Literal(code))),
);

export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: ErrorCodeSchema,
    message: Type.String(),
    details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  }),
});
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export const HealthResponseSchema = Type.Object({
  status: Type.Union([Type.Literal('ok'), Type.Literal('degraded')]),
  version: Type.String(),
  uptimeSeconds: Type.Integer(),
  database: Type.Union([Type.Literal('ok'), Type.Literal('unavailable'), Type.Literal('not_checked')]),
});
export type HealthResponse = Static<typeof HealthResponseSchema>;
