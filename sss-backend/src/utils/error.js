const handleError = (res, error, message = 'Server error', status = 500) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(message, error);
  }

  return res.status(status).json({
    success: false,
    message
  });
};

module.exports = {
  handleError
};
