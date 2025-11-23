export function latencyLogger(req, res, next) {
  const start = process.hrtime.bigint(); 
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6; 
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${ms.toFixed(2)} ms`
    );
  });
  next();
}