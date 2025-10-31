const {
  agregarOActualizarInventario,
  obtenerInventario,
  obtenerInventarioPorId,
  actualizarInventario,
  eliminarInventario,
  descontarStockInventario,
  aumentarStockInventario,
  validarStockInventario,
} = require("../models/inventario");

exports.aumentarStockInventario = async (req, res) => {
  try {
    const { memoria_ram_id, almacenamiento_id, cantidad } = req.body;
    const itemActualizado = await aumentarStockInventario({
      memoria_ram_id,
      almacenamiento_id,
      cantidad,
    });
    res.json(itemActualizado);
  } catch (error) {
    console.error("Error aumentando stock inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Controlador para descontar stock
exports.descontarStockInventario = async (req, res) => {
  try {
    const { memoria_ram_id, almacenamiento_id, cantidad } = req.body;
    const itemActualizado = await descontarStockInventario({
      memoria_ram_id,
      almacenamiento_id,
      cantidad,
    });
    res.json(itemActualizado);
  } catch (error) {
    console.error("Error descontando stock inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.crearInventario = async (req, res) => {
  try {
    const item = await agregarOActualizarInventario(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creando inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener todo inventario
exports.obtenerInventario = async (req, res) => {
  try {
    const items = await obtenerInventario();
    res.json(items);
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener ítem inventario por ID
exports.obtenerInventarioPorId = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const item = await obtenerInventarioPorId(id);
    if (!item) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error al obtener ítem inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar ítem inventario
exports.actualizarInventario = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const itemActualizado = await actualizarInventario(id, req.body);
    if (!itemActualizado) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }
    res.json(itemActualizado);
  } catch (error) {
    console.error("Error al actualizar inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar ítem inventario
exports.eliminarInventario = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const itemEliminado = await eliminarInventario(id);
    if (!itemEliminado) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }
    res.json({ message: "Ítem eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.validarStockInventario = async (req, res) => {
  try {
    const { memoria_ram_id, almacenamiento_id, cantidad } = req.query;
    if (!cantidad)
      return res.status(400).json({ error: "Debe indicar cantidad a validar" });

    const cantidadNum = parseInt(cantidad);
    const tieneStock = await validarStockInventario({
      memoria_ram_id: memoria_ram_id ? parseInt(memoria_ram_id) : null,
      almacenamiento_id: almacenamiento_id ? parseInt(almacenamiento_id) : null,
      cantidad: cantidadNum,
    });

    res.json({ tieneStock });
  } catch (error) {
    console.error("Error validando stock:", error);
    res.status(500).json({ error: "Error interno al validar stock" });
  }
};
