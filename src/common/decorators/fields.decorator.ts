import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Fields = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] | null => {
    const request = ctx.switchToHttp().getRequest();
    const fields = request.query.fields as string;

    if (!fields) return null;

    // Parse comma-separated fields and trim whitespace
    return fields.split(',').map((field) => field.trim());
  },
);
