import winston from "winston";
import * as path from "path";

Object.defineProperty(global, "__stack", {
  get: function () {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack): NodeJS.CallSite[] {
      return stack;
    };
    const err = new Error();
    Error.captureStackTrace(err, arguments.callee);
    const stack: NodeJS.CallSite[] = err.stack as unknown as NodeJS.CallSite[];
    Error.prepareStackTrace = orig;
    return stack;
  },
});

Object.defineProperty(global, "__line", {
  get: function () {
    const stack: NodeJS.CallSite[] = __stack;
    if (stack[2]) return stack[2].getLineNumber();
    return stack[1].getLineNumber();
  },
});
Object.defineProperty(global, "__source", {
  get: function (): string {
    const stack: NodeJS.CallSite[] = __stack;
    if (stack[2]) return stack[2].getFileName() || "";
    return stack[1].getFileName() || "";
  },
});

declare global {
  const __line: number;
  const __stack: NodeJS.CallSite[];
  const __source: string;
}

const myFormat = winston.format.printf(
  ({ level, message, source, line, timestamp }) => {
    return `${timestamp} [ ${level.toLocaleUpperCase()} ] ${source} ${line}: ${message}`;
  }
);

const winston_logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    myFormat
  ),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.Console({
      stderrLevels: ["debug", "warn", "error"],
    }),
  ],
  exitOnError: false,
});

class Logger {
  private winston_logger: winston.Logger;
  constructor() {
    this.winston_logger = winston_logger;
  }

  debug(message: string): void {
    this.winston_logger.log({
      level: "debug",
      message: message,
      line: __line,
      source: path.basename(__source),
    });
  }
  warn(message: string): void {
    this.winston_logger.log({
      level: "warn",
      message: message,
      line: __line,
      source: path.basename(__source),
    });
  }
  error(message: string): void {
    this.winston_logger.log({
      level: "error",
      message: message,
      line: __line,
      source: path.basename(__source),
    });
  }
  log({
    level,
    message,
    line,
    source,
  }: {
    level: string;
    message: string;
    line: number;
    source: string;
  }): void {
    this.winston_logger.log({
      level: level,
      message: message,
      line: line,
      source: source,
    });
  }
}

const logger = new Logger();

export { logger };
