export class RpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpcError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
