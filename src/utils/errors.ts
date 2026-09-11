export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Nicht berechtigt für diese Aktion") {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Nicht gefunden") {
    super(404, message);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(422, message);
  }
}
