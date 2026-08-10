import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return request.user?.[data];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return request.user;
  },
);
