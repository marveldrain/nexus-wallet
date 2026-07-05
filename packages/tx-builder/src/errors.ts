/** Errors for transaction construction. User-safe messages, no secrets. */

export type TxErrorCode = 'INSUFFICIENT_FUNDS' | 'INVALID_AMOUNT' | 'INVALID_ADDRESS' | 'DUST_OUTPUT';

export class TxBuildError extends Error {
  readonly code: TxErrorCode;
  constructor(code: TxErrorCode, message: string) {
    super(message);
    this.name = 'TxBuildError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientFundsError extends TxBuildError {
  constructor(message = 'Not enough balance to cover the amount plus network fee.') {
    super('INSUFFICIENT_FUNDS', message);
    this.name = 'InsufficientFundsError';
  }
}

export class InvalidAmountError extends TxBuildError {
  constructor(message = 'The amount must be a positive number.') {
    super('INVALID_AMOUNT', message);
    this.name = 'InvalidAmountError';
  }
}
