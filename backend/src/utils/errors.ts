export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NotFound = (resource: string) => new ApiError(404, "NOT_FOUND", `${resource} not found`);
export const Forbidden = (message = "You do not have access to this resource") =>
  new ApiError(403, "FORBIDDEN", message);
export const BadRequest = (message: string, details?: unknown) => new ApiError(400, "BAD_REQUEST", message, details);
export const Conflict = (message: string) => new ApiError(409, "CONFLICT", message);
