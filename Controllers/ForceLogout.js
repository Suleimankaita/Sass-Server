const asyncHandler = require('express-async-handler');

// Single User Logout
const LogOut = asyncHandler(async (req, res) => {

  res.clearCookie('AdminCookie', {
    httpOnly: true,
    secure:true,
    sameSite: 'none',
  });
  res.clearCookie('jwt', {
    httpOnly: true,
    secure:true,
    sameSite: 'none',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:true,
    sameSite: 'none',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});


module.exports = {LogOut};
