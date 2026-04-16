function normalizePositiveInteger(value, fallback) {
  var parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

exports.getPaginationOptions = function getPaginationOptions(options, defaults) {
  var settings = defaults || {};
  var maxPageSize = settings.maxPageSize || 50;
  var page = normalizePositiveInteger(options && options.page, settings.page || 1);
  var pageSize = normalizePositiveInteger(options && options.pageSize, settings.pageSize || 10);

  return {
    page: page,
    pageSize: Math.min(pageSize, maxPageSize),
  };
};

exports.paginateItems = function paginateItems(items, options) {
  var page = options.page;
  var pageSize = options.pageSize;
  var totalCount = items.length;
  var totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  var currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  var startIndex = (currentPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    pagination: {
      page: currentPage,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: totalPages,
      hasPreviousPage: totalPages > 0 && currentPage > 1,
      hasNextPage: totalPages > 0 && currentPage < totalPages,
    },
  };
};
