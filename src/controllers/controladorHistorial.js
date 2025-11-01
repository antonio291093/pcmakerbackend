const { obtenerHistorialTecnico } = require("../models/historial");

exports.obtenerHistorialTecnico = async (req, res) => {
  try {
    const tecnicoId = req.userId; // viene del token JWT
    const historial = await obtenerHistorialTecnico(tecnicoId);
    res.json(historial);
  } catch (error) {
    console.error("Error obteniendo historial del técnico:", error);
    res.status(500).json({ message: "Error al obtener historial" });
  }
};
