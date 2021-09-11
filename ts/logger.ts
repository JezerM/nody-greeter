import winston from "winston";
import * as path from "path";

Object.defineProperty(global, "__stack", {
  get: function () {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
      return stack;
    };
    var err = new Error();
    Error.captureStackTrace(err, arguments.callee);
    var stack: NodeJS.CallSite[] = err.stack as any;
    Error.prepareStackTrace = orig;
    return stack;
  },
});

Object.defineProperty(global, "__line", {
  get: function () {
    let stack: NodeJS.CallSite[] = __stack;
    if (stack[2]) return stack[2].getLineNumber();
    return stack[1].getLineNumber();
  },
});
Object.defineProperty(global, "__source", {
  get: function () {
    let stack: NodeJS.CallSite[] = __stack;
    if (stack[2]) return stack[2].getFileName();
    return stack[1].getFileName();
  },
});

declare global {
  var __line: number;
  var __stack: NodeJS.CallSite[];
  var __source: string;
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
    this.debug("Logger created");
  }

  debug(message: string) {
    this.winston_logger.log({
      level: "debug",
      message: message,
      line: __line,
      source: path.basename(__source),
    });
  }
  warn(message: string) {
    this.winston_logger.log({
      level: "warn",
      message: message,
      line: __line,
      source: path.basename(__source),
    });
  }
  error(message: string) {
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
  }) {
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
