/** All public entry points to the same account area, including legacy links. */
export const AUTH_LOGIN_PATH = '/app/login';
export const AUTH_REGISTER_PATH = '/app/register';

export const isAuthPage = (pathname: string) =>
  pathname === '/auth' || pathname === AUTH_LOGIN_PATH || pathname === AUTH_REGISTER_PATH;
