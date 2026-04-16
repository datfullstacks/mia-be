exports.getHealth = function getHealth(_req, res) {
  res.json({
    ok: true,
    service: 'mia-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
};
