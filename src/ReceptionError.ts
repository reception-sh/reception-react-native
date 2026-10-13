export class ReceptionError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(`Reception: ${code} (${status})`);
    this.name = 'ReceptionError';
  }

  static from(error: unknown): ReceptionError {
    if (error instanceof ReceptionError) return error;
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      const status =
        'status' in error && typeof error.status === 'number'
          ? error.status
          : 0;
      return new ReceptionError(error.code, status);
    }
    return new ReceptionError('bridge_error', 0);
  }
}
