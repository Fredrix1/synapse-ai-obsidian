export function err2String(err: unknown, includeStack?: boolean): string {
    if (err instanceof Error) {
        if (includeStack && err.stack) {
            return err.message + "\n" + err.stack;
        } else {
            return err.message;
        }
    } else if (typeof err === "string") {
        return err;
    } else {
        return String(err);
    }
}