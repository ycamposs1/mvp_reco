require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,

  compreface: {
    baseUrl: process.env.COMPREFACE_BASE_URL || 'http://localhost:8000',
    recognitionServiceId: process.env.COMPREFACE_RECOGNITION_SERVICE_ID,
    apiKey: process.env.COMPREFACE_API_KEY
  }
};
