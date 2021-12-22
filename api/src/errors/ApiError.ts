import { StatusCode } from "./StatusCode";

export class ApiError {
    constructor(
        public readonly statusCode: StatusCode,
        public readonly code: string,
        public readonly message: string
    ) {}

    toJSON() {
        return {
            statusCode: this.statusCode,
            code: this.code,
            message: this.message
        }
    }
}