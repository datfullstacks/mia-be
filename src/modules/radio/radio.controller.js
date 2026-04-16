var radioService = require('./radio.service');

exports.listStations = async function listStations(_req, res, next) {
  try {
    res.json({
      items: await radioService.listVietnameseStations(),
    });
  } catch (error) {
    next(error);
  }
};
