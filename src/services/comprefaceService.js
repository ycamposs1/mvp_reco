const axios = require('axios');
const { compreface } = require('../config');

// Endpoint correcto para reconocimiento
// http://localhost:8000/api/v1/recognition/recognize
const recognitionUrl = `${compreface.baseUrl}/api/v1/recognition/recognize`;

async function recognizeFaceFromBase64(imageBase64) {
  // Puedes tunear estos parámetros si quieres
  const url = `${recognitionUrl}?limit=1&prediction_count=1&det_prob_threshold=0.8`;

  // Para Base64, según la doc, el campo se llama "file"
  // y se envía como JSON: {"file": "<base64>"}
  const payload = {
    file: imageBase64
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': compreface.apiKey   // API key del servicio de *reconocimiento*
  };

  try {
    const { data } = await axios.post(url, payload, { headers });

    // misma lógica que antes
    if (!data.result || data.result.length === 0) {
      return null;
    }

    const first = data.result[0];
    if (!first.subjects || first.subjects.length === 0) {
      return null;
    }

    const best = first.subjects[0];
    return {
      subject: best.subject,
      similarity: best.similarity,
      raw: data
    };
  } catch (err) {
    // Si CompreFace devuelve 400 con code 28 ("No face is found"), lo manejamos como null
    if (err.response && err.response.status === 400 && err.response.data?.code === 28) {
      console.warn('CompreFace: No face found in image.');
      return null;
    }

    // Manejar error 500 con code 41 (Error during synchronization... Unexpected end of file)
    // Esto suele pasar cuando no detecta nada o la imagen es mala y el core falla.
    if (err.response && err.response.status === 500 && err.response.data?.code === 41) {
      console.warn('CompreFace: Sync error (code 41) - likely no face found or bad image.');
      return null;
    }

    console.error('Error llamando a CompreFace:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = {
  recognizeFaceFromBase64
};
