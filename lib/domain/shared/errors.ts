export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'SURVEY_CLOSED'
  | 'NOT_PUBLISHED'
  | 'QUESTIONS_FROZEN'
  | 'INVALID_ANSWER'
  | 'RESULTS_HIDDEN';

export class DomainError extends Error {
  constructor(
    public code: DomainErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}
