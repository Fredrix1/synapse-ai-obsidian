export class SynapseError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message)
        this.name = "SynapseError"
    }
}

export class TimeoutError extends SynapseError {
    constructor(operation: string, timeoutMs: number) {
        super(`${operation} timed out after ${timeoutMs}ms`, "TIMEOUT")
        this.name = "TimeoutError"
    }
}

export class ApiError extends SynapseError {
    constructor(message: string, public readonly status?: number) {
        super(message, "API_ERROR")
        this.name = "ApiError"
    }
}
