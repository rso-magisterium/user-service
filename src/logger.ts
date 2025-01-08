import pino from "pino";

export default pino({
  name: "user-service",
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["tokens", "token", "*.password"],
  },
});
