const express = require("express");
const router = express.Router();
const inventarioController = require("../controllers/controladorInventario");
const authMiddleware = require("../middlewares/authMiddleware"); // Middleware para proteger rutas

router.get("/validar-stock", inventarioController.validarStockInventario);

router.post(
  "/descontar",
  authMiddleware,
  inventarioController.descontarStockInventario
);

router.post(
  "/aumentar",
  authMiddleware,
  inventarioController.aumentarStockInventario
);

// Descontar stock desde venta
router.post(
  "/descontar-venta",
  authMiddleware,
  inventarioController.descontarStockVenta
);

// routes/inventario.js
router.post('/registrar-equipo', authMiddleware, inventarioController.registrarEquipo);

// Crear ítem inventario (protegida)
router.post("/", authMiddleware, inventarioController.crearInventario);

router.post('/general', authMiddleware, inventarioController.crearInventarioGeneral);

// Obtener todo inventario (protegida)
router.get("/", authMiddleware, inventarioController.obtenerInventario);

// Actualizar ítem inventario (protegida)
router.put("/:id", authMiddleware, inventarioController.actualizarInventario);

// Obtener ítem inventario por ID (protegida)
router.get("/:id", authMiddleware, inventarioController.obtenerInventarioPorId);

// Eliminar ítem inventario (protegida)
router.delete("/:id", authMiddleware, inventarioController.eliminarInventario);

module.exports = router;
