declare module 'bcryptjs' {
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hash(data: string, salt: number | string): Promise<string>;
  export function genSalt(rounds?: number): Promise<string>;
  const _default: { compare: typeof compare; hash: typeof hash; genSalt: typeof genSalt };
  export default _default;
}