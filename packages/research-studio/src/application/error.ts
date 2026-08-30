/** Stable business rejection translated by the Typert adapter. */
export class ResearchStudioApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message)
    this.name = 'ResearchStudioApplicationError'
  }
}
