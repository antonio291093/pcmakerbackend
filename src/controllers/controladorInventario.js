const {
  agregarOActualizarInventario,
  obtenerInventario,
  obtenerInventarioPorId,
  actualizarInventario,
  eliminarInventario,
  descontarStockInventario,
  aumentarStockInventario,
  validarStockInventario,
  crearInventarioGeneral,
  descontarStockVenta,
  insertarEquipoEnInventario,
} = require("../models/inventario");

/** ----------------------------------------------------
 * REGISTRAR EQUIPO EN INVENTARIO
 * ---------------------------------------------------- */
exports.registrarEquipo = async (req, res) => {
  try {
    const { equipo_id, sucursal_id, precio } = req.body;

    if (!equipo_id) {
      return res.status(400).json({ error: "El campo equipo_id es obligatorio." });
    }

    const nuevoRegistro = await insertarEquipoEnInventario(equipo_id, sucursal_id, precio);

    res.status(201).json({
      success: true,
      message: "Equipo registrado en inventario correctamente.",
      data: nuevoRegistro
    });
  } catch (error) {
    console.error("Error registrando equipo en inventario:", error);
    res.status(500).json({ error: "Error registrando equipo en inventario." });
  }
};

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

exports.crearInventarioGeneral = async (req, res) => {
  try {
    const nuevo = await crearInventarioGeneral(req.body);
    res.status(201).json(nuevo);
  } catch (error) {
    console.error("Error al crear inventario general:", error);
    res.status(500).json({ message: "Error al crear inventario general" });
  }
};

exports.obtenerInventario = async (req, res) => {
  try {
    const items = await obtenerInventario();
    res.json(items);
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

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

exports.actualizarInventario = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const actualizado = await actualizarInventario(id, datos);

    if (!actualizado)
      return res.status(404).json({ message: "Inventario no encontrado" });

    res.json(actualizado);
  } catch (error) {
    console.error("Error al actualizar inventario:", error);
    res.status(500).json({ message: "Error al actualizar inventario" });
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

exports.descontarStockVenta = async (req, res) => {
  try {
    const { productos, sucursal_id } = req.body;

    // 🧩 Validaciones
    if (!sucursal_id || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        message: "sucursal_id y al menos un producto son requeridos",
      });
    }

    const resultados = [];

    // 🔁 Descontar cada producto
    for (const item of productos) {
      const { producto_id, cantidad_vendida } = item;

      if (!producto_id || !cantidad_vendida) {
        return res.status(400).json({
          message: "Cada producto debe tener producto_id y cantidad_vendida",
        });
      }

      const actualizado = await descontarStockVenta({
        producto_id,
        cantidad: cantidad_vendida,
        sucursal_id,
      });

      resultados.push(actualizado);
    }

    // ✅ Todo correcto
    res.status(200).json({
      message: "Stock actualizado correctamente para todos los productos",
      resultados,
    });
  } catch (error) {
    console.error("❌ Error al descontar stock desde venta:", error);
    res.status(500).json({
      message: "Error en el servidor al descontar stock",
      error: error.message,
    });
  }
};
